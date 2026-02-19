# 2D PUBG Replay Viewer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 2D PUBG match replay viewer with military/tactical aesthetic, featuring canvas-based replay, player stats, zone overlays, kill feed, and multi-match heatmaps.

**Architecture:** Nx monorepo with Angular 21.x frontend (standalone components, signals), NestJS 11.x backend wrapping the PUBG API via `@j03fr0st/pubg-ts`, and a framework-agnostic Pixi.js v8 replay engine library. The backend pre-processes raw telemetry (~10MB JSON) into compact 5-second tick frames, reducing client payload by ~90%.

**Tech Stack:** Nx 22.5.1, Angular 21.1.5 (signals, standalone), NestJS 11.1.x, Pixi.js 8.16.0, pixi-viewport 6.0.3, Tailwind CSS 4.2.0, TanStack Query Angular 5.90.x, @j03fr0st/pubg-ts 1.0.10, cache-manager 7.x, @nestjs/cache-manager 3.x

**Design Doc:** `docs/plans/2026-02-19-pubg-replay-design.md`

**Key Research Notes:**
- Using `@j03fr0st/pubg-ts` (v1.0.10, published 3 months ago) — actively maintained, service-based architecture with full TypeScript types, built-in rate limiting, caching, and a dedicated `client.telemetry.getTelemetryData(url)` method. API: `new PubgClient({ apiKey, shard })` → `client.players`, `client.matches`, `client.seasons`, `client.telemetry`. Telemetry event payloads are typed but may need augmentation; we define supplemental types as needed.
- Pixi.js v8: async `app.init()`, `app.canvas` (not `app.view`), Graphics API is shape-first then fill/stroke, Ticker callback receives `(ticker)` not `(delta)`. Latest stable: **8.16.0**.
- pixi-viewport v6.0.3 targets pixi.js v8+. Pass `events: app.renderer.events` to the Viewport constructor (not `interaction`).
- PUBG telemetry coordinates are in **centimeters**, origin top-left. Erangel/Miramar = 816,000 cm range. Normalize: `x / mapSize`.
- PUBG API rate limit: 10 req/min (match & telemetry endpoints exempt).
- `cache-manager` v7 (latest: 7.2.8) is TypeScript-native; **do not install `@types/cache-manager`** — the package ships its own types. v7 breaking change vs v5: cache misses return `undefined` instead of `null`. The `@nestjs/cache-manager` v3 abstraction handles this transparently.
- NestJS 11.x requires Node.js 20+ and uses Express 5 by default.
- `@tanstack/angular-query-experimental` remains experimental at 5.90.x — lock to a patch version in production.

---

## Phase 1: Nx Workspace & Project Scaffold

### Task 1.1: Create Nx Workspace

**Files:**
- Create: entire workspace at project root

**Step 1: Initialize Nx integrated monorepo**

```bash
npx create-nx-workspace@latest pubg-replay --preset=apps --nxCloud=skip
```

When prompted, select npm as package manager. This creates the workspace with `apps/` and `libs/` directories.

**Step 2: Verify scaffold**

```bash
cd pubg-replay
ls apps/ libs/
```

Expected: both directories exist (may have `.gitkeep` files).

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold Nx integrated monorepo"
```

---

### Task 1.2: Add Angular Client App

**Step 1: Install Angular plugin**

```bash
npx nx add @nx/angular
```

**Step 2: Generate Angular app**

```bash
npx nx g @nx/angular:application client --directory=apps/client --style=scss --routing=true --e2eTestRunner=none --bundler=esbuild --prefix=pubg
```

**Step 3: Verify app serves**

```bash
npx nx serve client
```

Expected: Angular welcome page at `http://localhost:4200`.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Angular client app"
```

---

### Task 1.3: Add NestJS API App

**Step 1: Install Nest plugin**

```bash
npx nx add @nx/nest
```

**Step 2: Generate NestJS app with proxy to Angular**

```bash
npx nx g @nx/nest:application api --directory=apps/api --frontendProject=client
```

**Step 3: Verify API serves**

```bash
npx nx serve api
```

Expected: NestJS running at `http://localhost:3000/api` with hello world response.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add NestJS API app"
```

---

### Task 1.4: Create Shared Libraries

**Step 1: Generate shared types library**

```bash
npx nx g @nx/js:library shared-types --directory=libs/shared/types --unitTestRunner=vitest --bundler=none
```

**Step 2: Generate shared utils library**

```bash
npx nx g @nx/js:library shared-utils --directory=libs/shared/utils --unitTestRunner=vitest --bundler=none
```

**Step 3: Generate replay-engine library**

```bash
npx nx g @nx/js:library replay-engine --directory=libs/replay-engine --unitTestRunner=vitest --bundler=none
```

**Step 4: Verify imports resolve**

Check `tsconfig.base.json` has path aliases for all three libs. Confirm they look like:
```json
{
  "@pubg-replay/shared-types": ["libs/shared/types/src/index.ts"],
  "@pubg-replay/shared-utils": ["libs/shared/utils/src/index.ts"],
  "@pubg-replay/replay-engine": ["libs/replay-engine/src/index.ts"]
}
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add shared-types, shared-utils, and replay-engine libs"
```

---

### Task 1.5: Configure Tailwind CSS v4

**Step 1: Install Tailwind**

```bash
npm install tailwindcss @tailwindcss/postcss
```

**Step 2: Create PostCSS config**

Create `apps/client/.postcssrc.json`:
```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

**Step 3: Update styles.scss**

Replace contents of `apps/client/src/styles.scss`:
```scss
@import "tailwindcss";
```

**Step 4: Add military theme CSS custom properties**

Create `apps/client/src/styles/theme.css`:
```css
@theme {
  --color-bg: #0d1a0d;
  --color-surface: #1a2a1a;
  --color-border: #2a3a2a;
  --color-text-primary: #c8d8b0;
  --color-text-secondary: #6a7a5a;
  --color-accent: #7a9a4a;
  --color-danger: #c84a2a;
  --color-friendly: #d4a832;
}
```

Update `apps/client/src/styles.scss`:
```scss
@import "tailwindcss";
@import "./styles/theme.css";
```

**Step 5: Install fonts**

```bash
npm install @fontsource/ibm-plex-mono@5.2.7 @fontsource/inter@5.2.8
```

Add to `apps/client/src/styles.scss` (before tailwind import):
```scss
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/700.css";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";
@import "tailwindcss";
@import "./styles/theme.css";
```

**Step 6: Verify Tailwind works**

Add a test class to `app.component.html`:
```html
<div class="bg-[var(--color-bg)] text-[var(--color-text-primary)] p-4">Tailwind works</div>
```

Run `npx nx serve client` — should see styled text.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: configure Tailwind CSS v4 with military theme"
```

---

### Task 1.6: Install Core Dependencies

**Step 1: Install backend dependencies**

```bash
npm install @j03fr0st/pubg-ts@1.0.10 @nestjs/cache-manager@3.1.0 cache-manager@7.2.8
```

**Step 2: Install frontend dependencies**

```bash
npm install pixi.js@8.16.0 pixi-viewport@6.0.3 @tanstack/angular-query-experimental@5.90.25
```

> **Note:** Do **not** install `@types/cache-manager` — `cache-manager` v6+ ships its own TypeScript types natively. Fonts (`@fontsource/ibm-plex-mono`, `@fontsource/inter`) are already installed in Task 1.5 Step 5.

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: install @j03fr0st/pubg-ts, pixi.js, tanstack-query dependencies"
```

---

## Phase 2: Shared Types & Utilities

### Task 2.1: Define PUBG Telemetry Types

**Files:**
- Create: `libs/shared/types/src/lib/telemetry.ts`
- Modify: `libs/shared/types/src/index.ts`

**Step 1: Write telemetry type definitions**

Create `libs/shared/types/src/lib/telemetry.ts`:

```typescript
/**
 * Re-export PUBG telemetry types from @j03fr0st/pubg-ts.
 * The library provides 45+ typed telemetry events — we re-export
 * the ones we need and add our own replay-specific DTOs.
 *
 * Key type notes:
 * - _D (timestamp) is optional (`string | undefined`)
 * - gameState on LogGameStatePeriodic is optional
 * - itemPackage on LogCarePackageLand is optional
 * - killerDamageInfo is FlexibleDamageInfo = DamageInfo | DamageInfo[] | null | undefined
 *   → use DamageInfoUtils.getFirst() to safely extract
 * - Character has zone[] array, no vehicle field on LogPlayerPosition
 * - distance is directly on LogPlayerKillV2, not inside DamageInfo
 */

// Re-export telemetry types from pubg-ts
export type {
  TelemetryEvent,
  TelemetryData,
  Character,
  Location,
  GameState,
  ItemPackage,
  Item,
  Vehicle,
  DamageInfo,
  FlexibleDamageInfo,
  Common,
  LogPlayerPosition,
  LogPlayerKillV2,
  LogGameStatePeriodic,
  LogCarePackageLand,
  LogMatchStart,
  LogMatchEnd,
} from '@j03fr0st/pubg-ts';

// Re-export utilities
export { DamageInfoUtils } from '@j03fr0st/pubg-ts';

// Re-export match/player response types
export type {
  Player,
  PlayersResponse,
  Match,
  MatchResponse,
  Roster,
  Participant,
  Asset,
  Season,
  PlayerSeason,
} from '@j03fr0st/pubg-ts';
```

**Step 2: Export from barrel**

Update `libs/shared/types/src/index.ts`:
```typescript
export * from './lib/telemetry';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: re-export PUBG telemetry types from @j03fr0st/pubg-ts"
```

---

### Task 2.2: Define Processed Frame Types (Client DTOs)

**Files:**
- Create: `libs/shared/types/src/lib/frames.ts`
- Modify: `libs/shared/types/src/index.ts`

**Step 1: Write frame type definitions**

These are the compact types the NestJS backend sends to the client.

Create `libs/shared/types/src/lib/frames.ts`:

```typescript
/** A single player's state at a given tick */
export interface PlayerFrame {
  accountId: string;
  name: string;
  teamId: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  health: number; // 0..100
  isAlive: boolean;
}

/** Zone state at a given tick */
export interface ZoneFrame {
  safeX: number; // normalized 0..1
  safeY: number;
  safeRadius: number; // normalized
  poisonX: number;
  poisonY: number;
  poisonRadius: number;
  redX: number;
  redY: number;
  redRadius: number;
}

/** A kill event */
export interface KillEvent {
  timestamp: number; // elapsed seconds
  killerAccountId: string | null;
  killerName: string | null;
  victimAccountId: string;
  victimName: string;
  weaponName: string;
  distance: number; // meters
  isSuicide: boolean;
  killerX: number;
  killerY: number;
  victimX: number;
  victimY: number;
}

/** Care package landing event */
export interface CarePackageEvent {
  timestamp: number;
  x: number;
  y: number;
}

/** A single tick of processed replay data (5-second intervals) */
export interface ReplayTick {
  elapsedTime: number; // seconds since match start
  players: PlayerFrame[];
  zone: ZoneFrame;
  alivePlayers: number;
}

/** Full processed replay payload sent to the client */
export interface ReplayData {
  matchId: string;
  mapName: string;
  mapDisplayName: string;
  mapSize: number; // coordinate range in cm (e.g. 816000)
  duration: number; // match duration in seconds
  teamSize: number;
  createdAt: string;
  ticks: ReplayTick[];
  kills: KillEvent[];
  carePackages: CarePackageEvent[];
  players: MatchPlayer[];
}

/** Player summary for the roster panel */
export interface MatchPlayer {
  accountId: string;
  name: string;
  teamId: number;
  kills: number;
  damageDealt: number;
  survivalTime: number;
  placement: number;
}
```

**Step 2: Export from barrel**

Add to `libs/shared/types/src/index.ts`:
```typescript
export * from './lib/frames';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: define processed replay frame types"
```

---

### Task 2.3: Define Player & Match API Types

**Files:**
- Create: `libs/shared/types/src/lib/api.ts`
- Modify: `libs/shared/types/src/index.ts`

**Step 1: Write API response types**

Create `libs/shared/types/src/lib/api.ts`:

```typescript
export type Platform = 'steam' | 'psn' | 'xbox' | 'kakao';

export interface PlayerSearchResult {
  accountId: string;
  name: string;
  platform: Platform;
  recentMatches: MatchSummary[];
}

export interface MatchSummary {
  matchId: string;
  mapName: string;
  mapDisplayName: string;
  gameMode: string;
  createdAt: string;
  duration: number;
  playerCount: number;
  placement: number;
  kills: number;
}

export interface SeasonInfo {
  id: string;
  isCurrentSeason: boolean;
  isOffseason: boolean;
}

export interface HeatmapRequest {
  accountId: string;
  matches?: number; // default 10, max 25
  season?: string;
  mode: 'movement' | 'deaths' | 'kills';
  mapName?: string;
}

export interface HeatmapData {
  mapName: string;
  mapDisplayName: string;
  gridWidth: number;
  gridHeight: number;
  /** Row-major normalized intensity values (0..1) */
  intensities: number[];
  matchCount: number;
}
```

**Step 2: Export from barrel**

Add to `libs/shared/types/src/index.ts`:
```typescript
export * from './lib/api';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: define player, match, and heatmap API types"
```

---

### Task 2.4: Map Coordinate Helpers

**Files:**
- Create: `libs/shared/utils/src/lib/map-helpers.ts`
- Create: `libs/shared/utils/src/lib/map-helpers.spec.ts`
- Modify: `libs/shared/utils/src/index.ts`

**Step 1: Write failing tests**

Create `libs/shared/utils/src/lib/map-helpers.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getMapSize,
  getMapDisplayName,
  normalizeCoord,
  telemetryToNormalized,
  MAP_DEFINITIONS,
} from './map-helpers';

describe('map-helpers', () => {
  it('returns correct size for Erangel', () => {
    expect(getMapSize('Baltic_Main')).toBe(816000);
  });

  it('returns correct size for Sanhok', () => {
    expect(getMapSize('Savage_Main')).toBe(408000);
  });

  it('returns correct display name', () => {
    expect(getMapDisplayName('Desert_Main')).toBe('Miramar');
  });

  it('returns unknown for unrecognized map', () => {
    expect(getMapDisplayName('Fake_Map')).toBe('Unknown');
  });

  it('normalizes coordinates to 0..1 range', () => {
    expect(normalizeCoord(408000, 816000)).toBeCloseTo(0.5);
    expect(normalizeCoord(0, 816000)).toBe(0);
    expect(normalizeCoord(816000, 816000)).toBe(1);
  });

  it('converts telemetry location to normalized x,y', () => {
    const result = telemetryToNormalized(
      { x: 408000, y: 204000, z: 0 },
      'Baltic_Main'
    );
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0.25);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx nx test shared-utils
```

Expected: FAIL — functions not defined.

**Step 3: Write implementation**

Create `libs/shared/utils/src/lib/map-helpers.ts`:

```typescript
import type { TelemetryLocation } from '@pubg-replay/shared-types';

export interface MapDefinition {
  internalName: string;
  displayName: string;
  size: number; // coordinate range in cm
}

export const MAP_DEFINITIONS: MapDefinition[] = [
  { internalName: 'Baltic_Main', displayName: 'Erangel', size: 816000 },
  { internalName: 'Erangel_Main', displayName: 'Erangel (Classic)', size: 816000 },
  { internalName: 'Desert_Main', displayName: 'Miramar', size: 816000 },
  { internalName: 'Tiger_Main', displayName: 'Taego', size: 816000 },
  { internalName: 'DihorOtok_Main', displayName: 'Vikendi', size: 816000 },
  { internalName: 'Kiki_Main', displayName: 'Deston', size: 816000 },
  { internalName: 'Savage_Main', displayName: 'Sanhok', size: 408000 },
  { internalName: 'Chimera_Main', displayName: 'Paramo', size: 306000 },
  { internalName: 'Summerland_Main', displayName: 'Karakin', size: 204000 },
  { internalName: 'Range_Main', displayName: 'Camp Jackal', size: 204000 },
  { internalName: 'Heaven_Main', displayName: 'Haven', size: 102000 },
  { internalName: 'Neon_Main', displayName: 'Rondo', size: 816000 },
];

export function getMapSize(mapName: string): number {
  return MAP_DEFINITIONS.find((m) => m.internalName === mapName)?.size ?? 816000;
}

export function getMapDisplayName(mapName: string): string {
  return MAP_DEFINITIONS.find((m) => m.internalName === mapName)?.displayName ?? 'Unknown';
}

export function normalizeCoord(value: number, mapSize: number): number {
  return value / mapSize;
}

export function telemetryToNormalized(
  location: TelemetryLocation,
  mapName: string
): { x: number; y: number } {
  const size = getMapSize(mapName);
  return {
    x: normalizeCoord(location.x, size),
    y: normalizeCoord(location.y, size),
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npx nx test shared-utils
```

Expected: all 6 tests PASS.

**Step 5: Export from barrel**

Update `libs/shared/utils/src/index.ts`:
```typescript
export * from './lib/map-helpers';
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add map coordinate helpers with tests"
```

---

### Task 2.5: Time Formatting Helpers

**Files:**
- Create: `libs/shared/utils/src/lib/time-helpers.ts`
- Create: `libs/shared/utils/src/lib/time-helpers.spec.ts`
- Modify: `libs/shared/utils/src/index.ts`

**Step 1: Write failing tests**

Create `libs/shared/utils/src/lib/time-helpers.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatElapsedTime, formatTimestamp } from './time-helpers';

describe('time-helpers', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
    expect(formatElapsedTime(95)).toBe('01:35');
    expect(formatElapsedTime(3661)).toBe('61:01');
  });

  it('formats ISO timestamp as short date/time', () => {
    const result = formatTimestamp('2026-02-11T23:02:00Z');
    expect(result).toContain('Feb 11');
    expect(result).toContain('23:02');
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npx nx test shared-utils
```

**Step 3: Write implementation**

Create `libs/shared/utils/src/lib/time-helpers.ts`:

```typescript
export function formatElapsedTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = date.getUTCDate();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${month} ${day} ${hours}:${minutes}`;
}
```

**Step 4: Run tests — expect PASS**

```bash
npx nx test shared-utils
```

**Step 5: Export from barrel**

Add to `libs/shared/utils/src/index.ts`:
```typescript
export * from './lib/time-helpers';
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add time formatting helpers with tests"
```

---

## Phase 3: NestJS Backend Core

### Task 3.1: Configure PUBG API Service

**Files:**
- Create: `apps/api/src/pubg/pubg.module.ts`
- Create: `apps/api/src/pubg/pubg.service.ts`
- Create: `apps/api/src/pubg/pubg.service.spec.ts`

**Step 1: Create PUBG module directory**

```bash
mkdir -p apps/api/src/pubg
```

**Step 2: Write the service test**

Create `apps/api/src/pubg/pubg.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PubgService } from './pubg.service';
import { ConfigService } from '@nestjs/config';

describe('PubgService', () => {
  let service: PubgService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PubgService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => key === 'PUBG_API_KEY' ? 'test-key' : undefined },
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
```

**Step 3: Run test — expect FAIL**

```bash
npx nx test api --testPathPattern=pubg.service
```

**Step 4: Write implementation**

Create `apps/api/src/pubg/pubg.service.ts`:

```typescript
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
```

Create `apps/api/src/pubg/pubg.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { PubgService } from './pubg.service';

@Global()
@Module({
  providers: [PubgService],
  exports: [PubgService],
})
export class PubgModule {}
```

**Step 5: Install @nestjs/config**

```bash
npm install @nestjs/config
```

**Step 6: Create `.env.example`**

Create `.env.example` at project root:
```
PUBG_API_KEY=your-pubg-api-key-here
```

**Step 7: Register ConfigModule in app.module**

Update `apps/api/src/app/app.module.ts` to import `ConfigModule.forRoot()` and `PubgModule`.

**Step 8: Run test — expect PASS**

```bash
npx nx test api --testPathPattern=pubg.service
```

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: add PUBG API service with @j03fr0st/pubg-ts client"
```

---

### Task 3.2: Telemetry Processing Service

**Files:**
- Create: `apps/api/src/telemetry/telemetry.module.ts`
- Create: `apps/api/src/telemetry/telemetry-processor.service.ts`
- Create: `apps/api/src/telemetry/telemetry-processor.service.spec.ts`

This is the core backend logic: transforming raw telemetry (~10MB) into compact `ReplayData`.

**Step 1: Write failing test with fixture data**

Create `apps/api/src/telemetry/telemetry-processor.service.spec.ts`:

```typescript
import { TelemetryProcessorService } from './telemetry-processor.service';
import type {
  LogMatchStart,
  LogPlayerPosition,
  LogGameStatePeriodic,
  LogPlayerKillV2,
  LogCarePackageLand,
  LogMatchEnd,
  TelemetryData,
} from '@pubg-replay/shared-types';

function makePosition(
  accountId: string,
  name: string,
  teamId: number,
  x: number,
  y: number,
  health: number,
  elapsed: number
): LogPlayerPosition {
  return {
    _T: 'LogPlayerPosition',
    _D: new Date(elapsed * 1000).toISOString(),
    common: { isGame: 1 },
    character: { name, teamId, health, location: { x, y, z: 0 }, ranking: 0, accountId, zone: [] },
    elapsedTime: elapsed,
    numAlivePlayers: 2,
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
          { name: 'Player1', teamId: 1, health: 100, location: { x: 100000, y: 100000, z: 0 }, ranking: 0, accountId: 'acc1', zone: [] },
          { name: 'Player2', teamId: 2, health: 100, location: { x: 200000, y: 200000, z: 0 }, ranking: 0, accountId: 'acc2', zone: [] },
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
        killer: { name: 'Player1', teamId: 1, health: 80, location: { x: 100000, y: 100000, z: 0 }, ranking: 0, accountId: 'acc1', zone: [] },
        victim: { name: 'Player2', teamId: 2, health: 0, location: { x: 105000, y: 105000, z: 0 }, ranking: 0, accountId: 'acc2', zone: [] },
        finisher: null,
        killerDamageInfo: { damageReason: 'ArmShot', damageTypeCategory: 'Damage_Gun', damageCauserName: 'WeapM416_C' },
        finishDamageInfo: null,
        isSuicide: false,
        assists_AccountId: [],
        distance: 5000,
      } as LogPlayerKillV2,
    ];

    const result = service.process(events, 'test-match-id');
    expect(result.kills).toHaveLength(1);
    expect(result.kills[0].killerName).toBe('Player1');
    expect(result.kills[0].victimName).toBe('Player2');
    expect(result.kills[0].weaponName).toContain('M416');
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx nx test api --testPathPattern=telemetry-processor
```

**Step 3: Write implementation**

Create `apps/api/src/telemetry/telemetry-processor.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type {
  TelemetryData,
  LogMatchStart,
  LogPlayerPosition,
  LogGameStatePeriodic,
  LogPlayerKillV2,
  LogCarePackageLand,
} from '@pubg-replay/shared-types';
import { DamageInfoUtils } from '@pubg-replay/shared-types';
import type {
  ReplayData,
  ReplayTick,
  PlayerFrame,
  ZoneFrame,
  KillEvent,
  CarePackageEvent,
  MatchPlayer,
} from '@pubg-replay/shared-types';
import { getMapSize, getMapDisplayName, normalizeCoord } from '@pubg-replay/shared-utils';
import { assetManager } from '@j03fr0st/pubg-ts';

const TICK_INTERVAL = 5; // seconds

/** Resolve weapon display name using asset manager */
function resolveWeaponName(damageCauserName: string): string {
  return assetManager.getDamageCauserName(damageCauserName) ?? damageCauserName;
}

@Injectable()
export class TelemetryProcessorService {
  process(events: TelemetryData, matchId: string): ReplayData {
    const matchStart = events.find((e) => e._T === 'LogMatchStart') as LogMatchStart | undefined;
    const mapName = matchStart?.mapName ?? 'Baltic_Main';
    const mapSize = getMapSize(mapName);
    const norm = (v: number) => normalizeCoord(v, mapSize);

    // Collect position events grouped by tick (5-second buckets)
    const positionsByTick = new Map<number, LogPlayerPosition[]>();
    const gameStatesByTick = new Map<number, LogGameStatePeriodic>();
    const kills: KillEvent[] = [];
    const carePackages: CarePackageEvent[] = [];
    const playerKills = new Map<string, number>();
    let maxElapsed = 0;

    for (const event of events) {
      switch (event._T) {
        case 'LogPlayerPosition': {
          const e = event as LogPlayerPosition;
          const tick = Math.round(e.elapsedTime / TICK_INTERVAL) * TICK_INTERVAL;
          maxElapsed = Math.max(maxElapsed, e.elapsedTime);
          if (!positionsByTick.has(tick)) positionsByTick.set(tick, []);
          positionsByTick.get(tick)!.push(e);
          break;
        }
        case 'LogGameStatePeriodic': {
          const e = event as LogGameStatePeriodic;
          if (!e.gameState) break; // gameState is optional
          const tick = Math.round(e.gameState.elapsedTime / TICK_INTERVAL) * TICK_INTERVAL;
          gameStatesByTick.set(tick, e);
          break;
        }
        case 'LogPlayerKillV2': {
          const e = event as LogPlayerKillV2;
          const timestamp = e.common.isGame > 0
            ? (new Date(e._D!).getTime() - new Date(events[0]._D!).getTime()) / 1000
            : 0;
          const damageInfo = DamageInfoUtils.getFirst(e.killerDamageInfo);
          kills.push({
            timestamp,
            killerAccountId: e.killer?.accountId ?? null,
            killerName: e.killer?.name ?? null,
            victimAccountId: e.victim.accountId,
            victimName: e.victim.name,
            weaponName: damageInfo ? resolveWeaponName(damageInfo.damageCauserName) : 'Unknown',
            distance: Math.round((e.distance ?? 0) / 100),
            isSuicide: e.isSuicide,
            killerX: e.killer ? norm(e.killer.location.x) : 0,
            killerY: e.killer ? norm(e.killer.location.y) : 0,
            victimX: norm(e.victim.location.x),
            victimY: norm(e.victim.location.y),
          });
          if (e.killer) {
            playerKills.set(e.killer.accountId, (playerKills.get(e.killer.accountId) ?? 0) + 1);
          }
          break;
        }
        case 'LogCarePackageLand': {
          const e = event as LogCarePackageLand;
          if (!e.itemPackage) break; // itemPackage is optional
          carePackages.push({
            timestamp: (new Date(e._D!).getTime() - new Date(events[0]._D!).getTime()) / 1000,
            x: norm(e.itemPackage.location.x),
            y: norm(e.itemPackage.location.y),
          });
          break;
        }
      }
    }

    // Build ticks
    const deadPlayers = new Set<string>();
    for (const kill of kills) {
      deadPlayers.add(kill.victimAccountId); // track deaths across ticks below
    }

    const killTimestamps = new Map<string, number>();
    for (const kill of kills) {
      killTimestamps.set(kill.victimAccountId, kill.timestamp);
    }

    const sortedTickTimes = [...positionsByTick.keys()].sort((a, b) => a - b);
    const ticks: ReplayTick[] = [];

    for (const tickTime of sortedTickTimes) {
      const positions = positionsByTick.get(tickTime) ?? [];
      const gameState = gameStatesByTick.get(tickTime);

      // Deduplicate: take last position per player per tick
      const playerMap = new Map<string, LogPlayerPosition>();
      for (const pos of positions) {
        playerMap.set(pos.character.accountId, pos);
      }

      const players: PlayerFrame[] = [...playerMap.values()].map((pos) => {
        const deathTime = killTimestamps.get(pos.character.accountId);
        const isAlive = deathTime === undefined || deathTime > tickTime;
        return {
          accountId: pos.character.accountId,
          name: pos.character.name,
          teamId: pos.character.teamId,
          x: norm(pos.character.location.x),
          y: norm(pos.character.location.y),
          health: isAlive ? pos.character.health : 0,
          isAlive,
        };
      });

      const defaultZone: ZoneFrame = {
        safeX: 0.5, safeY: 0.5, safeRadius: 1,
        poisonX: 0.5, poisonY: 0.5, poisonRadius: 1,
        redX: 0, redY: 0, redRadius: 0,
      };

      const zone: ZoneFrame = gameState
        ? {
            safeX: norm(gameState.gameState.safetyZonePosition.x),
            safeY: norm(gameState.gameState.safetyZonePosition.y),
            safeRadius: normalizeCoord(gameState.gameState.safetyZoneRadius, mapSize),
            poisonX: norm(gameState.gameState.poisonGasWarningPosition.x),
            poisonY: norm(gameState.gameState.poisonGasWarningPosition.y),
            poisonRadius: normalizeCoord(gameState.gameState.poisonGasWarningRadius, mapSize),
            redX: norm(gameState.gameState.redZonePosition.x),
            redY: norm(gameState.gameState.redZonePosition.y),
            redRadius: normalizeCoord(gameState.gameState.redZoneRadius, mapSize),
          }
        : defaultZone;

      ticks.push({
        elapsedTime: tickTime,
        players,
        zone,
        alivePlayers: gameState?.gameState.numAlivePlayers ?? players.filter((p) => p.isAlive).length,
      });
    }

    // Build player summaries from LogMatchStart characters + kill data
    const characters = matchStart?.characters ?? [];
    const matchPlayers: MatchPlayer[] = characters.map((c) => ({
      accountId: c.accountId,
      name: c.name,
      teamId: c.teamId,
      kills: playerKills.get(c.accountId) ?? 0,
      damageDealt: 0, // not available from telemetry alone
      survivalTime: killTimestamps.get(c.accountId) ?? maxElapsed,
      placement: 0, // set from match data, not telemetry
    }));

    return {
      matchId,
      mapName,
      mapDisplayName: getMapDisplayName(mapName),
      mapSize,
      duration: maxElapsed,
      teamSize: matchStart?.teamSize ?? 1,
      createdAt: matchStart?._D ?? matchStart?.common?.createdAt ?? '',
      ticks,
      kills,
      carePackages,
      players: matchPlayers,
    };
  }
}
```

Create `apps/api/src/telemetry/telemetry.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TelemetryProcessorService } from './telemetry-processor.service';

@Module({
  providers: [TelemetryProcessorService],
  exports: [TelemetryProcessorService],
})
export class TelemetryModule {}
```

**Step 4: Run tests — expect PASS**

```bash
npx nx test api --testPathPattern=telemetry-processor
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add telemetry processor service with tests"
```

---

### Task 3.3: Matches Controller & Caching

**Files:**
- Create: `apps/api/src/matches/matches.module.ts`
- Create: `apps/api/src/matches/matches.controller.ts`
- Create: `apps/api/src/matches/matches.service.ts`
- Create: `apps/api/src/matches/matches.controller.spec.ts`

**Step 1: Write controller test**

Create `apps/api/src/matches/matches.controller.spec.ts`:

```typescript
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
```

**Step 2: Run test — expect FAIL**

```bash
npx nx test api --testPathPattern=matches.controller
```

**Step 3: Write implementation**

Create `apps/api/src/matches/matches.service.ts`:

```typescript
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
```

Create `apps/api/src/matches/matches.controller.ts`:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get(':matchId')
  async getMatch(@Param('matchId') matchId: string) {
    return this.matchesService.getMatch(matchId);
  }

  @Get(':matchId/telemetry')
  async getTelemetry(@Param('matchId') matchId: string) {
    return this.matchesService.getReplayData(matchId);
  }
}
```

Create `apps/api/src/matches/matches.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [TelemetryModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
```

**Step 4: Register in app.module**

Add `MatchesModule` to the imports in `apps/api/src/app/app.module.ts`.

**Step 5: Run tests — expect PASS**

```bash
npx nx test api --testPathPattern=matches.controller
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add matches controller with telemetry endpoint"
```

---

### Task 3.4: Players Controller

**Files:**
- Create: `apps/api/src/players/players.module.ts`
- Create: `apps/api/src/players/players.controller.ts`
- Create: `apps/api/src/players/players.service.ts`

**Step 1: Write implementation**

Create `apps/api/src/players/players.service.ts`:

```typescript
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
```

Create `apps/api/src/players/players.controller.ts`:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { PlayersService } from './players.service';
import type { Platform } from '@pubg-replay/shared-types';

@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Get(':platform/:name')
  async searchPlayer(
    @Param('platform') platform: Platform,
    @Param('name') name: string,
  ) {
    return this.playersService.searchPlayer(platform, name);
  }
}
```

Create `apps/api/src/players/players.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
```

**Step 2: Register in app.module**

Add `PlayersModule` to imports in `apps/api/src/app/app.module.ts`.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add players controller with search endpoint"
```

---

## Phase 4: Replay Engine (Pixi.js v8)

### Task 4.1: Engine Core — Application & Stage Setup

**Files:**
- Create: `libs/replay-engine/src/lib/engine.ts`
- Create: `libs/replay-engine/src/lib/engine.spec.ts`
- Modify: `libs/replay-engine/src/index.ts`

**Step 1: Write test**

Create `libs/replay-engine/src/lib/engine.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReplayEngine } from './engine';

// Mock pixi.js since it requires WebGL context
vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    canvas: document.createElement('canvas'),
    stage: { addChild: vi.fn() },
    ticker: { add: vi.fn() },
    destroy: vi.fn(),
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChildren: vi.fn(),
    label: '',
    children: [],
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    position: { set: vi.fn() },
    visible: true,
    alpha: 1,
  })),
}));

describe('ReplayEngine', () => {
  it('creates and initializes', async () => {
    const engine = new ReplayEngine();
    const container = document.createElement('div');
    await engine.init(container, 800, 600);
    expect(engine.getCanvas()).toBeInstanceOf(HTMLCanvasElement);
  });

  it('destroys cleanly', async () => {
    const engine = new ReplayEngine();
    const container = document.createElement('div');
    await engine.init(container, 800, 600);
    engine.destroy();
    // Should not throw
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx nx test replay-engine
```

**Step 3: Write implementation**

Create `libs/replay-engine/src/lib/engine.ts`:

```typescript
import { Application, Container } from 'pixi.js';
import type { ReplayData, ReplayTick } from '@pubg-replay/shared-types';

export class ReplayEngine {
  private app!: Application;
  private mapLayer!: Container;
  private zoneLayer!: Container;
  private carePackageLayer!: Container;
  private playerLayer!: Container;
  private eventLayer!: Container;

  async init(container: HTMLElement, width: number, height: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width,
      height,
      backgroundColor: 0x0d1a0d,
      antialias: true,
    });
    container.appendChild(this.app.canvas);

    // Build layer stack
    this.mapLayer = new Container();
    this.mapLayer.label = 'map';

    this.zoneLayer = new Container();
    this.zoneLayer.label = 'zones';

    this.carePackageLayer = new Container();
    this.carePackageLayer.label = 'carePackages';

    this.playerLayer = new Container();
    this.playerLayer.label = 'players';

    this.eventLayer = new Container();
    this.eventLayer.label = 'events';

    this.app.stage.addChild(this.mapLayer);
    this.app.stage.addChild(this.zoneLayer);
    this.app.stage.addChild(this.carePackageLayer);
    this.app.stage.addChild(this.playerLayer);
    this.app.stage.addChild(this.eventLayer);
  }

  getCanvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  getApp(): Application {
    return this.app;
  }

  getPlayerLayer(): Container {
    return this.playerLayer;
  }

  getZoneLayer(): Container {
    return this.zoneLayer;
  }

  getEventLayer(): Container {
    return this.eventLayer;
  }

  getCarePackageLayer(): Container {
    return this.carePackageLayer;
  }

  getMapLayer(): Container {
    return this.mapLayer;
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
```

**Step 4: Run tests — expect PASS**

```bash
npx nx test replay-engine
```

**Step 5: Export from barrel**

Update `libs/replay-engine/src/index.ts`:
```typescript
export { ReplayEngine } from './lib/engine';
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add replay engine core with layer stack"
```

---

### Task 4.2: Player Renderer

**Files:**
- Create: `libs/replay-engine/src/lib/renderers/player-renderer.ts`
- Modify: `libs/replay-engine/src/index.ts`

**Step 1: Write the player dot renderer**

Create `libs/replay-engine/src/lib/renderers/player-renderer.ts`:

```typescript
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { PlayerFrame } from '@pubg-replay/shared-types';

const COLORS = {
  friendly: 0xd4a832,   // amber
  enemy: 0x6a7a5a,      // olive drab
  highlighted: 0x7aff4a, // bright green
  dead: 0xc84a2a,       // muted red
};

const DOT_RADIUS = 4;

interface PlayerDot {
  graphics: Graphics;
  label: Text;
  accountId: string;
}

export class PlayerRenderer {
  private dots: Map<string, PlayerDot> = new Map();
  private container: Container;
  private highlightedAccountId: string | null = null;
  private friendlyTeamId: number | null = null;

  constructor(container: Container) {
    this.container = container;
  }

  setHighlightedPlayer(accountId: string | null): void {
    this.highlightedAccountId = accountId;
  }

  setFriendlyTeam(teamId: number | null): void {
    this.friendlyTeamId = teamId;
  }

  update(players: PlayerFrame[], canvasWidth: number, canvasHeight: number): void {
    const activeDots = new Set<string>();

    for (const player of players) {
      activeDots.add(player.accountId);
      let dot = this.dots.get(player.accountId);

      if (!dot) {
        const graphics = new Graphics();
        const labelStyle = new TextStyle({
          fontFamily: 'IBM Plex Mono',
          fontSize: 9,
          fill: 0xc8d8b0,
        });
        const label = new Text({ text: player.name, style: labelStyle });
        label.anchor = { x: 0.5, y: 0 } as any;

        this.container.addChild(graphics);
        this.container.addChild(label);

        dot = { graphics, label, accountId: player.accountId };
        this.dots.set(player.accountId, dot);
      }

      const x = player.x * canvasWidth;
      const y = player.y * canvasHeight;

      // Determine color
      let color: number;
      if (!player.isAlive) {
        color = COLORS.dead;
      } else if (player.accountId === this.highlightedAccountId) {
        color = COLORS.highlighted;
      } else if (this.friendlyTeamId !== null && player.teamId === this.friendlyTeamId) {
        color = COLORS.friendly;
      } else {
        color = COLORS.enemy;
      }

      // Redraw dot
      dot.graphics.clear();
      if (player.isAlive) {
        dot.graphics.circle(0, 0, DOT_RADIUS).fill(color);
      } else {
        // Dead: X marker
        dot.graphics
          .moveTo(-3, -3).lineTo(3, 3).stroke({ width: 2, color: COLORS.dead })
          .moveTo(3, -3).lineTo(-3, 3).stroke({ width: 2, color: COLORS.dead });
      }

      dot.graphics.position.set(x, y);
      dot.label.position.set(x, y + DOT_RADIUS + 2);
      dot.label.visible = player.accountId === this.highlightedAccountId;
      dot.graphics.alpha = player.isAlive ? 1 : 0.4;
    }
  }

  clear(): void {
    this.container.removeChildren();
    this.dots.clear();
  }
}
```

**Step 2: Export**

Add to `libs/replay-engine/src/index.ts`:
```typescript
export { PlayerRenderer } from './lib/renderers/player-renderer';
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add player dot renderer with team colors"
```

---

### Task 4.3: Zone Renderer

**Files:**
- Create: `libs/replay-engine/src/lib/renderers/zone-renderer.ts`
- Modify: `libs/replay-engine/src/index.ts`

**Step 1: Write zone renderer**

Create `libs/replay-engine/src/lib/renderers/zone-renderer.ts`:

```typescript
import { Container, Graphics } from 'pixi.js';
import type { ZoneFrame } from '@pubg-replay/shared-types';

export class ZoneRenderer {
  private container: Container;
  private safeZone: Graphics;
  private poisonZone: Graphics;
  private redZone: Graphics;
  private visible = true;

  constructor(container: Container) {
    this.container = container;
    this.safeZone = new Graphics();
    this.poisonZone = new Graphics();
    this.redZone = new Graphics();
    this.container.addChild(this.poisonZone);
    this.container.addChild(this.redZone);
    this.container.addChild(this.safeZone);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.visible = visible;
  }

  update(zone: ZoneFrame, canvasWidth: number, canvasHeight: number): void {
    if (!this.visible) return;

    // Safe zone (white circle, dashed)
    this.safeZone.clear();
    this.safeZone
      .circle(
        zone.safeX * canvasWidth,
        zone.safeY * canvasHeight,
        zone.safeRadius * canvasWidth,
      )
      .stroke({ width: 2, color: 0xffffff, alpha: 0.6 });

    // Blue/poison zone
    this.poisonZone.clear();
    this.poisonZone
      .circle(
        zone.poisonX * canvasWidth,
        zone.poisonY * canvasHeight,
        zone.poisonRadius * canvasWidth,
      )
      .stroke({ width: 2, color: 0x4a8ac8, alpha: 0.8 });

    // Red zone
    if (zone.redRadius > 0) {
      this.redZone.clear();
      this.redZone
        .circle(
          zone.redX * canvasWidth,
          zone.redY * canvasHeight,
          zone.redRadius * canvasWidth,
        )
        .fill({ color: 0xc84a2a, alpha: 0.15 })
        .stroke({ width: 1, color: 0xc84a2a, alpha: 0.5 });
    } else {
      this.redZone.clear();
    }
  }
}
```

**Step 2: Export and commit**

Add to `libs/replay-engine/src/index.ts`:
```typescript
export { ZoneRenderer } from './lib/renderers/zone-renderer';
```

```bash
git add -A && git commit -m "feat: add zone ring renderer"
```

---

### Task 4.4: Kill Event Renderer (Tracer Lines)

**Files:**
- Create: `libs/replay-engine/src/lib/renderers/event-renderer.ts`
- Modify: `libs/replay-engine/src/index.ts`

**Step 1: Write event renderer**

Create `libs/replay-engine/src/lib/renderers/event-renderer.ts`:

```typescript
import { Container, Graphics } from 'pixi.js';
import type { KillEvent } from '@pubg-replay/shared-types';

interface ActiveTracer {
  graphics: Graphics;
  expiresAt: number; // elapsed time when tracer fades
}

const TRACER_DURATION = 3; // seconds visible

export class EventRenderer {
  private container: Container;
  private tracers: ActiveTracer[] = [];

  constructor(container: Container) {
    this.container = container;
  }

  /** Call when a kill happens during playback */
  addKillTracer(kill: KillEvent, canvasWidth: number, canvasHeight: number): void {
    if (!kill.killerAccountId || kill.isSuicide) return;

    const graphics = new Graphics();
    graphics
      .moveTo(kill.killerX * canvasWidth, kill.killerY * canvasHeight)
      .lineTo(kill.victimX * canvasWidth, kill.victimY * canvasHeight)
      .stroke({ width: 1, color: 0xc84a2a, alpha: 0.8 });

    this.container.addChild(graphics);
    this.tracers.push({
      graphics,
      expiresAt: kill.timestamp + TRACER_DURATION,
    });
  }

  /** Call each frame to fade/remove expired tracers */
  update(currentTime: number): void {
    this.tracers = this.tracers.filter((tracer) => {
      if (currentTime > tracer.expiresAt) {
        this.container.removeChild(tracer.graphics);
        tracer.graphics.destroy();
        return false;
      }
      // Fade out
      const remaining = tracer.expiresAt - currentTime;
      tracer.graphics.alpha = Math.min(1, remaining / TRACER_DURATION);
      return true;
    });
  }

  clear(): void {
    for (const tracer of this.tracers) {
      this.container.removeChild(tracer.graphics);
      tracer.graphics.destroy();
    }
    this.tracers = [];
  }
}
```

**Step 2: Export and commit**

Add to `libs/replay-engine/src/index.ts`:
```typescript
export { EventRenderer } from './lib/renderers/event-renderer';
```

```bash
git add -A && git commit -m "feat: add kill tracer renderer"
```

---

### Task 4.5: Playback Controller (Interpolation Loop)

**Files:**
- Create: `libs/replay-engine/src/lib/playback.ts`
- Create: `libs/replay-engine/src/lib/playback.spec.ts`
- Modify: `libs/replay-engine/src/index.ts`

**Step 1: Write test for interpolation logic**

Create `libs/replay-engine/src/lib/playback.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { interpolateTick } from './playback';
import type { ReplayTick, PlayerFrame, ZoneFrame } from '@pubg-replay/shared-types';

const defaultZone: ZoneFrame = {
  safeX: 0.5, safeY: 0.5, safeRadius: 0.5,
  poisonX: 0.5, poisonY: 0.5, poisonRadius: 0.6,
  redX: 0, redY: 0, redRadius: 0,
};

function makeTick(time: number, px: number, py: number): ReplayTick {
  return {
    elapsedTime: time,
    players: [{ accountId: 'p1', name: 'P1', teamId: 1, x: px, y: py, health: 100, isAlive: true }],
    zone: defaultZone,
    alivePlayers: 1,
  };
}

describe('interpolateTick', () => {
  it('returns exact tick when time matches', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(5, 1, 1)];
    const result = interpolateTick(ticks, 0);
    expect(result.players[0].x).toBe(0);
  });

  it('interpolates between ticks', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(10, 1, 1)];
    const result = interpolateTick(ticks, 5);
    expect(result.players[0].x).toBeCloseTo(0.5);
    expect(result.players[0].y).toBeCloseTo(0.5);
  });

  it('clamps to last tick beyond duration', () => {
    const ticks = [makeTick(0, 0, 0), makeTick(10, 1, 1)];
    const result = interpolateTick(ticks, 15);
    expect(result.players[0].x).toBe(1);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx nx test replay-engine
```

**Step 3: Write implementation**

Create `libs/replay-engine/src/lib/playback.ts`:

```typescript
import type { ReplayTick, PlayerFrame, ZoneFrame } from '@pubg-replay/shared-types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePlayers(a: PlayerFrame[], b: PlayerFrame[], t: number): PlayerFrame[] {
  const bMap = new Map(b.map((p) => [p.accountId, p]));
  return a.map((pa) => {
    const pb = bMap.get(pa.accountId);
    if (!pb) return pa;
    return {
      ...pa,
      x: lerp(pa.x, pb.x, t),
      y: lerp(pa.y, pb.y, t),
      health: lerp(pa.health, pb.health, t),
      isAlive: t < 0.5 ? pa.isAlive : pb.isAlive,
    };
  });
}

function interpolateZone(a: ZoneFrame, b: ZoneFrame, t: number): ZoneFrame {
  return {
    safeX: lerp(a.safeX, b.safeX, t),
    safeY: lerp(a.safeY, b.safeY, t),
    safeRadius: lerp(a.safeRadius, b.safeRadius, t),
    poisonX: lerp(a.poisonX, b.poisonX, t),
    poisonY: lerp(a.poisonY, b.poisonY, t),
    poisonRadius: lerp(a.poisonRadius, b.poisonRadius, t),
    redX: lerp(a.redX, b.redX, t),
    redY: lerp(a.redY, b.redY, t),
    redRadius: lerp(a.redRadius, b.redRadius, t),
  };
}

/** Find the interpolated tick state at a given elapsed time */
export function interpolateTick(ticks: ReplayTick[], time: number): ReplayTick {
  if (ticks.length === 0) {
    return { elapsedTime: time, players: [], zone: { safeX: 0.5, safeY: 0.5, safeRadius: 1, poisonX: 0.5, poisonY: 0.5, poisonRadius: 1, redX: 0, redY: 0, redRadius: 0 }, alivePlayers: 0 };
  }

  if (time <= ticks[0].elapsedTime) return ticks[0];
  if (time >= ticks[ticks.length - 1].elapsedTime) return ticks[ticks.length - 1];

  // Binary search for the surrounding ticks
  let lo = 0;
  let hi = ticks.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (ticks[mid].elapsedTime <= time) lo = mid;
    else hi = mid;
  }

  const a = ticks[lo];
  const b = ticks[hi];
  const range = b.elapsedTime - a.elapsedTime;
  const t = range > 0 ? (time - a.elapsedTime) / range : 0;

  return {
    elapsedTime: time,
    players: interpolatePlayers(a.players, b.players, t),
    zone: interpolateZone(a.zone, b.zone, t),
    alivePlayers: Math.round(lerp(a.alivePlayers, b.alivePlayers, t)),
  };
}
```

**Step 4: Run tests — expect PASS**

```bash
npx nx test replay-engine
```

**Step 5: Export and commit**

Add to `libs/replay-engine/src/index.ts`:
```typescript
export { interpolateTick } from './lib/playback';
```

```bash
git add -A && git commit -m "feat: add tick interpolation with binary search and lerp"
```

---

## Phase 5: Angular Replay Page

### Task 5.1: API Service

**Files:**
- Create: `apps/client/src/app/services/api.service.ts`

**Step 1: Write the Angular HTTP service**

Create `apps/client/src/app/services/api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { PlayerSearchResult, ReplayData } from '@pubg-replay/shared-types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  searchPlayer(platform: string, name: string): Promise<PlayerSearchResult> {
    return firstValueFrom(
      this.http.get<PlayerSearchResult>(`/api/players/${platform}/${name}`)
    );
  }

  getReplayData(matchId: string): Promise<ReplayData> {
    return firstValueFrom(
      this.http.get<ReplayData>(`/api/matches/${matchId}/telemetry`)
    );
  }
}
```

**Step 2: Register HttpClient provider**

In `apps/client/src/app/app.config.ts`, add `provideHttpClient()` to the providers array:

```typescript
import { provideHttpClient } from '@angular/common/http';
// Add to providers:
provideHttpClient(),
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Angular API service"
```

---

### Task 5.2: Replay Service (Signal-Based State)

**Files:**
- Create: `apps/client/src/app/services/replay.service.ts`

**Step 1: Write the replay state service**

Create `apps/client/src/app/services/replay.service.ts`:

```typescript
import { Injectable, signal, computed } from '@angular/core';
import type { ReplayData, KillEvent } from '@pubg-replay/shared-types';
import { interpolateTick } from '@pubg-replay/replay-engine';
import { formatElapsedTime } from '@pubg-replay/shared-utils';

@Injectable({ providedIn: 'root' })
export class ReplayService {
  // Core state signals
  readonly replayData = signal<ReplayData | null>(null);
  readonly currentTime = signal(0);
  readonly isPlaying = signal(false);
  readonly playbackSpeed = signal(1);
  readonly selectedPlayer = signal<string | null>(null);

  // Derived signals
  readonly duration = computed(() => this.replayData()?.duration ?? 0);
  readonly formattedTime = computed(() => formatElapsedTime(this.currentTime()));
  readonly formattedDuration = computed(() => formatElapsedTime(this.duration()));

  readonly currentTick = computed(() => {
    const data = this.replayData();
    if (!data) return null;
    return interpolateTick(data.ticks, this.currentTime());
  });

  readonly alivePlayers = computed(() => this.currentTick()?.alivePlayers ?? 0);

  readonly visibleKills = computed(() => {
    const data = this.replayData();
    const time = this.currentTime();
    if (!data) return [];
    return data.kills.filter((k) => k.timestamp <= time).reverse().slice(0, 20);
  });

  load(data: ReplayData): void {
    this.replayData.set(data);
    this.currentTime.set(0);
    this.isPlaying.set(false);
  }

  play(): void {
    this.isPlaying.set(true);
  }

  pause(): void {
    this.isPlaying.set(false);
  }

  togglePlay(): void {
    this.isPlaying.set(!this.isPlaying());
  }

  seek(time: number): void {
    this.currentTime.set(Math.max(0, Math.min(time, this.duration())));
  }

  setSpeed(speed: number): void {
    this.playbackSpeed.set(speed);
  }

  selectPlayer(accountId: string | null): void {
    this.selectedPlayer.set(accountId);
  }

  /** Call from the Pixi ticker each frame */
  tick(deltaMs: number): void {
    if (!this.isPlaying()) return;
    const newTime = this.currentTime() + (deltaMs / 1000) * this.playbackSpeed();
    if (newTime >= this.duration()) {
      this.currentTime.set(this.duration());
      this.isPlaying.set(false);
    } else {
      this.currentTime.set(newTime);
    }
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add signal-based replay state service"
```

---

### Task 5.3: Map Canvas Component

**Files:**
- Create: `apps/client/src/app/components/map-canvas/map-canvas.component.ts`

**Step 1: Write the Pixi.js wrapper component**

Create `apps/client/src/app/components/map-canvas/map-canvas.component.ts`:

```typescript
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  viewChild,
  effect,
} from '@angular/core';
import { ReplayService } from '../../services/replay.service';
import { ReplayEngine, PlayerRenderer, ZoneRenderer, EventRenderer } from '@pubg-replay/replay-engine';

@Component({
  selector: 'pubg-map-canvas',
  standalone: true,
  template: `<div #canvasContainer class="w-full h-full"></div>`,
})
export class MapCanvasComponent implements OnInit, OnDestroy {
  private replay = inject(ReplayService);
  private containerRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  private engine!: ReplayEngine;
  private playerRenderer!: PlayerRenderer;
  private zoneRenderer!: ZoneRenderer;
  private eventRenderer!: EventRenderer;
  private lastKillIndex = 0;

  private readonly CANVAS_SIZE = 800;

  async ngOnInit(): Promise<void> {
    this.engine = new ReplayEngine();
    const el = this.containerRef().nativeElement;
    await this.engine.init(el, this.CANVAS_SIZE, this.CANVAS_SIZE);

    this.playerRenderer = new PlayerRenderer(this.engine.getPlayerLayer());
    this.zoneRenderer = new ZoneRenderer(this.engine.getZoneLayer());
    this.eventRenderer = new EventRenderer(this.engine.getEventLayer());

    // Ticker-driven render loop
    this.engine.getApp().ticker.add((ticker) => {
      this.replay.tick(ticker.elapsedMS);
      this.render();
    });

    // React to selected player changes
    effect(() => {
      const selected = this.replay.selectedPlayer();
      this.playerRenderer.setHighlightedPlayer(selected);
    });
  }

  private render(): void {
    const tick = this.replay.currentTick();
    if (!tick) return;

    const w = this.CANVAS_SIZE;
    const h = this.CANVAS_SIZE;

    this.playerRenderer.update(tick.players, w, h);
    this.zoneRenderer.update(tick.zone, w, h);

    // Trigger kill tracers for newly passed kills
    const data = this.replay.replayData();
    const time = this.replay.currentTime();
    if (data) {
      while (this.lastKillIndex < data.kills.length && data.kills[this.lastKillIndex].timestamp <= time) {
        this.eventRenderer.addKillTracer(data.kills[this.lastKillIndex], w, h);
        this.lastKillIndex++;
      }
    }
    this.eventRenderer.update(time);
  }

  ngOnDestroy(): void {
    this.engine?.destroy();
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add Pixi.js map canvas Angular component"
```

---

### Task 5.4: Timeline Component

**Files:**
- Create: `apps/client/src/app/components/timeline/timeline.component.ts`

**Step 1: Write the playback controls component**

Create `apps/client/src/app/components/timeline/timeline.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { ReplayService } from '../../services/replay.service';

@Component({
  selector: 'pubg-timeline',
  standalone: true,
  template: `
    <div class="flex items-center gap-3 px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <!-- Rewind -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)]"
        (click)="replay.seek(Math.max(0, replay.currentTime() - 10))"
      >[ &lt;&lt; ]</button>

      <!-- Play/Pause -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)] min-w-[70px]"
        (click)="replay.togglePlay()"
      >{{ replay.isPlaying() ? '[ PAUSE ]' : '[ PLAY ]' }}</button>

      <!-- Fast Forward -->
      <button
        class="text-[var(--color-text-primary)] font-mono text-sm hover:text-[var(--color-accent)]"
        (click)="replay.seek(Math.min(replay.duration(), replay.currentTime() + 10))"
      >[ &gt;&gt; ]</button>

      <!-- Scrubber -->
      <input
        type="range"
        class="flex-1 accent-[var(--color-accent)]"
        [min]="0"
        [max]="replay.duration()"
        [value]="replay.currentTime()"
        (input)="onScrub($event)"
      />

      <!-- Time display -->
      <span class="font-mono text-sm text-[var(--color-text-primary)] min-w-[100px] text-right">
        {{ replay.formattedTime() }} / {{ replay.formattedDuration() }}
      </span>

      <!-- Speed selector -->
      <select
        class="bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-2 py-1"
        [value]="replay.playbackSpeed()"
        (change)="onSpeedChange($event)"
      >
        <option value="1">1x</option>
        <option value="2">2x</option>
        <option value="5">5x</option>
        <option value="10">10x</option>
      </select>
    </div>
  `,
})
export class TimelineComponent {
  replay = inject(ReplayService);
  Math = Math;

  onScrub(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.replay.seek(value);
  }

  onSpeedChange(event: Event): void {
    const value = +(event.target as HTMLSelectElement).value;
    this.replay.setSpeed(value);
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add timeline playback controls component"
```

---

### Task 5.5: Player Panel & Kill Feed

**Files:**
- Create: `apps/client/src/app/components/player-panel/player-panel.component.ts`
- Create: `apps/client/src/app/components/kill-feed/kill-feed.component.ts`

**Step 1: Write player panel (unit roster)**

Create `apps/client/src/app/components/player-panel/player-panel.component.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { ReplayService } from '../../services/replay.service';
import { formatElapsedTime } from '@pubg-replay/shared-utils';

@Component({
  selector: 'pubg-player-panel',
  standalone: true,
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-[var(--color-text-primary)] text-sm mb-2 tracking-wider uppercase">
        Unit Roster
      </h3>
      <div class="space-y-1">
        @for (player of sortedPlayers(); track player.accountId) {
          <div
            class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[var(--color-border)] rounded text-xs font-mono"
            [class.bg-[var(--color-border)]]="player.accountId === replay.selectedPlayer()"
            (click)="replay.selectPlayer(player.accountId)"
          >
            <span
              class="w-2 h-2 rounded-full inline-block"
              [style.background-color]="player.isAlive ? (player.accountId === replay.selectedPlayer() ? '#7aff4a' : '#6a7a5a') : '#c84a2a'"
            ></span>
            <span class="text-[var(--color-text-primary)] flex-1 truncate">{{ player.name }}</span>
            <span class="text-[var(--color-text-secondary)]">{{ player.health | number:'1.0-0' }}hp</span>
          </div>
        }
      </div>
    </div>
  `,
  imports: [],
})
export class PlayerPanelComponent {
  replay = inject(ReplayService);

  sortedPlayers = computed(() => {
    const tick = this.replay.currentTick();
    if (!tick) return [];
    return [...tick.players].sort((a, b) => {
      if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
      return a.teamId - b.teamId;
    });
  });
}
```

**Step 2: Write kill feed**

Create `apps/client/src/app/components/kill-feed/kill-feed.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { ReplayService } from '../../services/replay.service';
import { formatElapsedTime } from '@pubg-replay/shared-utils';

@Component({
  selector: 'pubg-kill-feed',
  standalone: true,
  template: `
    <div class="h-full overflow-y-auto p-3">
      <h3 class="font-sans font-semibold text-[var(--color-text-primary)] text-sm mb-2 tracking-wider uppercase">
        Kill Feed
      </h3>
      <div class="space-y-1">
        @for (kill of replay.visibleKills(); track $index) {
          <div class="text-xs font-mono text-[var(--color-text-secondary)]">
            <span class="text-[var(--color-text-primary)]">[{{ formatTime(kill.timestamp) }}]</span>
            @if (kill.isSuicide) {
              <span class="text-[var(--color-danger)]"> {{ kill.victimName }} died</span>
            } @else {
              <span class="text-[var(--color-text-primary)]"> {{ kill.killerName }}</span>
              <span class="text-[var(--color-danger)]"> → </span>
              <span class="text-[var(--color-text-primary)]">{{ kill.victimName }}</span>
              <span> ({{ kill.weaponName }}, {{ kill.distance }}m)</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class KillFeedComponent {
  replay = inject(ReplayService);

  formatTime(seconds: number): string {
    return formatElapsedTime(seconds);
  }
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add player panel and kill feed components"
```

---

### Task 5.6: Replay Page (Assemble Layout)

**Files:**
- Create: `apps/client/src/app/pages/replay/replay.component.ts`
- Modify: `apps/client/src/app/app.routes.ts`

**Step 1: Write replay page that assembles all components**

Create `apps/client/src/app/pages/replay/replay.component.ts`:

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MapCanvasComponent } from '../../components/map-canvas/map-canvas.component';
import { TimelineComponent } from '../../components/timeline/timeline.component';
import { PlayerPanelComponent } from '../../components/player-panel/player-panel.component';
import { KillFeedComponent } from '../../components/kill-feed/kill-feed.component';
import { ReplayService } from '../../services/replay.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'pubg-replay-page',
  standalone: true,
  imports: [MapCanvasComponent, TimelineComponent, PlayerPanelComponent, KillFeedComponent],
  template: `
    <div class="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <!-- Top HUD bar -->
      <div class="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] font-mono text-sm">
        <span>[GRID REF: {{ replay.replayData()?.mapDisplayName ?? 'LOADING' | uppercase }}]</span>
        <span>[MATCH: {{ replay.replayData()?.createdAt ?? '' }}]</span>
        <span>[{{ replay.alivePlayers() }} ALIVE]</span>
      </div>

      <!-- Main content -->
      <div class="flex flex-1 min-h-0">
        <!-- Map canvas -->
        <div class="flex-1 flex items-center justify-center">
          <pubg-map-canvas />
        </div>

        <!-- Right sidebar -->
        <div class="w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
          <div class="flex-1 min-h-0 border-b border-[var(--color-border)]">
            <pubg-player-panel />
          </div>
          <div class="h-64">
            <pubg-kill-feed />
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <pubg-timeline />
    </div>
  `,
})
export class ReplayComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  replay = inject(ReplayService);

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!matchId) return;

    const accountId = this.route.snapshot.paramMap.get('accountId');

    const data = await this.api.getReplayData(matchId);
    this.replay.load(data);

    if (accountId) {
      this.replay.selectPlayer(accountId);
    }
  }
}
```

**Step 2: Add routes**

Update `apps/client/src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'replay/:matchId',
    loadComponent: () =>
      import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: 'replay/:matchId/:accountId',
    loadComponent: () =>
      import('./pages/replay/replay.component').then((m) => m.ReplayComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
];
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: assemble replay page with map, panels, and timeline"
```

---

## Phase 6: Home & Player Pages

### Task 6.1: Home Page (Player Search)

**Files:**
- Create: `apps/client/src/app/pages/home/home.component.ts`

**Step 1: Write search landing page**

Create `apps/client/src/app/pages/home/home.component.ts`:

```typescript
import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'pubg-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
      <h1 class="font-sans font-bold text-3xl text-[var(--color-accent)] tracking-wider mb-2">
        PUBG REPLAY VIEWER
      </h1>
      <p class="font-mono text-sm text-[var(--color-text-secondary)] mb-8">
        2D tactical match replay
      </p>

      <div class="flex gap-2">
        <select
          class="bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-3 py-2"
          [(ngModel)]="platform"
        >
          <option value="steam">STEAM</option>
          <option value="psn">PSN</option>
          <option value="xbox">XBOX</option>
        </select>

        <input
          type="text"
          class="bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-3 py-2 w-64"
          placeholder="Player name..."
          [(ngModel)]="playerName"
          (keyup.enter)="search()"
        />

        <button
          class="bg-[var(--color-accent)] text-[var(--color-bg)] font-mono text-sm font-bold px-4 py-2 hover:opacity-80"
          (click)="search()"
        >[ SEARCH ]</button>
      </div>

      @if (error()) {
        <p class="mt-4 font-mono text-sm text-[var(--color-danger)]">{{ error() }}</p>
      }
    </div>
  `,
})
export class HomeComponent {
  private router = inject(Router);

  platform = 'steam';
  playerName = '';
  error = signal('');

  search(): void {
    if (!this.playerName.trim()) {
      this.error.set('Enter a player name');
      return;
    }
    this.error.set('');
    this.router.navigate(['/player', this.platform, this.playerName.trim()]);
  }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add home page with player search"
```

---

### Task 6.2: Player Profile Page

**Files:**
- Create: `apps/client/src/app/pages/player/player.component.ts`
- Create: `apps/client/src/app/components/match-card/match-card.component.ts`
- Modify: `apps/client/src/app/app.routes.ts`

**Step 1: Write match card component**

Create `apps/client/src/app/components/match-card/match-card.component.ts`:

```typescript
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MatchSummary } from '@pubg-replay/shared-types';
import { formatTimestamp } from '@pubg-replay/shared-utils';

@Component({
  selector: 'pubg-match-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/replay', match().matchId]"
      class="block p-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
    >
      <div class="flex justify-between items-center mb-1">
        <span class="font-sans font-semibold text-sm text-[var(--color-text-primary)]">
          {{ match().mapDisplayName }}
        </span>
        <span class="font-mono text-xs text-[var(--color-text-secondary)]">
          {{ formatDate(match().createdAt) }}
        </span>
      </div>
      <div class="flex gap-4 font-mono text-xs text-[var(--color-text-secondary)]">
        <span>#{{ match().placement }}</span>
        <span>{{ match().kills }} kills</span>
        <span>{{ match().gameMode }}</span>
      </div>
    </a>
  `,
})
export class MatchCardComponent {
  match = input.required<MatchSummary>();

  formatDate(iso: string): string {
    return formatTimestamp(iso);
  }
}
```

**Step 2: Write player page**

Create `apps/client/src/app/pages/player/player.component.ts`:

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MatchCardComponent } from '../../components/match-card/match-card.component';
import type { PlayerSearchResult } from '@pubg-replay/shared-types';

@Component({
  selector: 'pubg-player-page',
  standalone: true,
  imports: [MatchCardComponent],
  template: `
    <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] p-8">
      @if (loading()) {
        <p class="font-mono text-sm text-[var(--color-text-secondary)]">Loading...</p>
      } @else if (player()) {
        <h1 class="font-sans font-bold text-2xl text-[var(--color-accent)] mb-1">
          {{ player()!.name }}
        </h1>
        <p class="font-mono text-sm text-[var(--color-text-secondary)] mb-6 uppercase">
          {{ player()!.platform }}
        </p>

        <h2 class="font-sans font-semibold text-lg text-[var(--color-text-primary)] mb-3 tracking-wider uppercase">
          Recent Matches
        </h2>
        <div class="space-y-2 max-w-2xl">
          @for (match of player()!.recentMatches; track match.matchId) {
            <pubg-match-card [match]="match" />
          }
        </div>
      } @else {
        <p class="font-mono text-sm text-[var(--color-danger)]">{{ error() }}</p>
      }
    </div>
  `,
})
export class PlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  player = signal<PlayerSearchResult | null>(null);
  loading = signal(true);
  error = signal('');

  async ngOnInit(): Promise<void> {
    const platform = this.route.snapshot.paramMap.get('platform') ?? 'steam';
    const name = this.route.snapshot.paramMap.get('name') ?? '';

    try {
      const result = await this.api.searchPlayer(platform, name);
      this.player.set(result);
    } catch (e: any) {
      this.error.set(e.message ?? 'Player not found');
    } finally {
      this.loading.set(false);
    }
  }
}
```

**Step 3: Add route**

Add to `apps/client/src/app/app.routes.ts`:

```typescript
{
  path: 'player/:platform/:name',
  loadComponent: () =>
    import('./pages/player/player.component').then((m) => m.PlayerComponent),
},
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add player profile page with match cards"
```

---

## Phase 7: Heatmap Feature

### Task 7.1: NestJS Heatmap Endpoint

**Files:**
- Create: `apps/api/src/heatmaps/heatmaps.module.ts`
- Create: `apps/api/src/heatmaps/heatmaps.controller.ts`
- Create: `apps/api/src/heatmaps/heatmaps.service.ts`

**Step 1: Write heatmap aggregation service**

Create `apps/api/src/heatmaps/heatmaps.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { MatchesService } from '../matches/matches.service';
import type { HeatmapData, HeatmapRequest } from '@pubg-replay/shared-types';
import { getMapDisplayName } from '@pubg-replay/shared-utils';

const GRID_SIZE = 128; // 128x128 density grid

@Injectable()
export class HeatmapsService {
  constructor(private matchesService: MatchesService) {}

  async generateHeatmap(request: HeatmapRequest, matchIds: string[]): Promise<HeatmapData> {
    const grid = new Float32Array(GRID_SIZE * GRID_SIZE);
    let mapName = request.mapName ?? 'Baltic_Main';

    for (const matchId of matchIds.slice(0, 25)) {
      try {
        const replay = await this.matchesService.getReplayData(matchId);
        if (request.mapName && replay.mapName !== request.mapName) continue;
        mapName = replay.mapName;

        switch (request.mode) {
          case 'movement':
            for (const tick of replay.ticks) {
              for (const player of tick.players) {
                if (player.accountId !== request.accountId || !player.isAlive) continue;
                const gx = Math.min(GRID_SIZE - 1, Math.floor(player.x * GRID_SIZE));
                const gy = Math.min(GRID_SIZE - 1, Math.floor(player.y * GRID_SIZE));
                grid[gy * GRID_SIZE + gx] += 1;
              }
            }
            break;
          case 'deaths':
            for (const kill of replay.kills) {
              if (kill.victimAccountId !== request.accountId) continue;
              const gx = Math.min(GRID_SIZE - 1, Math.floor(kill.victimX * GRID_SIZE));
              const gy = Math.min(GRID_SIZE - 1, Math.floor(kill.victimY * GRID_SIZE));
              grid[gy * GRID_SIZE + gx] += 1;
            }
            break;
          case 'kills':
            for (const kill of replay.kills) {
              if (kill.killerAccountId !== request.accountId) continue;
              const gx = Math.min(GRID_SIZE - 1, Math.floor(kill.killerX * GRID_SIZE));
              const gy = Math.min(GRID_SIZE - 1, Math.floor(kill.killerY * GRID_SIZE));
              grid[gy * GRID_SIZE + gx] += 1;
            }
            break;
        }
      } catch {
        // Skip failed matches
      }
    }

    // Normalize to 0..1
    const max = Math.max(...grid, 1);
    const intensities = Array.from(grid).map((v) => v / max);

    return {
      mapName,
      mapDisplayName: getMapDisplayName(mapName),
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      intensities,
      matchCount: matchIds.length,
    };
  }
}
```

Create `apps/api/src/heatmaps/heatmaps.controller.ts`:

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { HeatmapsService } from './heatmaps.service';
import { PubgService } from '../pubg/pubg.service';
import type { HeatmapRequest } from '@pubg-replay/shared-types';

@Controller('players')
export class HeatmapsController {
  constructor(
    private heatmapsService: HeatmapsService,
    private pubgService: PubgService,
  ) {}

  @Get(':accountId/heatmap')
  async getHeatmap(
    @Param('accountId') accountId: string,
    @Query('matches') matches = '10',
    @Query('mode') mode: 'movement' | 'deaths' | 'kills' = 'movement',
    @Query('mapName') mapName?: string,
  ) {
    // Get player's recent match IDs
    // Note: accountId lookup requires different @j03fr0st/pubg-ts call
    // For now, return placeholder — implement when player match history is available
    const matchIds: string[] = []; // TODO: fetch from player data

    const request: HeatmapRequest = {
      accountId,
      matches: parseInt(matches),
      mode,
      mapName,
    };

    return this.heatmapsService.generateHeatmap(request, matchIds);
  }
}
```

Create `apps/api/src/heatmaps/heatmaps.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HeatmapsController } from './heatmaps.controller';
import { HeatmapsService } from './heatmaps.service';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [MatchesModule],
  controllers: [HeatmapsController],
  providers: [HeatmapsService],
})
export class HeatmapsModule {}
```

**Step 2: Register module and commit**

Add `HeatmapsModule` to `app.module.ts` imports. Export `MatchesService` from `MatchesModule`.

```bash
git add -A && git commit -m "feat: add heatmap aggregation endpoint"
```

---

### Task 7.2: Angular Heatmap Page

**Files:**
- Create: `apps/client/src/app/pages/heatmap/heatmap.component.ts`
- Modify: `apps/client/src/app/app.routes.ts`

**Step 1: Write heatmap page**

Create `apps/client/src/app/pages/heatmap/heatmap.component.ts`:

```typescript
import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Application, Graphics } from 'pixi.js';
import type { HeatmapData } from '@pubg-replay/shared-types';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pubg-heatmap-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] p-8">
      <h1 class="font-sans font-bold text-2xl text-[var(--color-accent)] mb-4">HEATMAP</h1>

      <div class="flex gap-2 mb-4">
        <select
          class="bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-sm border border-[var(--color-border)] px-3 py-2"
          [(ngModel)]="mode"
          (ngModelChange)="fetchHeatmap()"
        >
          <option value="movement">MOVEMENT</option>
          <option value="deaths">DEATHS</option>
          <option value="kills">KILLS</option>
        </select>
      </div>

      <div #canvasContainer class="inline-block border border-[var(--color-border)]"></div>
    </div>
  `,
})
export class HeatmapComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private containerRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasContainer');

  private app!: Application;
  mode = 'movement';
  private accountId = '';

  async ngOnInit(): Promise<void> {
    this.accountId = this.route.snapshot.paramMap.get('accountId') ?? '';

    this.app = new Application();
    await this.app.init({ width: 600, height: 600, backgroundColor: 0x0d1a0d });
    this.containerRef().nativeElement.appendChild(this.app.canvas);

    await this.fetchHeatmap();
  }

  async fetchHeatmap(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<HeatmapData>(
        `/api/players/${this.accountId}/heatmap?mode=${this.mode}`
      )
    );
    this.renderHeatmap(data);
  }

  private renderHeatmap(data: HeatmapData): void {
    this.app.stage.removeChildren();

    const cellW = 600 / data.gridWidth;
    const cellH = 600 / data.gridHeight;
    const gfx = new Graphics();

    for (let y = 0; y < data.gridHeight; y++) {
      for (let x = 0; x < data.gridWidth; x++) {
        const intensity = data.intensities[y * data.gridWidth + x];
        if (intensity < 0.01) continue;

        // Military palette: black → olive → amber
        const r = Math.floor(intensity * 212);
        const g = Math.floor(100 + intensity * 68);
        const b = Math.floor(50 * (1 - intensity));
        const color = (r << 16) | (g << 8) | b;

        gfx.rect(x * cellW, y * cellH, cellW, cellH).fill({ color, alpha: intensity * 0.8 });
      }
    }

    this.app.stage.addChild(gfx);
  }

  ngOnDestroy(): void {
    this.app?.destroy(true);
  }
}
```

**Step 2: Add route**

Add to `apps/client/src/app/app.routes.ts`:

```typescript
{
  path: 'heatmap/:accountId',
  loadComponent: () =>
    import('./pages/heatmap/heatmap.component').then((m) => m.HeatmapComponent),
},
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add heatmap page with Pixi.js density rendering"
```

---

## Phase 8: Polish & Integration

### Task 8.1: Global Styles & Layout Shell

**Files:**
- Modify: `apps/client/src/styles.scss`
- Modify: `apps/client/src/app/app.component.ts`
- Modify: `apps/client/src/index.html`

**Step 1: Update global styles**

Ensure `apps/client/src/styles.scss` has:

```scss
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/700.css";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";
@import "tailwindcss";
@import "./styles/theme.css";

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: 'Inter', sans-serif;
}

.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}

.font-sans {
  font-family: 'Inter', sans-serif;
}
```

**Step 2: Simplify app component to just a router outlet**

Update `apps/client/src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'pubg-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
```

**Step 3: Update index.html title**

Set `<title>PUBG Replay Viewer</title>` in `apps/client/src/index.html`.

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: polish global styles and app shell"
```

---

### Task 8.2: Environment Configuration

**Files:**
- Create: `.env.example`
- Modify: `apps/api/src/app/app.module.ts`

**Step 1: Final app.module.ts wiring**

Update `apps/api/src/app/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubgModule } from '../pubg/pubg.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { HeatmapsModule } from '../heatmaps/heatmaps.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PubgModule,
    TelemetryModule,
    MatchesModule,
    PlayersModule,
    HeatmapsModule,
  ],
})
export class AppModule {}
```

**Step 2: Create .env.example**

Create `.env.example`:
```
PUBG_API_KEY=your-pubg-api-key-from-developer.pubg.com
```

**Step 3: Verify .env is in .gitignore**

Confirm `.env` and `.env.*` (except `.env.example`) are in `.gitignore`.

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: wire up all NestJS modules and env config"
```

---

### Task 8.3: Verify Full Stack Serves

**Step 1: Create a `.env` file with your PUBG API key**

```bash
cp .env.example .env
# Edit .env and add your real PUBG_API_KEY
```

**Step 2: Serve both apps**

```bash
npx nx run-many -t serve -p client api
```

**Step 3: Verify**

- `http://localhost:4200` — Angular home page loads with search form
- `http://localhost:3000/api` — NestJS responds
- Search for a player name → navigates to player page
- Click a match → navigates to replay page with canvas

**Step 4: Final commit**

```bash
git add -A && git commit -m "chore: verify full stack integration"
```

---

## Summary of Phases

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1.1–1.6 | Nx workspace, Angular + NestJS apps, shared libs, Tailwind, dependencies |
| 2 | 2.1–2.5 | Shared types (telemetry, frames, API), map helpers, time formatters |
| 3 | 3.1–3.4 | NestJS PUBG service, telemetry processor, matches + players endpoints |
| 4 | 4.1–4.5 | Pixi.js replay engine: layers, player/zone/event renderers, interpolation |
| 5 | 5.1–5.6 | Angular replay page: canvas, timeline, player panel, kill feed |
| 6 | 6.1–6.2 | Home search page, player profile page with match cards |
| 7 | 7.1–7.2 | Heatmap aggregation endpoint + Angular heatmap page |
| 8 | 8.1–8.3 | Global styles, module wiring, full stack verification |
