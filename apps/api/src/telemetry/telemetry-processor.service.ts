import { assetManager } from '@j03fr0st/pubg-ts';
import { Injectable } from '@nestjs/common';
import type {
  CarePackageEvent,
  KillEvent,
  LogCarePackageLand,
  LogGameStatePeriodic,
  LogMatchStart,
  LogPlayerKillV2,
  LogPlayerPosition,
  MatchPlayer,
  PlayerFrame,
  PlayerPositionTrack,
  ReplayData,
  ReplayTick,
  TelemetryData,
  ZoneFrame,
  ZoneKeyframe,
} from '@pubg-replay/shared-types';
import { DamageInfoUtils } from '@pubg-replay/shared-types';
import { getMapDisplayName, getMapSize, normalizeCoord } from '@pubg-replay/shared-utils';

const TICK_INTERVAL = 5; // seconds

/** Resolve weapon display name using asset manager */
function resolveWeaponName(damageCauserName: string): string {
  return assetManager.getDamageCauserName(damageCauserName) ?? damageCauserName;
}

@Injectable()
export class TelemetryProcessorService {
  process(events: TelemetryData, matchId: string): ReplayData {
    const matchStart = events.find((e) => e._T === 'LogMatchStart') as LogMatchStart | undefined;
    const mapName = matchStart?.mapName ?? 'Baltic_Main';
    const mapSize = getMapSize(mapName);
    const norm = (v: number) => normalizeCoord(v, mapSize);

    // Collect position events grouped by tick (5-second buckets)
    const positionsByTick = new Map<number, LogPlayerPosition[]>();
    const gameStatesByTick = new Map<number, LogGameStatePeriodic>();
    const zoneKeyframes: ZoneKeyframe[] = [];
    // Compact per-player position data: accountId → [t, x, y, t, x, y, ...]
    const playerTrackMap = new Map<string, number[]>();
    const kills: KillEvent[] = [];
    const carePackages: CarePackageEvent[] = [];
    const playerKills = new Map<string, number>();
    let maxElapsed = 0;
    const matchStartMs = events[0]?._D ? new Date(events[0]._D).getTime() : 0;

    // Track airplane phase positions to extract the flight path
    let planePathStart: { x: number; y: number } | null = null;
    let planePathEnd: { x: number; y: number } | null = null;

    for (const event of events) {
      switch (event._T) {
        case 'LogPlayerPosition': {
          const e = event as LogPlayerPosition;
          // isGame = 0.1 means the player is on the airplane
          if (e.common.isGame < 1) {
            const px = norm(e.character.location.x);
            const py = norm(e.character.location.y);
            if (!planePathStart) planePathStart = { x: px, y: py };
            planePathEnd = { x: px, y: py };
          }
          const tick = Math.round(e.elapsedTime / TICK_INTERVAL) * TICK_INTERVAL;
          maxElapsed = Math.max(maxElapsed, e.elapsedTime);
          let tickPositions = positionsByTick.get(tick);
          if (!tickPositions) {
            tickPositions = [];
            positionsByTick.set(tick, tickPositions);
          }
          tickPositions.push(e);
          // Dense position track (in-game only, skip airplane phase)
          if (e.common.isGame >= 1) {
            const id = e.character.accountId;
            let track = playerTrackMap.get(id);
            if (!track) {
              track = [];
              playerTrackMap.set(id, track);
            }
            track.push(e.elapsedTime, norm(e.character.location.x), norm(e.character.location.y));
          }
          break;
        }
        case 'LogGameStatePeriodic': {
          const e = event as LogGameStatePeriodic;
          if (!e.gameState) break; // gameState is optional
          const tick = Math.round(e.gameState.elapsedTime / TICK_INTERVAL) * TICK_INTERVAL;
          gameStatesByTick.set(tick, e);
          // Also store as a dense keyframe at natural cadence (~1 s)
          const gs = e.gameState;
          if (gs.elapsedTime > 0) {
            zoneKeyframes.push({
              time: gs.elapsedTime,
              safeX: norm(gs.safetyZonePosition.x),
              safeY: norm(gs.safetyZonePosition.y),
              safeRadius: normalizeCoord(gs.safetyZoneRadius, mapSize),
              poisonX: norm(gs.poisonGasWarningPosition.x),
              poisonY: norm(gs.poisonGasWarningPosition.y),
              poisonRadius: normalizeCoord(gs.poisonGasWarningRadius, mapSize),
              redX: norm(gs.redZonePosition.x),
              redY: norm(gs.redZonePosition.y),
              redRadius: normalizeCoord(gs.redZoneRadius, mapSize),
            });
          }
          break;
        }
        case 'LogPlayerKillV2': {
          const e = event as LogPlayerKillV2;
          const timestamp =
            e.common.isGame > 0 && e._D ? (new Date(e._D).getTime() - matchStartMs) / 1000 : 0;
          const damageInfo = DamageInfoUtils.getFirst(e.killerDamageInfo);
          kills.push({
            timestamp,
            killerAccountId: e.killer?.accountId ?? null,
            killerName: e.killer?.name ?? null,
            victimAccountId: e.victim.accountId,
            victimName: e.victim.name,
            weaponName: damageInfo ? resolveWeaponName(damageInfo.damageCauserName) : 'Unknown',
            distance: Math.round((e.distance ?? 0) / 100),
            isSuicide: e.isSuicide,
            killerX: e.killer ? norm(e.killer.location.x) : 0,
            killerY: e.killer ? norm(e.killer.location.y) : 0,
            victimX: norm(e.victim.location.x),
            victimY: norm(e.victim.location.y),
          });
          if (e.killer) {
            playerKills.set(e.killer.accountId, (playerKills.get(e.killer.accountId) ?? 0) + 1);
          }
          break;
        }
        case 'LogCarePackageLand': {
          const e = event as LogCarePackageLand;
          if (!e.itemPackage) break; // itemPackage is optional
          carePackages.push({
            timestamp: e._D ? (new Date(e._D).getTime() - matchStartMs) / 1000 : 0,
            x: norm(e.itemPackage.location.x),
            y: norm(e.itemPackage.location.y),
          });
          break;
        }
      }
    }

    // Build ticks
    const killTimestamps = new Map<string, number>();
    for (const kill of kills) {
      killTimestamps.set(kill.victimAccountId, kill.timestamp);
    }

    const sortedTickTimes = [...positionsByTick.keys()].sort((a, b) => a - b);
    const ticks: ReplayTick[] = [];

    // Carry forward the last known zone so ticks without a LogGameStatePeriodic
    // event don't snap back to a full-map radius and cause open/close animation.
    let lastZone: ZoneFrame = {
      safeX: 0.5,
      safeY: 0.5,
      safeRadius: 0,
      poisonX: 0.5,
      poisonY: 0.5,
      poisonRadius: 0,
      redX: 0,
      redY: 0,
      redRadius: 0,
    };

    for (const tickTime of sortedTickTimes) {
      const positions = positionsByTick.get(tickTime) ?? [];
      const gameState = gameStatesByTick.get(tickTime);

      // Deduplicate: take last position per player per tick
      const playerMap = new Map<string, LogPlayerPosition>();
      for (const pos of positions) {
        playerMap.set(pos.character.accountId, pos);
      }

      const players: PlayerFrame[] = [...playerMap.values()].map((pos) => {
        const deathTime = killTimestamps.get(pos.character.accountId);
        const isAlive = deathTime === undefined || deathTime > tickTime;
        return {
          accountId: pos.character.accountId,
          name: pos.character.name,
          teamId: pos.character.teamId,
          x: norm(pos.character.location.x),
          y: norm(pos.character.location.y),
          health: isAlive ? pos.character.health : 0,
          isAlive,
        };
      });

      if (gameState) {
        lastZone = {
          safeX: norm(gameState.gameState.safetyZonePosition.x),
          safeY: norm(gameState.gameState.safetyZonePosition.y),
          safeRadius: normalizeCoord(gameState.gameState.safetyZoneRadius, mapSize),
          poisonX: norm(gameState.gameState.poisonGasWarningPosition.x),
          poisonY: norm(gameState.gameState.poisonGasWarningPosition.y),
          poisonRadius: normalizeCoord(gameState.gameState.poisonGasWarningRadius, mapSize),
          redX: norm(gameState.gameState.redZonePosition.x),
          redY: norm(gameState.gameState.redZonePosition.y),
          redRadius: normalizeCoord(gameState.gameState.redZoneRadius, mapSize),
        };
      }

      const zone = lastZone;

      ticks.push({
        elapsedTime: tickTime,
        players,
        zone,
        alivePlayers:
          gameState?.gameState.numAlivePlayers ?? players.filter((p) => p.isAlive).length,
      });
    }

    // Build player summaries from LogMatchStart characters + kill data
    const characters = matchStart?.characters ?? [];
    const matchPlayers: MatchPlayer[] = characters.map((c) => ({
      accountId: c.accountId,
      name: c.name,
      teamId: c.teamId,
      kills: playerKills.get(c.accountId) ?? 0,
      damageDealt: 0, // not available from telemetry alone
      survivalTime: killTimestamps.get(c.accountId) ?? maxElapsed,
      placement: 0, // set from match data, not telemetry
    }));

    const playerPositionTracks: PlayerPositionTrack[] = [...playerTrackMap.entries()].map(
      ([accountId, keyframes]) => ({ accountId, keyframes }),
    );

    return {
      matchId,
      mapName,
      mapDisplayName: getMapDisplayName(mapName),
      mapSize,
      duration: maxElapsed,
      teamSize: matchStart?.teamSize ?? 1,
      createdAt: matchStart?._D ?? '',
      ticks,
      zoneKeyframes,
      playerPositionTracks,
      kills,
      carePackages,
      players: matchPlayers,
      ...(planePathStart && planePathEnd
        ? { planePath: [planePathStart, planePathEnd] as [{ x: number; y: number }, { x: number; y: number }] }
        : {}),
    };
  }
}
