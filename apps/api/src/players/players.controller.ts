import { Controller, Get, Param } from '@nestjs/common';
import type { Platform } from '@pubg-replay/shared-types';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Get(':platform/:name')
  async searchPlayer(@Param('platform') platform: Platform, @Param('name') name: string) {
    return this.playersService.searchPlayer(platform, name);
  }
}
