import { describe, it, expect } from 'vitest';
import {
  getMapSize,
  getMapDisplayName,
  normalizeCoord,
  telemetryToNormalized,
  MAP_DEFINITIONS,
} from './map-helpers';

describe('map-helpers', () => {
  it('returns correct size for Erangel', () => {
    expect(getMapSize('Baltic_Main')).toBe(816000);
  });

  it('returns correct size for Sanhok', () => {
    expect(getMapSize('Savage_Main')).toBe(408000);
  });

  it('returns correct display name', () => {
    expect(getMapDisplayName('Desert_Main')).toBe('Miramar');
  });

  it('returns unknown for unrecognized map', () => {
    expect(getMapDisplayName('Fake_Map')).toBe('Unknown');
  });

  it('normalizes coordinates to 0..1 range', () => {
    expect(normalizeCoord(408000, 816000)).toBeCloseTo(0.5);
    expect(normalizeCoord(0, 816000)).toBe(0);
    expect(normalizeCoord(816000, 816000)).toBe(1);
  });

  it('converts telemetry location to normalized x,y', () => {
    const result = telemetryToNormalized(
      { x: 408000, y: 204000, z: 0 },
      'Baltic_Main'
    );
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0.25);
  });
});
