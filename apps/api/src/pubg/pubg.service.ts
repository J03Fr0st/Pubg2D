import { PubgClient } from '@j03fr0st/pubg-ts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PubgApiResource {
  id: string;
  type: string;
  attributes?: {
    stats?: { playerId?: string; name?: string; winPlace?: number; kills?: number };
    URL?: string;
    [key: string]: unknown;
  };
  relationships?: Record<string, { data: Array<{ id: string; type: string }> }>;
}

export interface PubgPlayerResource {
  id: string;
  type: string;
  name: string;
  relationships?: { matches?: { data: Array<{ id: string; type: string }> } };
}

export interface PubgMatchApiResponse {
  data?: {
    id: string;
    type: string;
    attributes?: { mapName?: string; gameMode?: string; createdAt?: string; duration?: number };
  };
  included?: PubgApiResource[];
}

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

  async getPlayer(
    name: string,
    shard = 'steam',
  ): Promise<PubgPlayerResource[] | PubgPlayerResource> {
    // biome-ignore lint/suspicious/noExplicitAny: pubg-ts library options type workaround
    return this.client.players.getPlayers({ playerNames: [name], shard } as any);
  }

  async getMatch(matchId: string, shard = 'steam'): Promise<PubgMatchApiResponse | null> {
    // biome-ignore lint/suspicious/noExplicitAny: pubg-ts library options type workaround
    return this.client.matches.getMatch(matchId, { shard } as any);
  }

  async getTelemetry(url: string): Promise<unknown> {
    return this.client.telemetry.getTelemetryData(url);
  }
}
