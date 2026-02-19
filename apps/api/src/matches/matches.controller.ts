import { Controller, Get, Param } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get(':matchId')
  async getMatch(@Param('matchId') matchId: string) {
    return this.matchesService.getMatch(matchId);
  }

  @Get(':matchId/telemetry')
  async getTelemetry(@Param('matchId') matchId: string) {
    return this.matchesService.getReplayData(matchId);
  }
}
