import type { KillEvent } from '@pubg-replay/shared-types';
import { type Container, Graphics } from 'pixi.js';

interface ActiveTracer {
  graphics: Graphics;
  killerX: number;
  killerY: number;
  victimX: number;
  victimY: number;
  startTime: number;    // elapsed seconds when the kill happened
  canvasWidth: number;
  canvasHeight: number;
}

// How long the bullet segment travels from killer to victim (seconds)
const TRACER_DURATION = 1.5;

// How long the full static line takes to fade out after the bullet arrives (seconds)
const FADE_DURATION = 1.0;

// Total lifetime of a tracer
const TOTAL_DURATION = TRACER_DURATION + FADE_DURATION;

// The bullet segment is 1/16th of the total killer→victim distance (matches pubgsh reference)
const SEGMENT_FRACTION = 1 / 16;

export class EventRenderer {
  private container: Container;
  private tracers: ActiveTracer[] = [];

  constructor(container: Container) {
    this.container = container;
  }

  /** Call when a kill happens during playback */
  addKillTracer(kill: KillEvent, currentTime: number, canvasWidth: number, canvasHeight: number): void {
    if (!kill.killerAccountId || kill.isSuicide) return;

    const graphics = new Graphics();
    this.container.addChild(graphics);

    this.tracers.push({
      graphics,
      killerX: kill.killerX * canvasWidth,
      killerY: kill.killerY * canvasHeight,
      victimX: kill.victimX * canvasWidth,
      victimY: kill.victimY * canvasHeight,
      startTime: currentTime,
      canvasWidth,
      canvasHeight,
    });
  }

  /** Call each frame to animate / fade / remove tracers */
  update(currentTime: number): void {
    this.tracers = this.tracers.filter((tracer) => {
      const elapsed = currentTime - tracer.startTime;
      const progress = elapsed / TRACER_DURATION; // 0 → 1 while bullet travels

      // Past total lifetime — remove the tracer
      if (elapsed > TOTAL_DURATION) {
        this.container.removeChild(tracer.graphics);
        tracer.graphics.destroy();
        return false;
      }

      tracer.graphics.clear();

      const { killerX, killerY, victimX, victimY } = tracer;
      const dx = victimX - killerX;
      const dy = victimY - killerY;

      if (progress <= 1) {
        // --- Phase 1: animated bullet segment ---
        // Head of the bullet (clamped to [0, 1])
        const headProgress = Math.min(progress, 1);
        // Tail sits one segment-length behind the head, floored at 0
        const tailProgress = Math.max(headProgress - SEGMENT_FRACTION, 0);

        const fromX = killerX + dx * tailProgress;
        const fromY = killerY + dy * tailProgress;
        const toX   = killerX + dx * headProgress;
        const toY   = killerY + dy * headProgress;

        tracer.graphics
          .moveTo(fromX, fromY)
          .lineTo(toX, toY)
          .stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });
      } else {
        // --- Phase 2: full static line fading out ---
        // progress here is in (1, 1 + FADE_DURATION / TRACER_DURATION]
        const fadeElapsed = elapsed - TRACER_DURATION;
        const alpha = Math.max(0, 1 - fadeElapsed / FADE_DURATION);

        tracer.graphics
          .moveTo(killerX, killerY)
          .lineTo(victimX, victimY)
          .stroke({ width: 1, color: 0xffffff, alpha });
      }

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
