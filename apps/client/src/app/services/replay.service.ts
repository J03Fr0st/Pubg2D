import { computed, Injectable, signal } from '@angular/core';
import { interpolatePlayerPositionsAt, interpolateTick, interpolateZoneAt } from '@pubg-replay/replay-engine';
import type { ReplayData } from '@pubg-replay/shared-types';
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
    const time = this.currentTime();
    const tick = interpolateTick(data.ticks, time);

    // Override zone with dense keyframes (~1 s cadence) for smooth shrinking
    const zone = interpolateZoneAt(data.zoneKeyframes, time) ?? tick.zone;

    // Override player x/y with dense position tracks (~1 s cadence) for smooth movement
    const positions = interpolatePlayerPositionsAt(data.playerPositionTracks, time);
    const players = tick.players.map((p) => {
      const pos = positions.get(p.accountId);
      return pos ? { ...p, x: pos.x, y: pos.y } : p;
    });

    return { ...tick, zone, players };
  });

  readonly alivePlayers = computed(() => this.currentTick()?.alivePlayers ?? 0);

  readonly visibleKills = computed(() => {
    const data = this.replayData();
    const time = this.currentTime();
    if (!data) return [];
    return data.kills
      .filter((k) => k.timestamp <= time)
      .reverse()
      .slice(0, 20);
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
