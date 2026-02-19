import {
  Component,
  type ElementRef,
  Injector,
  effect,
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
  private lastKillIndex = 0;

  private readonly CANVAS_SIZE = 800;

  async ngOnInit(): Promise<void> {
    this.engine = new ReplayEngine();
    const el = this.containerRef().nativeElement;
    await this.engine.init(el, this.CANVAS_SIZE, this.CANVAS_SIZE);

    this.mapRenderer = new MapRenderer(this.engine.getMapLayer());
    this.playerRenderer = new PlayerRenderer(this.engine.getPlayerLayer());
    this.zoneRenderer = new ZoneRenderer(this.engine.getZoneLayer());
    this.eventRenderer = new EventRenderer(this.engine.getEventLayer());

    const replayData = this.replay.replayData();
    const mapName = replayData?.mapName ?? 'Baltic_Main';
    await this.mapRenderer.load(mapName, this.CANVAS_SIZE, this.CANVAS_SIZE);

    if (replayData?.planePath) {
      this.mapRenderer.drawPlanePath(
        replayData.planePath[0],
        replayData.planePath[1],
        this.CANVAS_SIZE,
        this.CANVAS_SIZE,
      );
    }

    // Ticker-driven render loop
    this.engine.getApp().ticker.add((ticker) => {
      this.replay.tick(ticker.elapsedMS);
      this.render();
    });

    // React to selected player changes
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const selected = this.replay.selectedPlayer();
        this.playerRenderer.setHighlightedPlayer(selected);
      });
    });
  }

  private render(): void {
    const tick = this.replay.currentTick();
    if (!tick) return;

    const w = this.CANVAS_SIZE;
    const h = this.CANVAS_SIZE;

    this.playerRenderer.update(tick.players, w, h);
    this.zoneRenderer.update(tick.zone, w, h);

    // Trigger kill tracers for newly passed kills
    const data = this.replay.replayData();
    const time = this.replay.currentTime();
    if (data) {
      while (
        this.lastKillIndex < data.kills.length &&
        data.kills[this.lastKillIndex].timestamp <= time
      ) {
        this.eventRenderer.addKillTracer(data.kills[this.lastKillIndex], time, w, h);
        this.lastKillIndex++;
      }
    }
    this.eventRenderer.update(time);
  }

  ngOnDestroy(): void {
    this.engine?.destroy();
  }
}
