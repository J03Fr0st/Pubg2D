import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module';
import { HeatmapsController } from './heatmaps.controller';
import { HeatmapsService } from './heatmaps.service';

@Module({
  imports: [MatchesModule],
  controllers: [HeatmapsController],
  providers: [HeatmapsService],
})
export class HeatmapsModule {}
