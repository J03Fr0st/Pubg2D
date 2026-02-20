import { Component, inject } from '@angular/core';
import { formatElapsedTime } from '@pubg-replay/shared-utils';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-kill-feed',
  standalone: true,
  host: {
    class: 'block h-full',
  },
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-text-primary text-sm mb-2 tracking-wider uppercase">
        Kill Feed
      </h3>
      <div class="space-y-1">
        @for (kill of replay.visibleKills(); track $index) {
          <div class="text-xs font-mono text-text-secondary">
            <span class="text-text-primary">[{{ formatTime(kill.timestamp) }}]</span>
            @if (kill.isSuicide) {
              <span class="text-danger"> {{ kill.victimName }} died</span>
            } @else {
              <span class="text-text-primary"> {{ kill.killerName }}</span>
              <span class="text-danger"> → </span>
              <span class="text-text-primary">{{ kill.victimName }}</span>
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
