import { Test } from '@nestjs/testing';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

describe('MatchesController', () => {
  let controller: MatchesController;
  const mockService = {
    getMatch: jest.fn().mockResolvedValue({ matchId: 'test', mapName: 'Baltic_Main' }),
    getReplayData: jest.fn().mockResolvedValue({ matchId: 'test', ticks: [] }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [{ provide: MatchesService, useValue: mockService }],
    }).compile();
    controller = module.get(MatchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /matches/:matchId returns match data', async () => {
    const result = await controller.getMatch('test');
    expect(result.matchId).toBe('test');
  });

  it('GET /matches/:matchId/telemetry returns replay data', async () => {
    const result = await controller.getTelemetry('test');
    expect(result.matchId).toBe('test');
  });
});
