import { Component, inject } from '@angular/core';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-timeline',
  standalone: true,
  template: `
    <div class="flex items-center gap-3 px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <!-- Rewind -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)]"
        (click)="replay.seek(Math.max(0, replay.currentTime() - 10))"
      >[ &lt;&lt; ]</button>

      <!-- Play/Pause -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)] min-w-[70px]"
        (click)="replay.togglePlay()"
      >{{ replay.isPlaying() ? '[ PAUSE ]' : '[ PLAY ]' }}</button>

      <!-- Fast Forward -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)]"
        (click)="replay.seek(Math.min(replay.duration(), replay.currentTime() + 10))"
      >[ &gt;&gt; ]</button>

      <!-- Scrubber -->
      <input
        type="range"
        class="flex-1 accent-[var(--color-accent)]"
        [min]="0"
        [max]="replay.duration()"
        [value]="replay.currentTime()"
        (input)="onScrub($event)"
      />

      <!-- Time display -->
      <span class="font-mono text-sm text-[var(--color-text-primary)] min-w-[100px] text-right">
        {{ replay.formattedTime() }} / {{ replay.formattedDuration() }}
      </span>

      <!-- Speed selector -->
      <select
        class="bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-2 py-1"
        [value]="replay.playbackSpeed()"
        (change)="onSpeedChange($event)"
      >
        <option value="1">1x</option>
        <option value="2">2x</option>
        <option value="5">5x</option>
        <option value="10">10x</option>
      </select>
    </div>
  `,
})
export class TimelineComponent {
  replay = inject(ReplayService);
  Math = Math;

  onScrub(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.replay.seek(value);
  }

  onSpeedChange(event: Event): void {
    const value = +(event.target as HTMLSelectElement).value;
    this.replay.setSpeed(value);
  }
}
