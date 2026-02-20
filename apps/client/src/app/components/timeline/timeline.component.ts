import { Component, computed, inject } from '@angular/core';
import { formatElapsedTime } from '@pubg-replay/shared-utils';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-timeline',
  standalone: true,
  template: `
    <div class="flex items-center gap-3 px-4 py-2 bg-surface border-t border-border">
      <!-- Rewind -->
      <button
        class="text-text-primary font-mono text-sm hover:text-accent"
        (click)="replay.seek(Math.max(0, replay.currentTime() - 10))"
      >[ &lt;&lt; ]</button>

      <!-- Play/Pause -->
      <button
        class="text-text-primary font-mono text-sm hover:text-accent min-w-[70px]"
        (click)="replay.togglePlay()"
      >{{ replay.isPlaying() ? '[ PAUSE ]' : '[ PLAY ]' }}</button>

      <!-- Fast Forward -->
      <button
        class="text-text-primary font-mono text-sm hover:text-accent"
        (click)="replay.seek(Math.min(replay.duration(), replay.currentTime() + 10))"
      >[ &gt;&gt; ]</button>

      <!-- Scrubber with kill markers -->
      <div class="relative flex-1 h-7">
        <input
          type="range"
          class="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full accent-accent z-10"
          [min]="0"
          [max]="replay.duration()"
          [value]="replay.currentTime()"
          (input)="onScrub($event)"
        />
        @for (kill of killMarkers(); track kill.id) {
          <button
            type="button"
            class="absolute top-1/2 -translate-y-1/2 h-3 w-[2px] z-20 hover:bg-accent"
            [class.bg-accent]="kill.kind === 'kill'"
            [class.bg-danger]="kill.kind === 'death'"
            [style.left.%]="kill.left"
            [title]="kill.label"
            (click)="onKillMarkerClick(kill.time)"
          ></button>
        }
      </div>

      <!-- Time display -->
      <span class="font-mono text-sm text-text-primary min-w-[100px] text-right">
        {{ replay.formattedTime() }} / {{ replay.formattedDuration() }}
      </span>

      <!-- Speed slider -->
      <div class="flex items-center gap-2 min-w-[170px]">
        <input
          type="range"
          class="w-28 accent-accent"
          min="1"
          max="40"
          step="1"
          [value]="replay.playbackSpeed()"
          (input)="onSpeedChange($event)"
        />
        <span class="font-mono text-sm text-text-primary w-9 text-right">{{ replay.playbackSpeed() }}x</span>
      </div>
    </div>
  `,
})
export class TimelineComponent {
  replay = inject(ReplayService);
  readonly Math = Math;
  readonly killMarkers = computed(() => {
    const data = this.replay.replayData();
    const duration = this.replay.duration();
    const selectedPlayer = this.replay.selectedPlayer();
    if (!data || duration <= 0) return [];

    return data.kills
      .filter(
        (kill) =>
          !selectedPlayer ||
          kill.killerAccountId === selectedPlayer ||
          kill.victimAccountId === selectedPlayer,
      )
      .map((kill, index) => {
        const left = Math.min(100, Math.max(0, (kill.timestamp / duration) * 100));
        const isSelectedKill = selectedPlayer != null && kill.killerAccountId === selectedPlayer;
        const isSelectedDeath = selectedPlayer != null && kill.victimAccountId === selectedPlayer;
        const killer = kill.killerName ?? 'Unknown';
        const kind = isSelectedDeath ? 'death' : 'kill';
        const label = selectedPlayer
          ? isSelectedKill
            ? `[${formatElapsedTime(kill.timestamp)}] Kill: ${killer} -> ${kill.victimName}`
            : `[${formatElapsedTime(kill.timestamp)}] Death: ${killer} -> ${kill.victimName}`
          : `[${formatElapsedTime(kill.timestamp)}] ${killer} -> ${kill.victimName}`;
        return {
          id: `${kill.timestamp}-${kill.victimAccountId}-${index}`,
          time: kill.timestamp,
          left,
          kind,
          label,
        };
      })
      .sort((a, b) => a.time - b.time);
  });

  onScrub(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.replay.seek(value);
  }

  onSpeedChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.replay.setSpeed(value);
  }

  onKillMarkerClick(time: number): void {
    this.replay.seek(time);
  }
}
