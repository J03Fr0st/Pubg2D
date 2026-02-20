import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MatchSummary } from '@pubg-replay/shared-types';
import { formatTimestamp } from '@pubg-replay/shared-utils';

@Component({
  selector: 'pubg-match-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="replayLink()"
      class="block p-3 bg-surface border border-border hover:border-accent transition-colors"
    >
      <div class="flex justify-between items-center mb-1">
        <span class="font-sans font-semibold text-sm text-text-primary">
          {{ match().mapDisplayName }}
        </span>
        <span class="font-mono text-xs text-text-secondary">
          {{ formatDate(match().createdAt) }}
        </span>
      </div>
      <div class="flex gap-4 font-mono text-xs text-text-secondary">
        <span>#{{ match().placement }}</span>
        <span>{{ match().kills }} kills</span>
        <span>{{ match().gameMode }}</span>
      </div>
    </a>
  `,
})
export class MatchCardComponent {
  match = input.required<MatchSummary>();
  defaultAccountId = input<string | null>(null);
  routePlayerName = input<string | null>(null);
  routePlatform = input<string | null>(null);

  replayLink(): string {
    const playerName = this.routePlayerName();
    const platform = this.routePlatform();
    if (playerName && platform) {
      return `/${encodeURIComponent(playerName)}/${encodeURIComponent(platform)}/${this.match().matchId}`;
    }

    const accountId = this.defaultAccountId();
    return accountId
      ? `/replay/${this.match().matchId}/${encodeURIComponent(accountId)}`
      : `/replay/${this.match().matchId}`;
  }

  formatDate(iso: string): string {
    return formatTimestamp(iso);
  }
}
