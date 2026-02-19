import { describe, it, expect } from 'vitest';
import { interpolateTick } from './playback';
import type { ReplayTick, PlayerFrame, ZoneFrame } from '@pubg-replay/shared-types';

const defaultZone: ZoneFrame = {
  safeX: 0.5, safeY: 0.5, safeRadius: 0.5,
  poisonX: 0.5, poisonY: 0.5, poisonRadius: 0.6,
  redX: 0, redY: 0, redRadius: 0,
};

function makeTick(time: number, px: number, py: number): ReplayTick {
  return {
    elapsedTime: time,
    players: [{ accountId: 'p1', name: 'P1', teamId: 1, x: px, y: py, health: 100, isAlive: true }],
    zone: defaultZone,
    alivePlayers: 1,
  };
}

describe('interpolateTick', () => {
  it('returns exact tick when time matches', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(5, 1, 1)];
    const result = interpolateTick(ticks, 0);
    expect(result.players[0].x).toBe(0);
  });

  it('interpolates between ticks', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(10, 1, 1)];
    const result = interpolateTick(ticks, 5);
    expect(result.players[0].x).toBeCloseTo(0.5);
    expect(result.players[0].y).toBeCloseTo(0.5);
  });

  it('clamps to last tick beyond duration', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(10, 1, 1)];
    const result = interpolateTick(ticks, 15);
    expect(result.players[0].x).toBe(1);
  });
});
