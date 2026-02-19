import { Component, inject } from '@angular/core';
import { ReplayService } from '../../services/replay.service';
import { formatElapsedTime } from '@pubg-replay/shared-utils';

@Component({
  selector: 'pubg-kill-feed',
  standalone: true,
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-[var(--color-text-primary)] text-sm mb-2 tracking-wider uppercase">
        Kill Feed
      </h3>
      <div class="space-y-1">
        @for (kill of replay.visibleKills(); track $index) {
          <div class="text-xs font-mono text-[var(--color-text-secondary)]">
            <span class="text-[var(--color-text-primary)]">[{{ formatTime(kill.timestamp) }}]</span>
            @if (kill.isSuicide) {
              <span class="text-[var(--color-danger)]"> {{ kill.victimName }} died</span>
            } @else {
              <span class="text-[var(--color-text-primary)]"> {{ kill.killerName }}</span>
              <span class="text-[var(--color-danger)]"> → </span>
              <span class="text-[var(--color-text-primary)]">{{ kill.victimName }}</span>
              <span> ({{ kill.weaponName }}, {{ kill.distance }}m)</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class KillFeedComponent {
  replay = inject(ReplayService);

  formatTime(seconds: number): string {
    return formatElapsedTime(seconds);
  }
}
