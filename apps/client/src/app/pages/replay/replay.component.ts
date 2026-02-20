import { UpperCasePipe } from '@angular/common';
import { Component, inject, type OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KillFeedComponent } from '../../components/kill-feed/kill-feed.component';
import { MapCanvasComponent } from '../../components/map-canvas/map-canvas.component';
import { PlayerPanelComponent } from '../../components/player-panel/player-panel.component';
import { TimelineComponent } from '../../components/timeline/timeline.component';
import { ApiService } from '../../services/api.service';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-replay-page',
  standalone: true,
  imports: [
    MapCanvasComponent,
    TimelineComponent,
    PlayerPanelComponent,
    KillFeedComponent,
    UpperCasePipe,
  ],
  template: `
    <div class="h-screen flex bg-bg text-text-primary">
      <!-- Left sidebar (full screen height) -->
      <div class="w-[28rem] h-full border-r border-border bg-surface">
        <pubg-kill-feed />
      </div>

      <!-- Right content -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- Top HUD bar -->
        <div class="flex items-center justify-between px-4 py-2 bg-surface border-b border-border font-mono text-sm">
          <span>[GRID REF: {{ replay.replayData()?.mapDisplayName ?? 'LOADING' | uppercase }}]</span>
          <span>[MATCH: {{ replay.replayData()?.createdAt ?? '' }}]</span>
          <span>[{{ replay.alivePlayers() }} ALIVE]</span>
        </div>

        <!-- Main content -->
        <div class="flex flex-1 min-h-0">
          <!-- Map canvas -->
          <div class="flex-1 flex items-center justify-center">
            <pubg-map-canvas />
          </div>

          <!-- Right sidebar -->
          <div class="w-72 border-l border-border bg-surface">
            <pubg-player-panel />
          </div>
        </div>

        <!-- Timeline -->
        <pubg-timeline />
      </div>
    </div>
  `,
})
export class ReplayComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  replay = inject(ReplayService);

  private normalizePlayerKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private resolveFromReplayPlayers(
    preferred: string,
    players: Array<{ accountId: string; name: string }>,
  ): string | null {
    const preferredNormalized = this.normalizePlayerKey(preferred);
    const byAccountId = players.find((p) => p?.accountId === preferred)?.accountId ?? null;
    const byNameExact =
      players.find((p) => (p?.name ?? '').toLowerCase() === preferred.toLowerCase())?.accountId ?? null;
    const byNameNormalized =
      players.find((p) => this.normalizePlayerKey(p?.name ?? '') === preferredNormalized)?.accountId ?? null;
    const byNameIncludes =
      players
        .find((p) => this.normalizePlayerKey(p?.name ?? '').includes(preferredNormalized))
        ?.accountId ?? null;

    return byAccountId ?? byNameExact ?? byNameNormalized ?? byNameIncludes;
  }

  private extractPlayersFromTicks(
    ticks: Array<{ players: Array<{ accountId: string; name: string }> }>,
  ): Array<{ accountId: string; name: string }> {
    const byId = new Map<string, string>();
    for (const tick of ticks ?? []) {
      for (const player of tick.players ?? []) {
        if (!player?.accountId) continue;
        if (!byId.has(player.accountId)) {
          byId.set(player.accountId, player.name ?? '');
        }
      }
    }
    return [...byId.entries()].map(([accountId, name]) => ({ accountId, name }));
  }

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!matchId) return;

    const accountId = this.route.snapshot.paramMap.get('accountId');
    const routePlayerName = this.route.snapshot.paramMap.get('name');
    const routePlatform = this.route.snapshot.paramMap.get('platform');
    const queryPlayer = this.route.snapshot.queryParamMap.get('player');

    const preferred = accountId ?? queryPlayer ?? routePlayerName;
    const lookedUpAccountId =
      !accountId && routePlayerName && routePlatform
        ? await this.api
            .searchPlayer(routePlatform, routePlayerName)
            .then((player) => player.accountId)
            .catch(() => null)
        : null;

    const data = await this.api.getReplayData(matchId);
    const replayPlayers =
      data.players?.some((p) => p?.accountId) ? data.players : this.extractPlayersFromTicks(data.ticks);
    const resolvedPreferred =
      (preferred ? this.resolveFromReplayPlayers(preferred, replayPlayers) : null) ??
      (lookedUpAccountId ? this.resolveFromReplayPlayers(lookedUpAccountId, replayPlayers) : null);

    // Apply selected player first so every subscriber (timeline, teams, map highlights)
    // starts from the same URL-driven selection state on initial load.
    if (resolvedPreferred) this.replay.selectPlayer(resolvedPreferred);
    this.replay.load(data);
  }
}
