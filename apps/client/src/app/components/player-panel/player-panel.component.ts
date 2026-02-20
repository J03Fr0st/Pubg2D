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
            <div
              class="grid grid-cols-[minmax(0,1fr)_36px_36px_44px] gap-2 px-2 py-1 text-[10px] font-mono uppercase text-text-secondary border-b border-border"
            >
              <span>Name</span>
              <span class="text-right">Kills</span>
              <span class="text-right">Assists</span>
              <span class="text-right">Dmg</span>
            </div>
            <div class="space-y-1 p-1">
              @for (player of filteredPlayers(team.teamId); track player.accountId) {
                <div
                  class="grid grid-cols-[minmax(0,1fr)_36px_36px_44px] items-center gap-2 px-2 py-1 cursor-pointer hover:bg-border rounded text-xs font-mono"
                  [class.bg-border]="player.accountId === replay.selectedPlayer()"
                  (click)="selectPlayer(player.accountId)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="w-2 h-2 rounded-full inline-block"
                      [style.background-color]="player.isAlive ? (player.accountId === replay.selectedPlayer() ? '#7aff4a' : '#6a7a5a') : '#c84a2a'"
                    ></span>
                    <span class="text-text-primary truncate">{{ player.name }}</span>
                  </div>
                  <span class="text-text-secondary text-right">{{ getStats(player.accountId).kills }}</span>
                  <span class="text-text-secondary text-right">{{ getStats(player.accountId).assists }}</span>
                  <span class="text-text-secondary text-right">{{ getStats(player.accountId).dmg | number:'1.0-0' }}</span>
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
  private playerStatsByAccountId = computed(() => {
    const data = this.replay.replayData();
    const time = this.replay.currentTime();
    if (!data) return new Map<string, { kills: number; assists: number; dmg: number }>();

    const stats = new Map<string, { kills: number; assists: number; dmg: number }>(
      data.players.map((p) => [
        p.accountId,
        {
          kills: 0,
          assists: 0,
          dmg: 0,
        },
      ]),
    );

    for (const kill of data.kills) {
      if (kill.timestamp > time) continue;
      if (kill.killerAccountId) {
        const killerStats = stats.get(kill.killerAccountId) ?? { kills: 0, assists: 0, dmg: 0 };
        killerStats.kills += 1;
        stats.set(kill.killerAccountId, killerStats);
      }
      for (const assisterAccountId of kill.assistantAccountIds ?? []) {
        const assisterStats = stats.get(assisterAccountId) ?? { kills: 0, assists: 0, dmg: 0 };
        assisterStats.assists += 1;
        stats.set(assisterAccountId, assisterStats);
      }
    }

    for (const damageEvent of data.damageEvents ?? []) {
      if (damageEvent.timestamp > time) continue;
      const attackerStats = stats.get(damageEvent.attackerAccountId) ?? {
        kills: 0,
        assists: 0,
        dmg: 0,
      };
      attackerStats.dmg += damageEvent.damage;
      stats.set(damageEvent.attackerAccountId, attackerStats);
    }

    if (!data.damageEvents?.length) {
      for (const player of data.players) {
        const playerStats = stats.get(player.accountId) ?? { kills: 0, assists: 0, dmg: 0 };
        playerStats.dmg = player.damageDealt ?? 0;
        playerStats.assists = player.assists ?? playerStats.assists;
        stats.set(player.accountId, playerStats);
      }
    }

    return stats;
  });

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
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  getStats(accountId: string): { kills: number; assists: number; dmg: number } {
    return this.playerStatsByAccountId().get(accountId) ?? { kills: 0, assists: 0, dmg: 0 };
  }

  selectPlayer(accountId: string): void {
    this.replay.selectPlayer(accountId);
    this.searchQuery.set('');
  }
}
