import { Injectable } from '@nestjs/common';
import type { HeatmapData, HeatmapRequest } from '@pubg-replay/shared-types';
import { getMapDisplayName } from '@pubg-replay/shared-utils';
import { MatchesService } from '../matches/matches.service';

const GRID_SIZE = 128; // 128x128 density grid

@Injectable()
export class HeatmapsService {
  constructor(private matchesService: MatchesService) {}

  async generateHeatmap(request: HeatmapRequest, matchIds: string[]): Promise<HeatmapData> {
    const grid = new Float32Array(GRID_SIZE * GRID_SIZE);
    let mapName = request.mapName ?? 'Baltic_Main';

    for (const matchId of matchIds.slice(0, 25)) {
      try {
        const replay = await this.matchesService.getReplayData(matchId);
        if (request.mapName && replay.mapName !== request.mapName) continue;
        mapName = replay.mapName;

        switch (request.mode) {
          case 'movement':
            for (const tick of replay.ticks) {
              for (const player of tick.players) {
                if (player.accountId !== request.accountId || !player.isAlive) continue;
                const gx = Math.min(GRID_SIZE - 1, Math.floor(player.x * GRID_SIZE));
                const gy = Math.min(GRID_SIZE - 1, Math.floor(player.y * GRID_SIZE));
                grid[gy * GRID_SIZE + gx] += 1;
              }
            }
            break;
          case 'deaths':
            for (const kill of replay.kills) {
              if (kill.victimAccountId !== request.accountId) continue;
              const gx = Math.min(GRID_SIZE - 1, Math.floor(kill.victimX * GRID_SIZE));
              const gy = Math.min(GRID_SIZE - 1, Math.floor(kill.victimY * GRID_SIZE));
              grid[gy * GRID_SIZE + gx] += 1;
            }
            break;
          case 'kills':
            for (const kill of replay.kills) {
              if (kill.killerAccountId !== request.accountId) continue;
              const gx = Math.min(GRID_SIZE - 1, Math.floor(kill.killerX * GRID_SIZE));
              const gy = Math.min(GRID_SIZE - 1, Math.floor(kill.killerY * GRID_SIZE));
              grid[gy * GRID_SIZE + gx] += 1;
            }
            break;
        }
      } catch {
        // Skip failed matches
      }
    }

    // Normalize to 0..1
    const max = Math.max(...grid, 1);
    const intensities = Array.from(grid).map((v) => v / max);

    return {
      mapName,
      mapDisplayName: getMapDisplayName(mapName),
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      intensities,
      matchCount: matchIds.length,
    };
  }
}
