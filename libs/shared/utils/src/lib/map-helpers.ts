import type { TelemetryLocation } from '@pubg-replay/shared-types';

export interface MapDefinition {
  internalName: string;
  displayName: string;
  size: number; // coordinate range in cm
}

export const MAP_DEFINITIONS: MapDefinition[] = [
  { internalName: 'Baltic_Main', displayName: 'Erangel', size: 816000 },
  { internalName: 'Erangel_Main', displayName: 'Erangel (Classic)', size: 816000 },
  { internalName: 'Desert_Main', displayName: 'Miramar', size: 816000 },
  { internalName: 'Tiger_Main', displayName: 'Taego', size: 816000 },
  { internalName: 'DihorOtok_Main', displayName: 'Vikendi', size: 816000 },
  { internalName: 'Kiki_Main', displayName: 'Deston', size: 816000 },
  { internalName: 'Savage_Main', displayName: 'Sanhok', size: 408000 },
  { internalName: 'Chimera_Main', displayName: 'Paramo', size: 306000 },
  { internalName: 'Summerland_Main', displayName: 'Karakin', size: 204000 },
  { internalName: 'Range_Main', displayName: 'Camp Jackal', size: 204000 },
  { internalName: 'Heaven_Main', displayName: 'Haven', size: 102000 },
  { internalName: 'Neon_Main', displayName: 'Rondo', size: 816000 },
];

export function getMapSize(mapName: string): number {
  return MAP_DEFINITIONS.find((m) => m.internalName === mapName)?.size ?? 816000;
}

export function getMapDisplayName(mapName: string): string {
  return MAP_DEFINITIONS.find((m) => m.internalName === mapName)?.displayName ?? 'Unknown';
}

export function normalizeCoord(value: number, mapSize: number): number {
  return value / mapSize;
}

export function telemetryToNormalized(
  location: TelemetryLocation,
  mapName: string
): { x: number; y: number } {
  const size = getMapSize(mapName);
  return {
    x: normalizeCoord(location.x, size),
    y: normalizeCoord(location.y, size),
  };
}
