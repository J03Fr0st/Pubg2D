/** A single player's state at a given tick */
export interface PlayerFrame {
  accountId: string;
  name: string;
  teamId: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  health: number; // 0..100
  isAlive: boolean;
}

/** Zone state at a given tick */
export interface ZoneFrame {
  safeX: number; // normalized 0..1
  safeY: number;
  safeRadius: number; // normalized
  poisonX: number;
  poisonY: number;
  poisonRadius: number;
  redX: number;
  redY: number;
  redRadius: number;
}

/** A kill event */
export interface KillEvent {
  timestamp: number; // elapsed seconds
  killerAccountId: string | null;
  killerName: string | null;
  victimAccountId: string;
  victimName: string;
  weaponName: string;
  distance: number; // meters
  isSuicide: boolean;
  killerX: number;
  killerY: number;
  victimX: number;
  victimY: number;
}

/** Care package landing event */
export interface CarePackageEvent {
  timestamp: number;
  x: number;
  y: number;
}

/** A single tick of processed replay data (5-second intervals) */
export interface ReplayTick {
  elapsedTime: number; // seconds since match start
  players: PlayerFrame[];
  zone: ZoneFrame;
  alivePlayers: number;
}

/** Full processed replay payload sent to the client */
export interface ReplayData {
  matchId: string;
  mapName: string;
  mapDisplayName: string;
  mapSize: number; // coordinate range in cm (e.g. 816000)
  duration: number; // match duration in seconds
  teamSize: number;
  createdAt: string;
  ticks: ReplayTick[];
  kills: KillEvent[];
  carePackages: CarePackageEvent[];
  players: MatchPlayer[];
  /** Normalized start and end of the airplane flight path */
  planePath?: [{ x: number; y: number }, { x: number; y: number }];
}

/** Player summary for the roster panel */
export interface MatchPlayer {
  accountId: string;
  name: string;
  teamId: number;
  kills: number;
  damageDealt: number;
  survivalTime: number;
  placement: number;
}
