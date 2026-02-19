import type { PlayerFrame, ReplayTick, ZoneFrame } from '@pubg-replay/shared-types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePlayers(a: PlayerFrame[], b: PlayerFrame[], t: number): PlayerFrame[] {
  const bMap = new Map(b.map((p) => [p.accountId, p]));
  return a.map((pa) => {
    const pb = bMap.get(pa.accountId);
    if (!pb) return pa;
    return {
      ...pa,
      x: lerp(pa.x, pb.x, t),
      y: lerp(pa.y, pb.y, t),
      health: lerp(pa.health, pb.health, t),
      isAlive: t < 0.5 ? pa.isAlive : pb.isAlive,
    };
  });
}

function interpolateZone(a: ZoneFrame, b: ZoneFrame, t: number): ZoneFrame {
  // Don't interpolate from a "no data" zone — snap directly to the first real values
  // to avoid a near-zero radius flash that turns the whole map green.
  if (a.safeRadius === 0) return b;
  if (b.safeRadius === 0) return a;
  return {
    safeX: lerp(a.safeX, b.safeX, t),
    safeY: lerp(a.safeY, b.safeY, t),
    safeRadius: lerp(a.safeRadius, b.safeRadius, t),
    poisonX: lerp(a.poisonX, b.poisonX, t),
    poisonY: lerp(a.poisonY, b.poisonY, t),
    poisonRadius: lerp(a.poisonRadius, b.poisonRadius, t),
    redX: lerp(a.redX, b.redX, t),
    redY: lerp(a.redY, b.redY, t),
    redRadius: lerp(a.redRadius, b.redRadius, t),
  };
}

/** Find the interpolated tick state at a given elapsed time */
export function interpolateTick(ticks: ReplayTick[], time: number): ReplayTick {
  if (ticks.length === 0) {
    return {
      elapsedTime: time,
      players: [],
      zone: {
        safeX: 0.5,
        safeY: 0.5,
        safeRadius: 1,
        poisonX: 0.5,
        poisonY: 0.5,
        poisonRadius: 1,
        redX: 0,
        redY: 0,
        redRadius: 0,
      },
      alivePlayers: 0,
    };
  }

  if (time <= ticks[0].elapsedTime) return ticks[0];
  if (time >= ticks[ticks.length - 1].elapsedTime) return ticks[ticks.length - 1];

  // Binary search for the surrounding ticks
  let lo = 0;
  let hi = ticks.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (ticks[mid].elapsedTime <= time) lo = mid;
    else hi = mid;
  }

  const a = ticks[lo];
  const b = ticks[hi];
  const range = b.elapsedTime - a.elapsedTime;
  const t = range > 0 ? (time - a.elapsedTime) / range : 0;

  return {
    elapsedTime: time,
    players: interpolatePlayers(a.players, b.players, t),
    zone: interpolateZone(a.zone, b.zone, t),
    alivePlayers: Math.round(lerp(a.alivePlayers, b.alivePlayers, t)),
  };
}
