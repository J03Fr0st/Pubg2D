import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-player-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-[var(--color-text-primary)] text-sm mb-2 tracking-wider uppercase">
        Unit Roster
      </h3>
      <div class="space-y-1">
        @for (player of sortedPlayers(); track player.accountId) {
          <div
            class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[var(--color-border)] rounded text-xs font-mono"
            [class.bg-[var(--color-border)]]="player.accountId === replay.selectedPlayer()"
            (click)="replay.selectPlayer(player.accountId)"
          >
            <span
              class="w-2 h-2 rounded-full inline-block"
              [style.background-color]="player.isAlive ? (player.accountId === replay.selectedPlayer() ? '#7aff4a' : '#6a7a5a') : '#c84a2a'"
            ></span>
            <span class="text-[var(--color-text-primary)] flex-1 truncate">{{ player.name }}</span>
            <span class="text-[var(--color-text-secondary)]">{{ player.health | number:'1.0-0' }}hp</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class PlayerPanelComponent {
  replay = inject(ReplayService);

  sortedPlayers = computed(() => {
    const tick = this.replay.currentTick();
    if (!tick) return [];
    return [...tick.players].sort((a, b) => {
      if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
      return a.teamId - b.teamId;
    });
  });
}
