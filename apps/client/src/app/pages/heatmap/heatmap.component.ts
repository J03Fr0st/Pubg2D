import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Application, Graphics } from 'pixi.js';
import type { HeatmapData } from '@pubg-replay/shared-types';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pubg-heatmap-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] p-8">
      <h1 class="font-sans font-bold text-2xl text-[var(--color-accent)] mb-4">HEATMAP</h1>

      <div class="flex gap-2 mb-4">
        <select
          class="bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-3 py-2"
          [(ngModel)]="mode"
          (ngModelChange)="fetchHeatmap()"
        >
          <option value="movement">MOVEMENT</option>
          <option value="deaths">DEATHS</option>
          <option value="kills">KILLS</option>
        </select>
      </div>

      <div #canvasContainer class="inline-block border border-[var(--color-border)]"></div>
    </div>
  `,
})
export class HeatmapComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private containerRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  private app!: Application;
  mode = 'movement';
  private accountId = '';

  async ngOnInit(): Promise<void> {
    this.accountId = this.route.snapshot.paramMap.get('accountId') ?? '';

    this.app = new Application();
    await this.app.init({ width: 600, height: 600, backgroundColor: 0x0d1a0d });
    this.containerRef().nativeElement.appendChild(this.app.canvas);

    await this.fetchHeatmap();
  }

  async fetchHeatmap(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<HeatmapData>(
        `/api/players/${this.accountId}/heatmap?mode=${this.mode}`
      )
    );
    this.renderHeatmap(data);
  }

  private renderHeatmap(data: HeatmapData): void {
    this.app.stage.removeChildren();

    const cellW = 600 / data.gridWidth;
    const cellH = 600 / data.gridHeight;
    const gfx = new Graphics();

    for (let y = 0; y < data.gridHeight; y++) {
      for (let x = 0; x < data.gridWidth; x++) {
        const intensity = data.intensities[y * data.gridWidth + x];
        if (intensity < 0.01) continue;

        // Military palette: black → olive → amber
        const r = Math.floor(intensity * 212);
        const g = Math.floor(100 + intensity * 68);
        const b = Math.floor(50 * (1 - intensity));
        const color = (r << 16) | (g << 8) | b;

        gfx.rect(x * cellW, y * cellH, cellW, cellH).fill({ color, alpha: intensity * 0.8 });
      }
    }

    this.app.stage.addChild(gfx);
  }

  ngOnDestroy(): void {
    this.app?.destroy(true);
  }
}
