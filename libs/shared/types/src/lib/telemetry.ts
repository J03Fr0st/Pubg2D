/**
 * Re-export PUBG telemetry types from @j03fr0st/pubg-ts.
 * The library provides 45+ typed telemetry events — we re-export
 * the ones we need and add our own replay-specific DTOs.
 *
 * Key type notes:
 * - _D (timestamp) is optional (`string | undefined`)
 * - gameState on LogGameStatePeriodic is optional
 * - itemPackage on LogCarePackageLand is optional
 * - killerDamageInfo is FlexibleDamageInfo = DamageInfo | DamageInfo[] | null | undefined
 *   → use DamageInfoUtils.getFirst() to safely extract
 * - Character has zone[] array, no vehicle field on LogPlayerPosition
 * - distance is directly on LogPlayerKillV2, not inside DamageInfo
 */

// Re-export telemetry types from pubg-ts
export type {
  TelemetryEvent,
  TelemetryData,
  Character,
  Location,
  GameState,
  ItemPackage,
  Item,
  Vehicle,
  DamageInfo,
  FlexibleDamageInfo,
  Common,
  LogPlayerPosition,
  LogPlayerKillV2,
  LogGameStatePeriodic,
  LogCarePackageLand,
  LogMatchStart,
  LogMatchEnd,
} from '@j03fr0st/pubg-ts';

// Re-export utilities
export { DamageInfoUtils } from '@j03fr0st/pubg-ts';

// Re-export match/player response types
export type {
  Player,
  PlayersResponse,
  Match,
  MatchResponse,
  Roster,
  Participant,
  Asset,
  Season,
} from '@j03fr0st/pubg-ts';
