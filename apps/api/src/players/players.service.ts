import { Injectable } from '@nestjs/common';
import { PubgService } from '../pubg/pubg.service';
import type { PlayerSearchResult, MatchSummary, Platform } from '@pubg-replay/shared-types';
import { getMapDisplayName } from '@pubg-replay/shared-utils';

const PLATFORM_TO_SHARD: Record<Platform, string> = {
  steam: 'steam',
  psn: 'psn',
  xbox: 'xbox',
  kakao: 'kakao',
};

@Injectable()
export class PlayersService {
  constructor(private pubgService: PubgService) {}

  async searchPlayer(platform: Platform, name: string): Promise<PlayerSearchResult> {
    const shard = PLATFORM_TO_SHARD[platform] ?? 'steam';
    const result = await this.pubgService.getPlayer(name, shard);
    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new Error(`Player not found: ${name}`);
    }

    const player = Array.isArray(result) ? result[0] : result;

    // Fetch recent match summaries (up to 5)
    const matchIds = (player.relationships?.matches?.data ?? []).slice(0, 5).map((m: any) => m.id);
    const recentMatches: MatchSummary[] = [];

    for (const matchId of matchIds) {
      try {
        const match = await this.pubgService.getMatch(matchId, shard);
        if (match) {
          const participant = match.included
            ?.filter((i: any) => i.type === 'participant')
            ?.find((p: any) => p.attributes?.stats?.playerId === player.id || p.attributes?.stats?.name === name);

          recentMatches.push({
            matchId,
            mapName: match.data?.attributes?.mapName ?? '',
            mapDisplayName: getMapDisplayName(match.data?.attributes?.mapName ?? ''),
            gameMode: match.data?.attributes?.gameMode ?? '',
            createdAt: match.data?.attributes?.createdAt ?? '',
            duration: match.data?.attributes?.duration ?? 0,
            playerCount: 0,
            placement: participant?.attributes?.stats?.winPlace ?? 0,
            kills: participant?.attributes?.stats?.kills ?? 0,
          });
        }
      } catch {
        // Skip failed match fetches
      }
    }

    return {
      accountId: player.id,
      name: player.name,
      platform,
      recentMatches,
    };
  }
}
