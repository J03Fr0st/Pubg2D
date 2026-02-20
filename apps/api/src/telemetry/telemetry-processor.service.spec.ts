import type {
  LogGameStatePeriodic,
  LogMatchStart,
  LogPlayerKillV2,
  LogPlayerPosition,
  TelemetryData,
} from '@pubg-replay/shared-types';
import { TelemetryProcessorService } from './telemetry-processor.service';

function makePosition(
  accountId: string,
  name: string,
  teamId: number,
  x: number,
  y: number,
  health: number,
  elapsed: number,
): LogPlayerPosition {
  return {
    _T: 'LogPlayerPosition',
    _D: new Date(elapsed * 1000).toISOString(),
    common: { isGame: 1 },
    character: { name, teamId, health, location: { x, y, z: 0 }, ranking: 0, accountId, zone: [] },
    elapsedTime: elapsed,
    numAlivePlayers: 2,
    isGame: 1,
  } as LogPlayerPosition;
}

function makeGameState(elapsed: number): LogGameStatePeriodic {
  return {
    _T: 'LogGameStatePeriodic',
    _D: new Date(elapsed * 1000).toISOString(),
    common: { isGame: 1 },
    gameState: {
      elapsedTime: elapsed,
      numAliveTeams: 2,
      numJoinPlayers: 2,
      numStartPlayers: 2,
      numAlivePlayers: 2,
      safetyZonePosition: { x: 408000, y: 408000, z: 0 },
      safetyZoneRadius: 300000,
      poisonGasWarningPosition: { x: 408000, y: 408000, z: 0 },
      poisonGasWarningRadius: 200000,
      redZonePosition: { x: 0, y: 0, z: 0 },
      redZoneRadius: 0,
      blackZonePosition: { x: 0, y: 0, z: 0 },
      blackZoneRadius: 0,
    },
  } as LogGameStatePeriodic;
}

describe('TelemetryProcessorService', () => {
  let service: TelemetryProcessorService;

  beforeEach(() => {
    service = new TelemetryProcessorService();
  });

  it('processes raw telemetry into ReplayData', () => {
    const events: TelemetryData = [
      {
        _T: 'LogMatchStart',
        _D: '2026-01-01T00:00:00Z',
        common: { isGame: 0 },
        mapName: 'Baltic_Main',
        weatherId: 'Clear',
        characters: [
          {
            name: 'Player1',
            teamId: 1,
            health: 100,
            location: { x: 100000, y: 100000, z: 0 },
            ranking: 0,
            accountId: 'acc1',
            zone: [],
          },
          {
            name: 'Player2',
            teamId: 2,
            health: 100,
            location: { x: 200000, y: 200000, z: 0 },
            ranking: 0,
            accountId: 'acc2',
            zone: [],
          },
        ],
        teamSize: 1,
        isCustomGame: false,
      } as LogMatchStart,
      makePosition('acc1', 'Player1', 1, 110000, 110000, 100, 5),
      makePosition('acc2', 'Player2', 2, 210000, 210000, 100, 5),
      makeGameState(5),
      makePosition('acc1', 'Player1', 1, 120000, 120000, 100, 10),
      makePosition('acc2', 'Player2', 2, 220000, 220000, 80, 10),
      makeGameState(10),
    ];

    const result = service.process(events, 'test-match-id');

    expect(result.matchId).toBe('test-match-id');
    expect(result.mapName).toBe('Baltic_Main');
    expect(result.mapDisplayName).toBe('Erangel');
    expect(result.ticks.length).toBeGreaterThanOrEqual(2);
    expect(result.ticks[0].players).toHaveLength(2);
    // Coordinates should be normalized
    expect(result.ticks[0].players[0].x).toBeGreaterThan(0);
    expect(result.ticks[0].players[0].x).toBeLessThan(1);
  });

  it('extracts kill events', () => {
    const events: TelemetryData = [
      {
        _T: 'LogMatchStart',
        _D: '2026-01-01T00:00:00Z',
        common: { isGame: 0 },
        mapName: 'Baltic_Main',
        weatherId: 'Clear',
        characters: [],
        teamSize: 1,
        isCustomGame: false,
      } as LogMatchStart,
      {
        _T: 'LogPlayerKillV2',
        _D: '2026-01-01T00:01:00Z',
        common: { isGame: 1 },
        killer: {
          name: 'Player1',
          teamId: 1,
          health: 80,
          location: { x: 100000, y: 100000, z: 0 },
          ranking: 0,
          accountId: 'acc1',
          zone: [],
        },
        victim: {
          name: 'Player2',
          teamId: 2,
          health: 0,
          location: { x: 105000, y: 105000, z: 0 },
          ranking: 0,
          accountId: 'acc2',
          zone: [],
        },
        finisher: null,
        killerDamageInfo: {
          damageReason: 'ArmShot',
          damageTypeCategory: 'Damage_Gun',
          damageCauserName: 'WeapM416_C',
        },
        finishDamageInfo: null,
        isSuicide: false,
        assists_AccountId: [],
        distance: 5000,
      } as unknown as LogPlayerKillV2,
    ];

    const result = service.process(events, 'test-match-id');
    expect(result.kills).toHaveLength(1);
    expect(result.kills[0].killerName).toBe('Player1');
    expect(result.kills[0].victimName).toBe('Player2');
    expect(result.kills[0].weaponName).toContain('M416');
    expect(result.kills[0].distance).toBe(50);
    expect(result.kills[0].assistantAccountIds).toEqual([]);
  });

  it('falls back to coordinate distance when telemetry distance is missing', () => {
    const events: TelemetryData = [
      {
        _T: 'LogMatchStart',
        _D: '2026-01-01T00:00:00Z',
        common: { isGame: 0 },
        mapName: 'Baltic_Main',
        weatherId: 'Clear',
        characters: [],
        teamSize: 1,
        isCustomGame: false,
      } as LogMatchStart,
      {
        _T: 'LogPlayerKillV2',
        _D: '2026-01-01T00:01:00Z',
        common: { isGame: 1 },
        killer: {
          name: 'Player1',
          teamId: 1,
          health: 80,
          location: { x: 100000, y: 100000, z: 0 },
          ranking: 0,
          accountId: 'acc1',
          zone: [],
        },
        victim: {
          name: 'Player2',
          teamId: 2,
          health: 0,
          location: { x: 105000, y: 100000, z: 0 },
          ranking: 0,
          accountId: 'acc2',
          zone: [],
        },
        finisher: null,
        killerDamageInfo: {
          damageReason: 'ArmShot',
          damageTypeCategory: 'Damage_Gun',
          damageCauserName: 'WeapM416_C',
        },
        finishDamageInfo: null,
        isSuicide: false,
        assists_AccountId: [],
      } as unknown as LogPlayerKillV2,
    ];

    const result = service.process(events, 'test-match-id');
    expect(result.kills).toHaveLength(1);
    expect(result.kills[0].distance).toBe(50);
  });

  it('extracts assists and accumulates damage dealt', () => {
    const events: TelemetryData = [
      {
        _T: 'LogMatchStart',
        _D: '2026-01-01T00:00:00Z',
        common: { isGame: 0 },
        mapName: 'Baltic_Main',
        weatherId: 'Clear',
        characters: [
          {
            name: 'Player1',
            teamId: 1,
            health: 100,
            location: { x: 100000, y: 100000, z: 0 },
            ranking: 0,
            accountId: 'acc1',
            zone: [],
          },
          {
            name: 'Player2',
            teamId: 2,
            health: 100,
            location: { x: 105000, y: 100000, z: 0 },
            ranking: 0,
            accountId: 'acc2',
            zone: [],
          },
          {
            name: 'Player3',
            teamId: 1,
            health: 100,
            location: { x: 102000, y: 100000, z: 0 },
            ranking: 0,
            accountId: 'acc3',
            zone: [],
          },
        ],
        teamSize: 1,
        isCustomGame: false,
      } as LogMatchStart,
      {
        _T: 'LogPlayerTakeDamage',
        _D: '2026-01-01T00:00:20Z',
        common: { isGame: 1 },
        attacker: { accountId: 'acc1' },
        victim: { accountId: 'acc2' },
        damage: 37.5,
      } as unknown as TelemetryData[number],
      {
        _T: 'LogPlayerKillV2',
        _D: '2026-01-01T00:01:00Z',
        common: { isGame: 1 },
        killer: {
          name: 'Player1',
          teamId: 1,
          health: 80,
          location: { x: 100000, y: 100000, z: 0 },
          ranking: 0,
          accountId: 'acc1',
          zone: [],
        },
        victim: {
          name: 'Player2',
          teamId: 2,
          health: 0,
          location: { x: 105000, y: 100000, z: 0 },
          ranking: 0,
          accountId: 'acc2',
          zone: [],
        },
        finisher: null,
        killerDamageInfo: {
          damageReason: 'ArmShot',
          damageTypeCategory: 'Damage_Gun',
          damageCauserName: 'WeapM416_C',
        },
        finishDamageInfo: null,
        isSuicide: false,
        assists_AccountId: ['acc3'],
      } as unknown as LogPlayerKillV2,
    ];

    const result = service.process(events, 'test-match-id');

    expect(result.damageEvents).toHaveLength(1);
    expect(result.damageEvents[0].attackerAccountId).toBe('acc1');
    expect(result.damageEvents[0].damage).toBe(37.5);
    expect(result.kills[0].assistantAccountIds).toEqual(['acc3']);

    const p1 = result.players.find((p) => p.accountId === 'acc1');
    const p3 = result.players.find((p) => p.accountId === 'acc3');
    expect(p1?.damageDealt).toBe(38);
    expect(p3?.assists).toBe(1);
  });
});
