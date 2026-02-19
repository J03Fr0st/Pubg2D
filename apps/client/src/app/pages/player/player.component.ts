import { Component, inject, type OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { PlayerSearchResult } from '@pubg-replay/shared-types';
import { MatchCardComponent } from '../../components/match-card/match-card.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'pubg-player-page',
  standalone: true,
  imports: [MatchCardComponent],
  template: `
    <div class="min-h-screen bg-bg text-text-primary p-8">
      @if (loading()) {
        <p class="font-mono text-sm text-text-secondary">Loading...</p>
      } @else if (player()) {
        <h1 class="font-sans font-bold text-2xl text-accent mb-1">
          {{ player()!.name }}
        </h1>
        <p class="font-mono text-sm text-text-secondary mb-6 uppercase">
          {{ player()!.platform }}
        </p>

        <h2 class="font-sans font-semibold text-lg text-text-primary mb-3 tracking-wider uppercase">
          Recent Matches
        </h2>
        <div class="space-y-2 max-w-2xl">
          @for (match of player()!.recentMatches; track match.matchId) {
            <pubg-match-card [match]="match" />
          }
        </div>
      } @else {
        <p class="font-mono text-sm text-danger">{{ error() }}</p>
      }
    </div>
  `,
})
export class PlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  player = signal<PlayerSearchResult | null>(null);
  loading = signal(true);
  error = signal('');

  async ngOnInit(): Promise<void> {
    const platform = this.route.snapshot.paramMap.get('platform') ?? 'steam';
    const name = this.route.snapshot.paramMap.get('name') ?? '';

    try {
      const result = await this.api.searchPlayer(platform, name);
      this.player.set(result);
    } catch (e: any) {
      this.error.set(e.message ?? 'Player not found');
    } finally {
      this.loading.set(false);
    }
  }
}
