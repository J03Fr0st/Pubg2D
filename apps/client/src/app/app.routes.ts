import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'replay/:matchId',
    loadComponent: () =>
      import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: 'replay/:matchId/:accountId',
    loadComponent: () =>
      import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
];
