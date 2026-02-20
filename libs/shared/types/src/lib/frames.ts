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
  assistantAccountIds: string[];
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

/** A player damage event */
export interface DamageEvent {
  timestamp: number; // elapsed seconds
  attackerAccountId: string;
  victimAccountId: string;
  damage: number; // raw health damage amount
}

/** A single tick of processed replay data (5-second intervals) */
export interface ReplayTick {
  elapsedTime: number; // seconds since match start
  players: PlayerFrame[];
  zone: ZoneFrame;
  alivePlayers: number;
}

/** Dense zone snapshot — one per LogGameStatePeriodic event (~1 s cadence) */
export interface ZoneKeyframe extends ZoneFrame {
  time: number; // elapsed seconds
}

/**
 * Compact per-player position track sampled at LogPlayerPosition cadence (~1 s).
 * keyframes is interleaved: [time0, x0, y0, time1, x1, y1, ...]
 */
export interface PlayerPositionTrack {
  accountId: string;
  keyframes: number[];
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
  /** Dense zone snapshots at ~1 s cadence for smooth interpolation */
  zoneKeyframes: ZoneKeyframe[];
  /** Compact per-player position tracks at ~1 s cadence for smooth interpolation */
  playerPositionTracks: PlayerPositionTrack[];
  kills: KillEvent[];
  damageEvents: DamageEvent[];
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
  assists: number;
  damageDealt: number;
  survivalTime: number;
  placement: number;
}
