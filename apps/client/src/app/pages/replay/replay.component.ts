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
      <div class="w-72 h-full border-r border-border bg-surface">
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
