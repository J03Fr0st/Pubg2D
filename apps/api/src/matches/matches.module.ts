import { Module } from '@nestjs/common';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [TelemetryModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
