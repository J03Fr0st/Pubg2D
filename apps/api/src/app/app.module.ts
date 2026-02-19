import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HeatmapsModule } from '../heatmaps/heatmaps.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { PubgModule } from '../pubg/pubg.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PubgModule,
    MatchesModule,
    PlayersModule,
    HeatmapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
