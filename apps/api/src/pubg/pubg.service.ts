import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubgClient } from '@j03fr0st/pubg-ts';

@Injectable()
export class PubgService {
  private client: PubgClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('PUBG_API_KEY');
    if (!apiKey) throw new Error('PUBG_API_KEY not set');
    this.client = new PubgClient({ apiKey, shard: 'steam' });
  }

  getClient(): PubgClient {
    return this.client;
  }

  async getPlayer(name: string, shard = 'steam') {
    return this.client.players.getPlayers({ playerNames: [name], shard } as any);
  }

  async getMatch(matchId: string, shard = 'steam') {
    return this.client.matches.getMatch(matchId, { shard } as any);
  }

  async getTelemetry(url: string) {
    return this.client.telemetry.getTelemetryData(url);
  }
}
