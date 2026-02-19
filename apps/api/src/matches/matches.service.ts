import { Injectable, Logger } from '@nestjs/common';
import type { ReplayData, TelemetryData } from '@pubg-replay/shared-types';
import type { PubgMatchApiResponse } from '../pubg/pubg.service';
import { PubgService } from '../pubg/pubg.service';
import { TelemetryProcessorService } from '../telemetry/telemetry-processor.service';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private readonly matchCache = new Map<string, PubgMatchApiResponse>();
  private readonly replayCache = new Map<string, ReplayData>();

  constructor(
    private pubgService: PubgService,
    private telemetryProcessor: TelemetryProcessorService,
  ) {}

  async getMatch(matchId: string): Promise<PubgMatchApiResponse> {
    const cached = this.matchCache.get(matchId);
    if (cached) return cached;

    const match = await this.pubgService.getMatch(matchId);
    if (!match) throw new Error(`Match not found: ${matchId}`);

    this.matchCache.set(matchId, match);
    return match;
  }

  async getReplayData(matchId: string): Promise<ReplayData> {
    const cachedReplay = this.replayCache.get(matchId);
    if (cachedReplay) return cachedReplay;

    const match = await this.getMatch(matchId);

    // Extract telemetry URL from match assets (JSONAPI structure: match.included assets)
    const asset = match.included?.find((i) => i.type === 'asset');
    const telemetryUrl = asset?.attributes?.URL;
    if (!telemetryUrl) throw new Error('No telemetry URL found');

    this.logger.log(`Fetching telemetry for match ${matchId}`);
    const telemetry = await this.pubgService.getTelemetry(telemetryUrl);
    if (!telemetry) throw new Error('Failed to fetch telemetry');

    const replayData = this.telemetryProcessor.process(telemetry as TelemetryData, matchId);
    this.replayCache.set(matchId, replayData);
    return replayData;
  }
}
