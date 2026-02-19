# 2D PUBG Replay Viewer — Design Document
**Date:** 2026-02-19
**Stack:** Nx monorepo · Angular 17+ · NestJS · Pixi.js v8 · Tailwind CSS
**Style:** Military/tactical

---

## Goal

A rebuilt 2D PUBG match replay viewer with a military/tactical aesthetic, featuring:
- Smooth canvas-based replay of player movement, zone shrinks, and kill events
- Rich player stats panel with live kill feed
- Zone & care package overlays
- Multi-match heatmap comparison (movement, deaths, kills)
- Centralized backend (user provides match ID / player name, server handles PUBG API via `pubg-ts`)

Reference: https://pubg.sh/J03Fr0st/steam/0784908c-02fe-4ee5-b03c-4f6de3fb92b4
Backend library: https://github.com/J03Fr0st/pubg-ts
Original client (reference only): https://github.com/pubgsh/client

---

## 1. Architecture Overview

### Monorepo Structure (Nx)

```
pubg-replay/
├── apps/
│   ├── client/          # Angular app
│   └── api/             # NestJS app
├── libs/
│   ├── shared/types/    # PUBG telemetry interfaces, match DTOs
│   ├── shared/utils/    # Map coordinate helpers, time formatters
│   └── replay-engine/   # Pixi.js canvas library (framework-agnostic)
```

### Key Technologies

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Angular 17+ (standalone components, signals) | Chosen by user |
| Backend | NestJS | Angular-sibling conventions, TypeScript-first |
| PUBG API | `pubg-ts` (@j03fr0st/pubg-ts) | User's own library, rate limiting + caching built in |
| Canvas | Pixi.js v8 (WebGL) | Smooth 60fps with 100 player dots + overlays |
| Styling | Tailwind CSS | Utility-first, easy military theme |
| Data fetching | TanStack Query (Angular) | Caching, background refetch |
| State | Angular Signals | No NgRx needed for this complexity |
| Deployment | Railway (2 services) | Simple, single project, shared env vars |

### Deployment

Single Railway project with two services:
- `client` — Nginx serving Angular static build
- `api` — NestJS Node server with `pubg-ts`

---

## 2. Backend Design (NestJS)

### Module Structure

```
apps/api/src/
├── matches/         # Match lookup, telemetry fetching & caching
├── players/         # Player search, season stats, recent matches
├── seasons/         # Current season info
├── heatmaps/        # Multi-match aggregation endpoint
└── assets/          # Serve synced PUBG asset data (maps, items)
```

### API Endpoints

```
GET /players/:platform/:name          # Search player, return recent matches
GET /matches/:matchId                 # Full match data + parsed telemetry
GET /matches/:matchId/telemetry       # Pre-processed location frames
GET /players/:accountId/heatmap       # Aggregated positions across N matches
GET /seasons/current                  # Current season metadata
```

### Telemetry Processing

Raw PUBG telemetry is 5–15MB of JSON per match. NestJS pre-processes it server-side into compact **location frames** — one array of `{accountId, x, y, health}` per 5-second tick. This reduces client payload by ~90%.

### Caching Strategy (NestJS CacheModule)

| Data | TTL | Reason |
|------|-----|--------|
| Match data | 24hr | Immutable after game ends |
| Telemetry frames | 24hr | Immutable after game ends |
| Player lookups | 5min | Stats change between games |
| Heatmap aggregations | 1hr | Expensive to compute |

`pubg-ts` is used exclusively inside NestJS services — Angular never calls PUBG API directly.

---

## 3. Frontend Design (Angular)

### App Structure

```
apps/client/src/
├── app/
│   ├── pages/
│   │   ├── home/           # Player search landing page
│   │   ├── player/         # Player profile + recent matches list
│   │   ├── replay/         # Full replay viewer page
│   │   └── heatmap/        # Multi-match heatmap comparison
│   ├── components/
│   │   ├── map-canvas/     # Pixi.js canvas wrapper component
│   │   ├── player-panel/   # Kill feed, stats sidebar
│   │   ├── timeline/       # Scrubber, playback controls
│   │   ├── zone-controls/  # Toggle zone rings, care packages
│   │   └── match-card/     # Match summary card for lists
│   └── services/
│       ├── replay.service.ts    # Wraps replay-engine lib
│       └── api.service.ts       # HTTP calls to NestJS
```

### Routes

```
/                           → Home (player search)
/player/:platform/:name     → Player profile
/replay/:matchId            → Replay viewer
/replay/:matchId/:accountId → Replay viewer focused on one player
/heatmap/:accountId         → Multi-match heatmap
```

### State Management

Angular Signals throughout. `replay.service.ts` exposes signals:
- `currentTick` — drives canvas position interpolation
- `isPlaying` — play/pause state
- `playbackSpeed` — 1x / 2x / 5x / 10x
- `selectedPlayer` — highlighted player accountId

Both canvas and UI panels react to signals independently (no prop drilling).

---

## 4. Replay Engine (Pixi.js)

### Canvas Layer Stack

```
Stage
├── MapLayer          # Static PUBG map image (tiled for zoom)
├── ZoneLayer         # Animated safe zone rings + blue zone fill
├── CarePackageLayer  # Drop icons with parachute animation
├── PlayerLayer       # Player dots, name labels, health bars
├── EventLayer        # Kill markers, shot tracers (momentary flash)
└── HUDLayer          # Compass, grid overlay, coordinate readout
```

### Playback Loop

- Frames received as pre-processed 5-second tick arrays from NestJS
- Linear interpolation between ticks = smooth 60fps movement
- `currentTime` signal from Angular timeline drives frame seeking
- Pixi `Graphics` pooling — dots pre-created at init, repositioned each frame (no GC pressure at 100 players)

### Visual Language (on canvas)

| Element | Style |
|---------|-------|
| Friendly team | Amber filled circle |
| Enemies | Olive drab filled circle |
| Highlighted player | Bright green filled circle |
| Dead player | `✕` marker, fades after 10s |
| Zone rings | Dashed red stroke, marching-ants animation |
| Grid overlay | Faint `#2a3a2a` military grid lines |
| Kill event | Muzzle flash sprite at shooter + tracer line to victim |

---

## 5. UI/UX Design

### Color Palette

```
Background:     #0d1a0d   (deep tactical black-green)
Surface:        #1a2a1a   (panel backgrounds)
Border:         #2a3a2a   (subtle grid lines)
Primary text:   #c8d8b0   (muted military green-white)
Secondary text: #6a7a5a   (subdued label color)
Accent:         #7a9a4a   (olive green for highlights)
Danger/Kill:    #c84a2a   (muted red for deaths/damage)
Friendly:       #d4a832   (amber for teammates)
```

### Typography

- **IBM Plex Mono** — all data/numbers (kills, coords, timestamps)
- **Inter** — labels and headings

### Replay Page Layout

```
┌─────────────────────────────────────────────────────┐
│ [GRID REF: MIRAMAR] [MATCH: Feb 11 23:02] [93 ALIVE]│  ← top HUD bar
├───────────────────────────┬─────────────────────────┤
│                           │  UNIT ROSTER            │
│      MAP CANVAS           │  ─────────────────────  │
│      (Pixi.js)            │  [player rows w/ bars]  │
│                           │                         │
│                           │  KILL FEED              │
│                           │  ─────────────────────  │
│                           │  [timestamped events]   │
├───────────────────────────┴─────────────────────────┤
│ ◀◀  ▶  ▶▶  [━━━━━━●━━━━━━━━━━━━━━]  01:35  [1x ▾] │  ← timeline
└─────────────────────────────────────────────────────┘
```

### Panel Details

- **Unit Roster** — player rows with live health bar during playback
- **Kill Feed** format: `[04:32] DEKARD813 → s1r_Mercury (M416, 87m)`
- Panel borders: subtle double-line military frame style
- Buttons styled as stenciled labels: `[ PLAY ]` `[ ZONES ]` `[ GRID ]`

---

## 6. Multi-Match Heatmaps

### Endpoint

`GET /players/:accountId/heatmap?matches=10&season=current`

NestJS fetches last N matches (default 10, max 25), extracts all position frames, aggregates into a density grid (`Float32Array` of normalized intensity values).

### Three Overlay Modes (toggleable)

| Mode | What it shows |
|------|--------------|
| Movement | Where you spend time (dwell = hot) |
| Deaths | Where you die across matches |
| Kills | Where you secure kills (reveals engagement range) |

### Rendering

Pixi.js `RenderTexture` + custom GLSL fragment shader for gradient heat coloring. Military palette: **black → olive → amber** (on-theme, avoids default red/blue heatmap).

### Controls

```
[ MAP: MIRAMAR ▾ ]  [ LAST: 10 MATCHES ▾ ]  [ OVERLAY: MOVEMENT ▾ ]
[ SEASON: CURRENT ▾ ]                         [ EXPORT PNG ]
```

### Match Timeline Strip

Compact row of match cards below the map — shows placement, kills, date. Clicking toggles that match's contribution to the heatmap on/off.

### Shared Types

`HeatmapFrame` interface defined once in `libs/shared/types` — used by both NestJS (build grid) and Angular (consume grid). No DTO mapping layer needed.

---

## Implementation Order

1. **Nx workspace setup** — scaffold monorepo, Angular app, NestJS app, shared libs
2. **NestJS core** — `pubg-ts` integration, players + matches + telemetry endpoints, caching
3. **Replay engine lib** — Pixi.js stage, layers, playback loop, interpolation
4. **Angular replay page** — canvas component, timeline, player panel, kill feed
5. **Angular home + player pages** — search, match list, navigation
6. **Heatmap feature** — NestJS aggregation endpoint + Angular heatmap page
7. **Polish** — military theme, animations, responsive layout, error states
