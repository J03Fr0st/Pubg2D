import {
  Component,
  type ElementRef,
  effect,
  Injector,
  inject,
  type OnDestroy,
  type OnInit,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import {
  EventRenderer,
  MapRenderer,
  PlayerRenderer,
  ReplayEngine,
  ZoneRenderer,
} from '@pubg-replay/replay-engine';
import type { KillEvent } from '@pubg-replay/shared-types';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-map-canvas',
  standalone: true,
  template: `<div #canvasContainer class="w-full h-full"></div>`,
})
export class MapCanvasComponent implements OnInit, OnDestroy {
  private replay = inject(ReplayService);
  private injector = inject(Injector);
  private containerRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  private engine!: ReplayEngine;
  private mapRenderer!: MapRenderer;
  private playerRenderer!: PlayerRenderer;
  private zoneRenderer!: ZoneRenderer;
  private eventRenderer!: EventRenderer;
  private orderedKills: KillEvent[] = [];
  private lastKillIndex = 0;
  private lastRenderTime = 0;

  private readonly CANVAS_SIZE = 800;
  private readonly MIN_AUTO_ZOOM = 1;
  private readonly MAX_AUTO_ZOOM = 8;
  private readonly ZONE_SCREEN_DIAMETER = 0.6;
  private readonly CAMERA_SMOOTHING = 0.16;

  async ngOnInit(): Promise<void> {
    this.engine = new ReplayEngine();
    const el = this.containerRef().nativeElement;
    await this.engine.init(el, this.CANVAS_SIZE, this.CANVAS_SIZE);

    this.mapRenderer = new MapRenderer(this.engine.getMapLayer());
    this.playerRenderer = new PlayerRenderer(this.engine.getPlayerLayer());
    this.zoneRenderer = new ZoneRenderer(this.engine.getZoneLayer());
    this.eventRenderer = new EventRenderer(this.engine.getEventLayer());

    // Load static map layers once replay data arrives (avoids default-map lock-in).
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const replayData = this.replay.replayData();
        if (!replayData) return;

        void this.mapRenderer.load(replayData.mapName, this.CANVAS_SIZE, this.CANVAS_SIZE);

        const teamByAccountId = new Map<string, number>();
        for (const p of replayData.players) {
          teamByAccountId.set(p.accountId, p.teamId);
        }
        for (const tick of replayData.ticks) {
          for (const p of tick.players) {
            if (!teamByAccountId.has(p.accountId)) teamByAccountId.set(p.accountId, p.teamId);
          }
        }
        this.eventRenderer.setPlayerTeams(teamByAccountId);
        this.eventRenderer.setMaxActiveTracers(30);
        this.orderedKills = [...replayData.kills].sort((a, b) => a.timestamp - b.timestamp);
        this.lastKillIndex = 0;
        this.lastRenderTime = 0;
        this.eventRenderer.clear();
      });
    });

    // Ticker-driven render loop
    this.engine.getApp().ticker.add((ticker) => {
      this.replay.tick(ticker.elapsedMS);
      this.render();
    });

    // React to selected player changes (highlight + teammate color on map).
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const selected = this.replay.selectedPlayer();
        this.playerRenderer.setHighlightedPlayer(selected);
        this.eventRenderer.setTracerEnabled(this.replay.tracerEnabled());
        this.eventRenderer.setTracerMode(this.replay.tracerMode());

        const replayData = this.replay.replayData();
        if (!selected || !replayData) {
          this.playerRenderer.setFriendlyTeam(null);
          this.eventRenderer.setSelectedContext(null, null);
          return;
        }

        // Resolve once from stable replay data to avoid per-frame team flicker.
        const teamFromRoster =
          replayData.players.find((p) => p.accountId === selected)?.teamId ?? null;
        const teamFromTicks =
          replayData.ticks.flatMap((t) => t.players).find((p) => p.accountId === selected)
            ?.teamId ?? null;
        const friendlyTeamId = teamFromRoster ?? teamFromTicks ?? null;
        this.playerRenderer.setFriendlyTeam(friendlyTeamId ?? null);
        this.eventRenderer.setSelectedContext(selected, friendlyTeamId ?? null);
      });
    });
  }

  private render(): void {
    const tick = this.replay.currentTick();
    if (!tick) return;

    const w = this.CANVAS_SIZE;
    const h = this.CANVAS_SIZE;
    const zoom = this.getViewportScale();

    this.updateAutoCamera(tick.zone, w, h);
    this.playerRenderer.update(tick.players, w, h, zoom);
    this.zoneRenderer.update(tick.zone, w, h, zoom);

    // Trigger kill tracers for newly passed kills
    const data = this.replay.replayData();
    const time = this.replay.currentTime();
    if (data) {
      if (time < this.lastRenderTime) {
        this.lastKillIndex = this.findLastKillIndexAtOrBefore(time);
        this.eventRenderer.clear();
      }
      while (
        this.lastKillIndex < this.orderedKills.length &&
        this.orderedKills[this.lastKillIndex].timestamp <= time
      ) {
        this.eventRenderer.addKillTracer(this.orderedKills[this.lastKillIndex], time, w, h);
        this.lastKillIndex++;
      }
    }
    this.lastRenderTime = time;
    this.eventRenderer.update(time, zoom);
  }

  private findLastKillIndexAtOrBefore(time: number): number {
    let low = 0;
    let high = this.orderedKills.length;
    while (low < high) {
      const mid = low + ((high - low) >> 1);
      if (this.orderedKills[mid].timestamp <= time) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  private updateAutoCamera(
    zone: { safeX: number; safeY: number; safeRadius: number; poisonX: number; poisonY: number },
    width: number,
    height: number,
  ): void {
    const viewport = this.engine.getViewport() as unknown as {
      scale: { x: number };
      moveCenter?: (x: number, y: number) => void;
      setZoom?: (scale: number, center?: boolean) => void;
    };

    const hasSafeZone = zone.safeRadius > 0;
    const centerX = (hasSafeZone ? zone.safeX : zone.poisonX) * width;
    const centerY = (hasSafeZone ? zone.safeY : zone.poisonY) * height;

    // Keep the active zone roughly this wide on screen.
    const baseTargetZoom = hasSafeZone
      ? this.ZONE_SCREEN_DIAMETER / Math.max(zone.safeRadius * 2, 0.001)
      : this.MIN_AUTO_ZOOM;
    const targetZoom = Math.min(this.MAX_AUTO_ZOOM, Math.max(this.MIN_AUTO_ZOOM, baseTargetZoom));
    const currentZoom = viewport.scale.x || this.MIN_AUTO_ZOOM;
    const nextZoom = currentZoom + (targetZoom - currentZoom) * this.CAMERA_SMOOTHING;

    viewport.moveCenter?.(centerX, centerY);
    viewport.setZoom?.(nextZoom, true);
  }

  private getViewportScale(): number {
    const viewport = this.engine.getViewport() as unknown as { scale?: { x?: number } };
    return viewport.scale?.x ?? 1;
  }

  ngOnDestroy(): void {
    this.engine?.destroy();
  }
}
