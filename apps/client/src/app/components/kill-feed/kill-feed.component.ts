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

      <div class="rounded border border-border bg-bg/30 overflow-hidden">
        <div
          class="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] gap-2 px-2 py-1 text-[10px] font-mono uppercase text-text-secondary border-b border-border"
        >
          <span>Time</span>
          <span>Killer</span>
          <span>Killed</span>
          <span>Weapon</span>
          <span class="text-right">m</span>
        </div>
        <div class="space-y-0">
          @for (kill of feedItems(); track kill.id) {
            <div
              class="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2 px-2 py-1 font-mono text-xs border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-border/40"
              [class.bg-border/40]="kill.involvesSelected"
            >
              <span class="text-text-secondary text-[10px]">{{ formatTime(kill.timestamp) }}</span>
              @if (kill.isSuicide) {
                <span class="text-text-secondary">—</span>
                <button
                  type="button"
                  class="text-left text-danger hover:text-accent truncate"
                  (click)="selectPlayer(kill.victimAccountId)"
                >
                  {{ kill.victimName || 'Unknown' }}
                </button>
              } @else {
                <button
                  type="button"
                  class="text-left text-text-primary hover:text-accent truncate"
                  (click)="selectPlayer(kill.killerAccountId)"
                >
                  {{ kill.killerName || 'Unknown' }}
                </button>
                <button
                  type="button"
                  class="text-left text-danger hover:text-accent truncate"
                  (click)="selectPlayer(kill.victimAccountId)"
                >
                  {{ kill.victimName || 'Unknown' }}
                </button>
              }
              <span class="text-text-secondary truncate">{{ kill.weaponName }}</span>
              <span class="text-text-secondary text-right">{{ kill.distance }}</span>
            </div>
          }
        </div>
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
