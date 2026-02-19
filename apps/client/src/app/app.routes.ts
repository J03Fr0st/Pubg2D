import type { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'replay/:matchId',
    loadComponent: () => import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: 'replay/:matchId/:accountId',
    loadComponent: () => import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: 'player/:platform/:name',
    loadComponent: () => import('./pages/player/player.component').then((m) => m.PlayerComponent),
  },
  {
    path: 'heatmap/:accountId',
    loadComponent: () =>
      import('./pages/heatmap/heatmap.component').then((m) => m.HeatmapComponent),
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
];
