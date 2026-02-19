import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'pubg-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-screen flex flex-col items-center justify-center bg-bg">
      <h1 class="font-sans font-bold text-3xl text-accent tracking-wider mb-2">
        PUBG REPLAY VIEWER
      </h1>
      <p class="font-mono text-sm text-text-secondary mb-8">
        2D tactical match replay
      </p>

      <div class="flex gap-2">
        <select
          class="bg-surface text-text-primary font-mono text-sm border border-border px-3 py-2"
          [(ngModel)]="platform"
        >
          <option value="steam">STEAM</option>
          <option value="psn">PSN</option>
          <option value="xbox">XBOX</option>
        </select>

        <input
          type="text"
          class="bg-surface text-text-primary font-mono text-sm border border-border px-3 py-2 w-64"
          placeholder="Player name..."
          [(ngModel)]="playerName"
          (keyup.enter)="search()"
        />

        <button
          class="bg-accent text-bg font-mono text-sm font-bold px-4 py-2 hover:opacity-80"
          (click)="search()"
        >[ SEARCH ]</button>
      </div>

      @if (error()) {
        <p class="mt-4 font-mono text-sm text-danger">{{ error() }}</p>
      }
    </div>
  `,
})
export class HomeComponent {
  private router = inject(Router);

  platform = 'steam';
  playerName = '';
  error = signal('');

  search(): void {
    if (!this.playerName.trim()) {
      this.error.set('Enter a player name');
      return;
    }
    this.error.set('');
    this.router.navigate(['/player', this.platform, this.playerName.trim()]);
  }
}
