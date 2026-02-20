import type { KillEvent } from '@pubg-replay/shared-types';
import { type Container, Graphics } from 'pixi.js';

export type TracerMode = 'all' | 'team' | 'selected';

interface ActiveTracer {
  graphics: Graphics;
  color: number;
  killerX: number;
  killerY: number;
  victimX: number;
  victimY: number;
  controlX: number;
  controlY: number;
  startTime: number;    // elapsed seconds when the kill happened
  travelDuration: number;
  fadeDuration: number;
  totalDuration: number;
  segmentFraction: number;
}

const DEFAULT_MAX_ACTIVE_TRACERS = 36;
const BASE_TRAVEL_DURATION = 0.55;
const BASE_FADE_DURATION = 0.8;
const MIN_TRAVEL_DURATION = 0.28;
const MAX_TRAVEL_DURATION = 1.5;
const MIN_SEGMENT_FRACTION = 1 / 22;
const MAX_SEGMENT_FRACTION = 1 / 8;

const TRACER_COLORS = {
  selected: 0x7aff4a,
  friendly: 0xd4a832,
  enemy: 0x6a8ac8,
  neutral: 0xffffff,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function weaponSpeedMultiplier(weaponName: string): number {
  const w = weaponName.toLowerCase();
  if (w.includes('awm') || w.includes('kar') || w.includes('m24') || w.includes('win94')) return 0.72;
  if (w.includes('mini') || w.includes('slr') || w.includes('mk12') || w.includes('qbu') || w.includes('dmr')) return 0.82;
  if (w.includes('ump') || w.includes('vector') || w.includes('uzi') || w.includes('tommy')) return 1.12;
  return 1;
}

function quadraticPoint(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): { x: number; y: number } {
  const inv = 1 - t;
  return {
    x: inv * inv * x0 + 2 * inv * t * cx + t * t * x1,
    y: inv * inv * y0 + 2 * inv * t * cy + t * t * y1,
  };
}

function drawQuadraticSegment(
  graphics: Graphics,
  fromT: number,
  toT: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): void {
  const steps = Math.max(2, Math.ceil((toT - fromT) * 16));
  const start = quadraticPoint(fromT, x0, y0, cx, cy, x1, y1);
  graphics.moveTo(start.x, start.y);
  for (let i = 1; i <= steps; i++) {
    const t = fromT + ((toT - fromT) * i) / steps;
    const p = quadraticPoint(t, x0, y0, cx, cy, x1, y1);
    graphics.lineTo(p.x, p.y);
  }
}

export class EventRenderer {
  private container: Container;
  private tracers: ActiveTracer[] = [];
  private tracerEnabled = true;
  private tracerMode: TracerMode = 'all';
  private selectedAccountId: string | null = null;
  private selectedTeamId: number | null = null;
  private maxActiveTracers = DEFAULT_MAX_ACTIVE_TRACERS;
  private teamByAccountId = new Map<string, number>();

  constructor(container: Container) {
    this.container = container;
  }

  setTracerEnabled(enabled: boolean): void {
    this.tracerEnabled = enabled;
    if (!enabled) this.clear();
  }

  setTracerMode(mode: TracerMode): void {
    this.tracerMode = mode;
  }

  setSelectedContext(accountId: string | null, teamId: number | null): void {
    this.selectedAccountId = accountId;
    this.selectedTeamId = teamId;
  }

  setPlayerTeams(teamByAccountId: Map<string, number>): void {
    this.teamByAccountId = teamByAccountId;
  }

  setMaxActiveTracers(maxActive: number): void {
    this.maxActiveTracers = Math.max(1, Math.floor(maxActive));
  }

  private shouldRenderTracer(kill: KillEvent): boolean {
    if (!this.tracerEnabled) return false;
    if (this.tracerMode === 'all') return true;
    if (!this.selectedAccountId) return false;
    if (this.tracerMode === 'selected') {
      return (
        kill.killerAccountId === this.selectedAccountId || kill.victimAccountId === this.selectedAccountId
      );
    }
    // team mode
    if (this.selectedTeamId == null) return false;
    const killerTeam = kill.killerAccountId
      ? (this.teamByAccountId.get(kill.killerAccountId) ?? null)
      : null;
    const victimTeam = this.teamByAccountId.get(kill.victimAccountId) ?? null;
    return killerTeam === this.selectedTeamId || victimTeam === this.selectedTeamId;
  }

  private resolveTracerColor(kill: KillEvent): number {
    if (!this.selectedAccountId) return TRACER_COLORS.neutral;
    if (
      kill.killerAccountId === this.selectedAccountId ||
      kill.victimAccountId === this.selectedAccountId
    ) {
      return TRACER_COLORS.selected;
    }
    if (this.selectedTeamId != null) {
      const killerTeam = kill.killerAccountId
        ? (this.teamByAccountId.get(kill.killerAccountId) ?? null)
        : null;
      const victimTeam = this.teamByAccountId.get(kill.victimAccountId) ?? null;
      if (killerTeam === this.selectedTeamId || victimTeam === this.selectedTeamId) {
        return TRACER_COLORS.friendly;
      }
      return TRACER_COLORS.enemy;
    }
    return TRACER_COLORS.neutral;
  }

  /** Call when a kill happens during playback */
  addKillTracer(kill: KillEvent, currentTime: number, canvasWidth: number, canvasHeight: number): void {
    if (!kill.killerAccountId || kill.isSuicide) return;
    if (!this.shouldRenderTracer(kill)) return;

    if (this.tracers.length >= this.maxActiveTracers) {
      const oldest = this.tracers.shift();
      if (oldest) {
        this.container.removeChild(oldest.graphics);
        oldest.graphics.destroy();
      }
    }

    const graphics = new Graphics();
    this.container.addChild(graphics);

    const killerX = kill.killerX * canvasWidth;
    const killerY = kill.killerY * canvasHeight;
    const victimX = kill.victimX * canvasWidth;
    const victimY = kill.victimY * canvasHeight;
    const dx = victimX - killerX;
    const dy = victimY - killerY;
    const pxDistance = Math.hypot(dx, dy);
    const distanceMeters = Math.max(1, kill.distance ?? 1);

    const speedMultiplier = weaponSpeedMultiplier(kill.weaponName);
    const distanceFactor = clamp(distanceMeters / 700, 0.45, 1.85);
    const travelDuration = clamp(
      BASE_TRAVEL_DURATION * distanceFactor * speedMultiplier,
      MIN_TRAVEL_DURATION,
      MAX_TRAVEL_DURATION,
    );
    const fadeDuration = clamp(BASE_FADE_DURATION + distanceMeters / 1400, 0.45, 1.3);
    const totalDuration = travelDuration + fadeDuration;
    const segmentFraction = clamp(0.08 + distanceMeters / 6000, MIN_SEGMENT_FRACTION, MAX_SEGMENT_FRACTION);

    // Slight ballistic curve: midpoint offset along perpendicular.
    const midX = (killerX + victimX) / 2;
    const midY = (killerY + victimY) / 2;
    const nx = pxDistance > 0 ? -dy / pxDistance : 0;
    const ny = pxDistance > 0 ? dx / pxDistance : 0;
    const sign = kill.victimAccountId.charCodeAt(0) % 2 === 0 ? 1 : -1;
    const arcHeight = clamp(pxDistance * 0.03, 2, 16) * sign;
    const controlX = midX + nx * arcHeight;
    const controlY = midY + ny * arcHeight;

    this.tracers.push({
      graphics,
      color: this.resolveTracerColor(kill),
      killerX,
      killerY,
      victimX,
      victimY,
      controlX,
      controlY,
      startTime: currentTime,
      travelDuration,
      fadeDuration,
      totalDuration,
      segmentFraction,
    });
  }

  /** Call each frame to animate / fade / remove tracers */
  update(currentTime: number, zoom = 1): void {
    const safeZoom = Math.max(zoom, 0.001);
    const widthScale = 1 / safeZoom;
    this.tracers = this.tracers.filter((tracer) => {
      const elapsed = currentTime - tracer.startTime;
      const progress = elapsed / tracer.travelDuration; // 0 → 1 while bullet travels

      // Past total lifetime — remove the tracer
      if (elapsed > tracer.totalDuration) {
        this.container.removeChild(tracer.graphics);
        tracer.graphics.destroy();
        return false;
      }

      tracer.graphics.clear();

      const { killerX, killerY, victimX, victimY, controlX, controlY, color } = tracer;
      const glowWidth = 4.2 * widthScale;
      const coreWidth = 2.1 * widthScale;
      const fullWidth = 1.4 * widthScale;

      if (progress <= 1) {
        // --- Phase 1: animated bullet segment ---
        // Head of the bullet (clamped to [0, 1])
        const headProgress = Math.min(progress, 1);
        // Tail sits one segment-length behind the head, floored at 0
        const tailProgress = Math.max(headProgress - tracer.segmentFraction, 0);

        drawQuadraticSegment(
          tracer.graphics,
          tailProgress,
          headProgress,
          killerX,
          killerY,
          controlX,
          controlY,
          victimX,
          victimY,
        );
        tracer.graphics.stroke({ width: glowWidth, color, alpha: 0.25 });

        drawQuadraticSegment(
          tracer.graphics,
          tailProgress,
          headProgress,
          killerX,
          killerY,
          controlX,
          controlY,
          victimX,
          victimY,
        );
        tracer.graphics.stroke({ width: coreWidth, color, alpha: 0.95 });
      } else {
        // --- Phase 2: full static line fading out ---
        const fadeElapsed = elapsed - tracer.travelDuration;
        const alpha = Math.max(0, 1 - fadeElapsed / tracer.fadeDuration);

        drawQuadraticSegment(
          tracer.graphics,
          0,
          1,
          killerX,
          killerY,
          controlX,
          controlY,
          victimX,
          victimY,
        );
        tracer.graphics.stroke({ width: fullWidth * 2.2, color, alpha: alpha * 0.16 });

        drawQuadraticSegment(
          tracer.graphics,
          0,
          1,
          killerX,
          killerY,
          controlX,
          controlY,
          victimX,
          victimY,
        );
        tracer.graphics.stroke({ width: fullWidth, color, alpha: alpha * 0.9 });
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
