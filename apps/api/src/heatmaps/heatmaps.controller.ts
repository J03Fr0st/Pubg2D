import { Controller, Get, Param, Query } from '@nestjs/common';
import { HeatmapsService } from './heatmaps.service';
import type { HeatmapRequest } from '@pubg-replay/shared-types';

@Controller('players')
export class HeatmapsController {
  constructor(private heatmapsService: HeatmapsService) {}

  @Get(':accountId/heatmap')
  async getHeatmap(
    @Param('accountId') accountId: string,
    @Query('matches') matches = '10',
    @Query('mode') mode: 'movement' | 'deaths' | 'kills' = 'movement',
    @Query('mapName') mapName?: string,
  ) {
    // matchIds would be fetched from player data in a full implementation
    const matchIds: string[] = [];

    const request: HeatmapRequest = {
      accountId,
      matches: parseInt(matches),
      mode,
      mapName,
    };

    return this.heatmapsService.generateHeatmap(request, matchIds);
  }
}
