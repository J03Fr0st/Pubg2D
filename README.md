# PUBG 2D Replay Viewer

A 2D PUBG match replay viewer with a military/tactical aesthetic. Watch player movement, zone shrinks, and kill events play out on an interactive canvas — or compare positioning across multiple matches with multi-match heatmaps.

> Built on top of the [`pubg-ts`](https://github.com/J03Fr0st/pubg-ts) library. Inspired by [pubg.sh](https://pubg.sh).

---

## Features

- **Match Replay** — Smooth 60fps canvas playback of player positions, safe zone rings, red zones, and care package drops
- **Kill Feed** — Timestamped kill events with weapon and distance info, rendered as tracer lines on the canvas
- **Player Panel** — Live health bars and unit roster that update as the replay plays
- **Playback Controls** — Play/pause, scrubbing, and speed control (1×, 2×, 5×, 10×)
- **Multi-Match Heatmaps** — Aggregate movement, death, and kill positions across up to 25 matches
- **Player Search** — Look up any player by name and platform to browse their recent matches

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (standalone components, signals) |
| Backend | NestJS 11 |
| PUBG API | [`pubg-ts`](https://github.com/J03Fr0st/pubg-ts) |
| Canvas | Pixi.js v8 (WebGL) |
| Styling | Tailwind CSS v4 |
| Data Fetching | TanStack Query (Angular) |
| State | Angular Signals |
| Monorepo | Nx 22 |
| Testing | Vitest · Jest |
| Linting | Biome · ESLint |

---

## Project Structure

```
pubg-replay/
├── apps/
│   ├── client/              # Angular frontend
│   └── api/                 # NestJS backend
├── libs/
│   ├── shared/
│   │   ├── types/           # Shared TypeScript interfaces & DTOs
│   │   └── utils/           # Map coordinate helpers, time formatters
│   └── replay-engine/       # Pixi.js canvas library (framework-agnostic)
├── docs/
│   └── plans/               # Design & implementation documents
├── biome.json
├── eslint.config.mjs
└── nx.json
```

### Apps

**`apps/client`** — Angular SPA with four pages:

| Route | Page |
|---|---|
| `/` | Home — player search |
| `/player/:platform/:name` | Player profile & recent match list |
| `/replay/:matchId` | Full replay viewer |
| `/replay/:matchId/:accountId` | Replay viewer focused on a specific player |
| `/heatmap/:accountId` | Multi-match heatmap comparison |

**`apps/api`** — NestJS REST API. All PUBG API calls are made server-side; the Angular client never talks to the PUBG API directly.

| Endpoint | Description |
|---|---|
| `GET /players/:platform/:name` | Search player, return profile + recent matches |
| `GET /matches/:matchId` | Full match data |
| `GET /matches/:matchId/telemetry` | Pre-processed location frames (~90% smaller than raw telemetry) |
| `GET /players/:accountId/heatmap` | Aggregated positions across N matches |

### Libraries

**`libs/shared/types`** (`@pubg-replay/shared-types`) — Canonical TypeScript interfaces shared between the API and client: telemetry event types, processed frame DTOs, player/match API response shapes, and heatmap data structures.

**`libs/shared/utils`** (`@pubg-replay/shared-utils`) — Pure utility functions: map coordinate normalisation for all PUBG maps, elapsed time formatters, and timestamp helpers.

**`libs/replay-engine`** (`@pubg-replay/replay-engine`) — A framework-agnostic Pixi.js v8 canvas library. Manages the full rendering pipeline:

- `ReplayEngine` — Pixi application setup and layer stack
- `PlayerRenderer` — Pooled player dots with health bars and name labels
- `ZoneRenderer` — Animated safe zone, poison zone, and red zone rings
- `EventRenderer` — Kill tracer lines with fade-out animation
- `interpolateTick` — Linear interpolation between 5-second telemetry ticks for smooth 60fps playback

---

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- A **PUBG API key** — get one at [developer.pubg.com](https://developer.pubg.com)

---

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Configure the API key

Create a `.env` file in `apps/api/`:

```sh
# apps/api/.env
PUBG_API_KEY=your_api_key_here
```

### 3. Start the development servers

Run both the API and client in parallel:

```sh
# Start the NestJS API (http://localhost:3000)
npx nx serve api

# Start the Angular client (http://localhost:4200)
npx nx serve client
```

Or run them together:

```sh
npx nx run-many -t serve -p api client --parallel
```

---

## Scripts

### Nx tasks

```sh
# Build
npx nx build client
npx nx build api

# Test
npx nx test replay-engine
npx nx run-many -t test

# Lint
npx nx run-many -t lint
```

### Biome

```sh
npm run biome:check    # Lint + format check (no writes)
npm run biome:format   # Auto-format all files
npm run biome:lint     # Lint only
npm run biome:ci       # Strict check for CI
```

---

## Caching

The NestJS API caches all PUBG responses to stay within rate limits and keep replays fast to load.

| Data | TTL |
|---|---|
| Match data & telemetry | 24 hours |
| Player lookups | 5 minutes |
| Heatmap aggregations | 1 hour |

---

## Visual Design

The UI follows a **military/tactical** aesthetic.

**Colour palette:**

| Token | Hex | Usage |
|---|---|---|
| Background | `#0d1a0d` | Deep tactical black-green |
| Surface | `#1a2a1a` | Panel backgrounds |
| Border | `#2a3a2a` | Grid lines |
| Primary text | `#c8d8b0` | Labels, values |
| Accent | `#7a9a4a` | Olive green highlights |
| Danger | `#c84a2a` | Deaths, damage |
| Friendly | `#d4a832` | Teammates (amber) |

**Typography:** IBM Plex Mono for all data and numbers · Inter for labels and headings.

**Canvas elements:**

| Element | Style |
|---|---|
| Friendly team | Amber filled circle |
| Enemies | Olive drab filled circle |
| Highlighted player | Bright green filled circle |
| Dead player | `✕` marker, fades after 10s |
| Zone rings | Dashed red stroke |
| Kill event | Tracer line from shooter to victim |
| Grid overlay | Faint `#2a3a2a` military grid |

---

## Heatmap Modes

Three overlay modes, all toggleable per-match:

| Mode | What it shows |
|---|---|
| **Movement** | Where you spend time (dwell = hot) |
| **Deaths** | Where you die across matches |
| **Kills** | Where you secure kills |

The heatmap colour scale uses a military palette — black → olive → amber — rather than the standard red/blue.

---

## Deployment

The project is designed for two services on [Railway](https://railway.app):

- **`client`** — Nginx serving the Angular static build
- **`api`** — NestJS Node server

Both services share a single Railway project and environment variables.

---

## License

MIT — see [LICENSE](./LICENSE).