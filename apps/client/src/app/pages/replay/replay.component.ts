import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MapCanvasComponent } from '../../components/map-canvas/map-canvas.component';
import { TimelineComponent } from '../../components/timeline/timeline.component';
import { PlayerPanelComponent } from '../../components/player-panel/player-panel.component';
import { KillFeedComponent } from '../../components/kill-feed/kill-feed.component';
import { ReplayService } from '../../services/replay.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'pubg-replay-page',
  standalone: true,
  imports: [MapCanvasComponent, TimelineComponent, PlayerPanelComponent, KillFeedComponent, UpperCasePipe],
  template: `
    <div class="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <!-- Top HUD bar -->
      <div class="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] font-mono text-sm">
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
        <div class="w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
          <div class="flex-1 min-h-0 border-b border-[var(--color-border)]">
            <pubg-player-panel />
          </div>
          <div class="h-64">
            <pubg-kill-feed />
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <pubg-timeline />
    </div>
  `,
})
export class ReplayComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  replay = inject(ReplayService);

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!matchId) return;

    const accountId = this.route.snapshot.paramMap.get('accountId');

    const data = await this.api.getReplayData(matchId);
    this.replay.load(data);

    if (accountId) {
      this.replay.selectPlayer(accountId);
    }
  }
}
