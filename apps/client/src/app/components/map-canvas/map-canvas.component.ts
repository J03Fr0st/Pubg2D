import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  viewChild,
  effect,
} from '@angular/core';
import { ReplayService } from '../../services/replay.service';
import { ReplayEngine, PlayerRenderer, ZoneRenderer, EventRenderer } from '@pubg-replay/replay-engine';

@Component({
  selector: 'pubg-map-canvas',
  standalone: true,
  template: `<div #canvasContainer class="w-full h-full"></div>`,
})
export class MapCanvasComponent implements OnInit, OnDestroy {
  private replay = inject(ReplayService);
  private containerRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  private engine!: ReplayEngine;
  private playerRenderer!: PlayerRenderer;
  private zoneRenderer!: ZoneRenderer;
  private eventRenderer!: EventRenderer;
  private lastKillIndex = 0;

  private readonly CANVAS_SIZE = 800;

  async ngOnInit(): Promise<void> {
    this.engine = new ReplayEngine();
    const el = this.containerRef().nativeElement;
    await this.engine.init(el, this.CANVAS_SIZE, this.CANVAS_SIZE);

    this.playerRenderer = new PlayerRenderer(this.engine.getPlayerLayer());
    this.zoneRenderer = new ZoneRenderer(this.engine.getZoneLayer());
    this.eventRenderer = new EventRenderer(this.engine.getEventLayer());

    // Ticker-driven render loop
    this.engine.getApp().ticker.add((ticker) => {
      this.replay.tick(ticker.elapsedMS);
      this.render();
    });

    // React to selected player changes
    effect(() => {
      const selected = this.replay.selectedPlayer();
      this.playerRenderer.setHighlightedPlayer(selected);
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
      while (this.lastKillIndex < data.kills.length && data.kills[this.lastKillIndex].timestamp <= time) {
        this.eventRenderer.addKillTracer(data.kills[this.lastKillIndex], w, h);
        this.lastKillIndex++;
      }
    }
    this.eventRenderer.update(time);
  }

  ngOnDestroy(): void {
    this.engine?.destroy();
  }
}
