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
      [routerLink]="['/replay', match().matchId]"
      class="block p-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
    >
      <div class="flex justify-between items-center mb-1">
        <span class="font-sans font-semibold text-sm text-[var(--color-text-primary)]">
          {{ match().mapDisplayName }}
        </span>
        <span class="font-mono text-xs text-[var(--color-text-secondary)]">
          {{ formatDate(match().createdAt) }}
        </span>
      </div>
      <div class="flex gap-4 font-mono text-xs text-[var(--color-text-secondary)]">
        <span>#{{ match().placement }}</span>
        <span>{{ match().kills }} kills</span>
        <span>{{ match().gameMode }}</span>
      </div>
    </a>
  `,
})
export class MatchCardComponent {
  match = input.required<MatchSummary>();

  formatDate(iso: string): string {
    return formatTimestamp(iso);
  }
}
