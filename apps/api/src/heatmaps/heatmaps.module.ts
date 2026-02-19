import { Module } from '@nestjs/common';
import { HeatmapsController } from './heatmaps.controller';
import { HeatmapsService } from './heatmaps.service';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [MatchesModule],
  controllers: [HeatmapsController],
  providers: [HeatmapsService],
})
export class HeatmapsModule {}
