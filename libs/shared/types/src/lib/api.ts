export type Platform = 'steam' | 'psn' | 'xbox' | 'kakao';

export interface PlayerSearchResult {
  accountId: string;
  name: string;
  platform: Platform;
  recentMatches: MatchSummary[];
}

export interface MatchSummary {
  matchId: string;
  mapName: string;
  mapDisplayName: string;
  gameMode: string;
  createdAt: string;
  duration: number;
  playerCount: number;
  placement: number;
  kills: number;
}

export interface SeasonInfo {
  id: string;
  isCurrentSeason: boolean;
  isOffseason: boolean;
}

export interface HeatmapRequest {
  accountId: string;
  matches?: number; // default 10, max 25
  season?: string;
  mode: 'movement' | 'deaths' | 'kills';
  mapName?: string;
}

export interface HeatmapData {
  mapName: string;
  mapDisplayName: string;
  gridWidth: number;
  gridHeight: number;
  /** Row-major normalized intensity values (0..1) */
  intensities: number[];
  matchCount: number;
}
