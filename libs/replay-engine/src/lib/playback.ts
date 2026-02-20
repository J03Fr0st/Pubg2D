import type {
  PlayerFrame,
  PlayerPositionTrack,
  ReplayTick,
  ZoneFrame,
  ZoneKeyframe,
} from '@pubg-replay/shared-types';

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

/** Binary search helper — returns lo index such that keyframes[lo].time <= time < keyframes[lo+1].time */
function bsearch<T extends { time: number }>(arr: T[], time: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid].time <= time) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Interpolate zone from dense keyframes (~1 s cadence) */
export function interpolateZoneAt(keyframes: ZoneKeyframe[], time: number): ZoneFrame | null {
  if (keyframes.length === 0) return null;
  // Don't clamp to the first keyframe before its time — return null so callers fall back to
  // tick-level zone data (safeRadius=0) instead of showing a premature zone at match start.
  if (time < keyframes[0].time) return null;
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1];

  const lo = bsearch(keyframes, time);
  const a = keyframes[lo];
  const b = keyframes[lo + 1];
  const range = b.time - a.time;
  const t = range > 0 ? (time - a.time) / range : 0;

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

/**
 * Interpolate player x/y positions from dense compact tracks (~1 s cadence).
 * Returns a map of accountId → { x, y }.
 */
export function interpolatePlayerPositionsAt(
  tracks: PlayerPositionTrack[],
  time: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  for (const track of tracks) {
    const kf = track.keyframes;
    const frameCount = kf.length / 3;
    if (frameCount === 0) continue;

    // Find surrounding frames via binary search on interleaved array
    let lo = 0;
    let hi = frameCount - 1;

    if (time <= kf[0]) {
      result.set(track.accountId, { x: kf[1], y: kf[2] });
      continue;
    }
    if (time >= kf[(frameCount - 1) * 3]) {
      result.set(track.accountId, { x: kf[(frameCount - 1) * 3 + 1], y: kf[(frameCount - 1) * 3 + 2] });
      continue;
    }

    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (kf[mid * 3] <= time) lo = mid;
      else hi = mid;
    }

    const aTime = kf[lo * 3];
    const aX = kf[lo * 3 + 1];
    const aY = kf[lo * 3 + 2];
    const bTime = kf[hi * 3];
    const bX = kf[hi * 3 + 1];
    const bY = kf[hi * 3 + 2];

    const range = bTime - aTime;
    const t = range > 0 ? (time - aTime) / range : 0;

    result.set(track.accountId, { x: lerp(aX, bX, t), y: lerp(aY, bY, t) });
  }

  return result;
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
        safeRadius: 0,
        poisonX: 0.5,
        poisonY: 0.5,
        poisonRadius: 0,
        redX: 0,
        redY: 0,
        redRadius: 0,
      },
      alivePlayers: 0,
    };
  }

  if (time <= ticks[0].elapsedTime) return ticks[0];
  if (time >= ticks[ticks.length - 1].elapsedTime) return ticks[ticks.length - 1];

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
    alivePlayers: a.alivePlayers, // discrete count – use from-tick value to avoid jumping
  };
}
