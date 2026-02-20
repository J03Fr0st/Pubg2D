import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-player-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-text-primary text-sm mb-2 tracking-wider uppercase">
        Teams
      </h3>
      <input
        type="text"
        class="w-full mb-2 px-2 py-1 rounded border border-border bg-surface text-text-primary text-xs font-mono placeholder:text-text-secondary"
        placeholder="Search player..."
        [value]="searchQuery()"
        (input)="setSearchQuery($any($event.target).value)"
      />
      <div class="space-y-2">
        @for (team of teams(); track team.teamId) {
          <div class="rounded border border-border bg-bg/30">
            <div class="flex items-center justify-between gap-2 px-2 py-1 border-b border-border">
              <span class="text-[11px] font-mono text-text-secondary">TEAM {{ team.teamId }}</span>
            </div>
            <div class="space-y-1 p-1">
              @for (player of filteredPlayers(team.teamId); track player.accountId) {
                <div
                  class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-border rounded text-xs font-mono"
                  [class.bg-border]="player.accountId === replay.selectedPlayer()"
                  (click)="selectPlayer(player.accountId)"
                >
                  <span
                    class="w-2 h-2 rounded-full inline-block"
                    [style.background-color]="player.isAlive ? (player.accountId === replay.selectedPlayer() ? '#7aff4a' : '#6a7a5a') : '#c84a2a'"
                  ></span>
                  <span class="text-text-primary flex-1 truncate">{{ player.name }}</span>
                  <span class="text-text-secondary">{{ player.health | number:'1.0-0' }}hp</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PlayerPanelComponent {
  replay = inject(ReplayService);
  searchQuery = signal('');
  private normalizedSearch = computed(() => this.searchQuery().trim().toLowerCase());

  teams = computed(() => {
    const tick = this.replay.currentTick();
    if (!tick) return [] as Array<{ teamId: number }>;

    const query = this.normalizedSearch();
    const filtered = query
      ? tick.players.filter((p) => p.name.toLowerCase().includes(query))
      : tick.players;
    const teamIds = Array.from(new Set(filtered.map((p) => p.teamId))).sort((a, b) => a - b);
    return teamIds.map((teamId) => ({ teamId }));
  });

  filteredPlayers(teamId: number) {
    const tick = this.replay.currentTick();
    if (!tick) return [];
    const query = this.normalizedSearch();

    return tick.players
      .filter((p) => p.teamId === teamId)
      .filter((p) => !query || p.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  selectPlayer(accountId: string): void {
    this.replay.selectPlayer(accountId);
    this.searchQuery.set('');
  }
}
