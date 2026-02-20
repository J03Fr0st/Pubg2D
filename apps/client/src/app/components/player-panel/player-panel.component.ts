import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-player-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="h-full overflow-y-auto p-2">
      <h3 class="font-sans font-semibold text-text-primary text-xs mb-1 tracking-wider uppercase">
        Teams
      </h3>
      <input
        type="text"
        class="w-full mb-1 px-2 py-0.5 rounded border border-border bg-surface text-text-primary text-[11px] font-mono placeholder:text-text-secondary"
        placeholder="Search player..."
        [value]="searchQuery()"
        (input)="setSearchQuery($any($event.target).value)"
      />
      <div class="space-y-1.5">
        @for (team of teams(); track team.teamId) {
          <div class="rounded border border-border bg-bg/30">
            <div class="flex items-center justify-between gap-2 px-2 py-0.5 border-b border-border">
              <span class="text-[11px] font-mono text-text-secondary">TEAM {{ team.teamId }}</span>
            </div>
            <div
              class="grid grid-cols-[minmax(0,1fr)_30px_30px_40px] gap-1.5 px-2 py-0.5 text-[9px] font-mono uppercase text-text-secondary border-b border-border"
            >
              <span>Name</span>
              <span class="text-right">Kills</span>
              <span class="text-right">Assists</span>
              <span class="text-right">Dmg</span>
            </div>
            <div class="space-y-0.5 p-0.5">
              @for (player of filteredPlayers(team.teamId); track player.accountId) {
                <div
                  class="grid grid-cols-[minmax(0,1fr)_30px_30px_40px] items-center gap-1.5 px-1.5 py-0.5 cursor-pointer hover:bg-border rounded text-[11px] font-mono leading-tight"
                  [class.bg-border]="player.accountId === replay.selectedPlayer()"
                  [style.color]="getPlayerTextColor(player)"
                  (click)="selectPlayer(player.accountId)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="w-2 h-2 rounded-full inline-block shrink-0"
                      [style.background-color]="getPlayerDotColor(player)"
                    ></span>
                    <span class="truncate">{{ player.name }}</span>
                  </div>
                  <span class="text-right">{{ getStats(player.accountId).kills }}</span>
                  <span class="text-right">{{ getStats(player.accountId).assists }}</span>
                  <span class="text-right">{{ getStats(player.accountId).dmg | number:'1.0-0' }}</span>
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

  private deadPlayerIds = computed(() => {
    const data = this.replay.replayData();
    const time = this.replay.currentTime();
    if (!data) return new Set<string>();
    return new Set(data.kills.filter((k) => k.timestamp <= time).map((k) => k.victimAccountId));
  });

  private roster = computed(() => {
    const data = this.replay.replayData();
    if (!data) return [];

    // Prefer static roster from replay payload.
    const rosterPlayers = data.players.some((p) => !!p.accountId) ? data.players : [];
    if (rosterPlayers.length) return rosterPlayers;

    // Fallback for older payloads: snapshot from first tick only (static).
    const firstTickPlayers = data.ticks[0]?.players ?? [];
    return firstTickPlayers.map((p) => ({
      accountId: p.accountId,
      name: p.name,
      teamId: p.teamId,
      kills: 0,
      assists: 0,
      damageDealt: 0,
      survivalTime: 0,
      placement: 0,
    }));
  });

  selectedTeamId = computed(() => {
    const roster = this.roster();
    const selectedPlayerId = this.replay.selectedPlayer();
    if (!selectedPlayerId || !roster.length) return null;
    return roster.find((p) => p.accountId === selectedPlayerId)?.teamId ?? null;
  });

  teams = computed(() => {
    const roster = this.roster();
    if (!roster.length) return [] as Array<{ teamId: number }>;
    const selectedPlayerId = this.replay.selectedPlayer();
    const query = this.normalizedSearch();

    const filtered = query
      ? roster.filter((p) => p.name.toLowerCase().includes(query))
      : roster;

    const selectedTeamId =
      selectedPlayerId == null
        ? null
        : roster.find((p) => p.accountId === selectedPlayerId)?.teamId ?? null;

    const teamIds = Array.from(new Set(filtered.map((p) => p.teamId))).sort((a, b) => {
      if (selectedTeamId !== null) {
        if (a === selectedTeamId && b !== selectedTeamId) return -1;
        if (b === selectedTeamId && a !== selectedTeamId) return 1;
      }
      return a - b;
    });
    return teamIds.map((teamId) => ({ teamId }));
  });

  filteredPlayers(teamId: number) {
    const roster = this.roster();
    if (!roster.length) return [];
    const dead = this.deadPlayerIds();
    const query = this.normalizedSearch();

    return roster
      .filter((p) => p.teamId === teamId)
      .filter((p) => !query || p.name.toLowerCase().includes(query))
      .map((p) => ({ ...p, isAlive: !dead.has(p.accountId) }))
      // Keep row order fixed; only color changes when players die.
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

  getPlayerTextColor(player: { accountId: string; teamId: number }): string | null {
    const selected = this.replay.selectedPlayer();
    if (player.accountId === selected) return '#7aff4a';
    const teamId = this.selectedTeamId();
    if (teamId !== null && player.teamId === teamId) return '#d4a832';
    return null;
  }

  getPlayerDotColor(player: { accountId: string; teamId: number; isAlive: boolean }): string {
    if (!player.isAlive) return '#c84a2a';
    const selected = this.replay.selectedPlayer();
    if (player.accountId === selected) return '#7aff4a';
    const teamId = this.selectedTeamId();
    if (teamId !== null && player.teamId === teamId) return '#d4a832';
    return '#6a7a5a';
  }
}
