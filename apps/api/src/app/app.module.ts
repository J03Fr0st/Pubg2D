import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PubgModule } from '../pubg/pubg.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PubgModule,
    MatchesModule,
    PlayersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
