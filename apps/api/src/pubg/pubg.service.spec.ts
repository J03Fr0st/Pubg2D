import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PubgService } from './pubg.service';

describe('PubgService', () => {
  let service: PubgService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PubgService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'PUBG_API_KEY' ? 'test-key' : undefined) },
        },
      ],
    }).compile();
    service = module.get(PubgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have client initialized', () => {
    expect(service.getClient()).toBeDefined();
  });
});
