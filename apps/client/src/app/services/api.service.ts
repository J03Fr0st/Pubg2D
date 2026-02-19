import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { PlayerSearchResult, ReplayData } from '@pubg-replay/shared-types';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  searchPlayer(platform: string, name: string): Promise<PlayerSearchResult> {
    return firstValueFrom(this.http.get<PlayerSearchResult>(`/api/players/${platform}/${name}`));
  }

  getReplayData(matchId: string): Promise<ReplayData> {
    return firstValueFrom(this.http.get<ReplayData>(`/api/matches/${matchId}/telemetry`));
  }
}
