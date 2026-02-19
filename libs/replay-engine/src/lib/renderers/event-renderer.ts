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
