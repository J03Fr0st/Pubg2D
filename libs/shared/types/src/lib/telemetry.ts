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
// Alias for telemetry coordinate type
// Re-export match/player response types
export type {
  Asset,
  Character,
  Common,
  DamageInfo,
  FlexibleDamageInfo,
  GameState,
  Item,
  ItemPackage,
  Location,
  Location as TelemetryLocation,
  LogCarePackageLand,
  LogGameStatePeriodic,
  LogMatchEnd,
  LogMatchStart,
  LogPlayerKillV2,
  LogPlayerPosition,
  Match,
  MatchResponse,
  Participant,
  Player,
  PlayersResponse,
  Roster,
  Season,
  TelemetryData,
  TelemetryEvent,
  Vehicle,
} from '@j03fr0st/pubg-ts';
// Re-export utilities
export { DamageInfoUtils } from '@j03fr0st/pubg-ts';
