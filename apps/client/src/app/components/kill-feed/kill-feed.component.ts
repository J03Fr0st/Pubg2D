import { Component, computed, inject } from '@angular/core';
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

      <div class="space-y-1 font-mono text-xs">
        @for (kill of feedItems(); track kill.id) {
          <div class="rounded px-1 py-0.5" [class.bg-border/40]="kill.involvesSelected">
            <span class="text-text-secondary">[{{ formatTime(kill.timestamp) }}]</span>

            @if (kill.isSuicide) {
              <button
                type="button"
                class="ml-1 text-danger hover:text-accent"
                (click)="selectPlayer(kill.victimAccountId)"
              >
                {{ kill.victimName || 'Unknown' }} died
              </button>
            } @else {
              <button
                type="button"
                class="ml-1 text-text-primary hover:text-accent"
                (click)="selectPlayer(kill.killerAccountId)"
              >
                {{ kill.killerName || 'Unknown' }}
              </button>
              <span class="text-danger"> → </span>
              <button
                type="button"
                class="text-text-primary hover:text-accent"
                (click)="selectPlayer(kill.victimAccountId)"
              >
                {{ kill.victimName || 'Unknown' }}
              </button>
              <span class="text-text-secondary"> ({{ kill.weaponName }}, {{ kill.distance }}m)</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class KillFeedComponent {
  replay = inject(ReplayService);

  feedItems = computed(() => {
    const selected = this.replay.selectedPlayer();
    return this.replay.visibleKills().map((kill, index) => ({
      ...kill,
      id: `${kill.timestamp}-${kill.victimAccountId}-${index}`,
      involvesSelected: !!selected && (kill.killerAccountId === selected || kill.victimAccountId === selected),
    }));
  });

  formatTime(seconds: number): string {
    return formatElapsedTime(seconds);
  }

  selectPlayer(accountId: string | null): void {
    if (!accountId) return;
    this.replay.selectPlayer(accountId);
  }
}
