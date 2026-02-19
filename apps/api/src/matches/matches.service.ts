import { Injectable, Logger } from '@nestjs/common';
import { PubgService } from '../pubg/pubg.service';
import { TelemetryProcessorService } from '../telemetry/telemetry-processor.service';
import type { ReplayData } from '@pubg-replay/shared-types';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private readonly matchCache = new Map<string, any>();
  private readonly replayCache = new Map<string, ReplayData>();

  constructor(
    private pubgService: PubgService,
    private telemetryProcessor: TelemetryProcessorService,
  ) {}

  async getMatch(matchId: string) {
    if (this.matchCache.has(matchId)) return this.matchCache.get(matchId);

    const match = await this.pubgService.getMatch(matchId);
    if (!match) throw new Error(`Match not found: ${matchId}`);

    this.matchCache.set(matchId, match);
    return match;
  }

  async getReplayData(matchId: string): Promise<ReplayData> {
    if (this.replayCache.has(matchId)) return this.replayCache.get(matchId)!;

    const match = await this.getMatch(matchId);

    // Extract telemetry URL from match assets (JSONAPI structure: match.included assets)
    const asset = match.included?.find((i: any) => i.type === 'asset');
    const telemetryUrl = asset?.attributes?.URL;
    if (!telemetryUrl) throw new Error('No telemetry URL found');

    this.logger.log(`Fetching telemetry for match ${matchId}`);
    const telemetry = await this.pubgService.getTelemetry(telemetryUrl);
    if (!telemetry) throw new Error('Failed to fetch telemetry');

    const replayData = this.telemetryProcessor.process(telemetry as any, matchId);
    this.replayCache.set(matchId, replayData);
    return replayData;
  }
}
