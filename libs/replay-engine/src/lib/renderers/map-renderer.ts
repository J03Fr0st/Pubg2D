import { Assets, Graphics, Sprite, type Container } from 'pixi.js';

/** Extend a point in normalized (0-1) space along direction (ux, uy) until it hits a map edge. */
function extendToEdge(px: number, py: number, ux: number, uy: number): { x: number; y: number } {
  const ts: number[] = [];
  if (ux > 0) ts.push((1 - px) / ux);
  else if (ux < 0) ts.push(-px / ux);
  if (uy > 0) ts.push((1 - py) / uy);
  else if (uy < 0) ts.push(-py / uy);
  const t = Math.min(...ts);
  return { x: px + t * ux, y: py + t * uy };
}

export class MapRenderer {
  private sprite: Sprite | null = null;
  private planeShadow: Graphics | null = null;
  private planePath: Graphics | null = null;
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  async load(mapName: string, width: number, height: number): Promise<void> {
    const aliases: Record<string, string> = {
      Erangel_Main: 'Baltic_Main',
    };
    const candidates = Array.from(
      new Set([mapName, aliases[mapName], 'Baltic_Main'].filter((v): v is string => Boolean(v))),
    );

    let texture: Awaited<ReturnType<typeof Assets.load>> | null = null;
    for (const candidate of candidates) {
      try {
        texture = await Assets.load(`/assets/maps/${candidate}.png`);
        break;
      } catch {
        // Try the next candidate (alias/fallback).
      }
    }

    if (!texture) return;

    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    this.sprite = new Sprite(texture);
    this.sprite.width = width;
    this.sprite.height = height;
    this.sprite.zIndex = 0;
    this.container.addChild(this.sprite);
  }

  drawPlanePath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    width: number,
    height: number,
  ): void {
    // Direction in normalized (0-1) space
    const dnx = end.x - start.x;
    const dny = end.y - start.y;
    const dnlen = Math.sqrt(dnx * dnx + dny * dny);
    if (dnlen === 0) return;
    const unx = dnx / dnlen;
    const uny = dny / dnlen;

    // Extend both endpoints to the map edges
    const edgeStart = extendToEdge(start.x, start.y, -unx, -uny);
    const edgeEnd = extendToEdge(end.x, end.y, unx, uny);

    const x1 = edgeStart.x * width;
    const y1 = edgeStart.y * height;
    const x2 = edgeEnd.x * width;
    const y2 = edgeEnd.y * height;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const ux = dx / len;
    const uy = dy / len;

    if (this.planeShadow) {
      this.container.removeChild(this.planeShadow);
      this.planeShadow.destroy();
      this.planeShadow = null;
    }
    if (this.planePath) {
      this.container.removeChild(this.planePath);
      this.planePath.destroy();
      this.planePath = null;
    }

    const shadow = new Graphics();
    const g = new Graphics();
    const COLOR = 0xffffff;
    const SHADOW_COLOR = 0x000000;
    const ALPHA = 0.9;
    const SHADOW_ALPHA = 0.4;
    const DASH = 14;
    const GAP = 8;

    // Shadow pass (slightly wider, dark)
    let t = 0;
    let drawing = true;
    while (t < len) {
      const segLen = Math.min(drawing ? DASH : GAP, len - t);
      if (drawing) {
        const sx = x1 + ux * t;
        const sy = y1 + uy * t;
        const ex = x1 + ux * (t + segLen);
        const ey = y1 + uy * (t + segLen);
        shadow.moveTo(sx, sy).lineTo(ex, ey).stroke({ width: 5, color: SHADOW_COLOR, alpha: SHADOW_ALPHA });
      }
      t += segLen;
      drawing = !drawing;
    }

    // White dashed line
    t = 0;
    drawing = true;
    while (t < len) {
      const segLen = Math.min(drawing ? DASH : GAP, len - t);
      if (drawing) {
        const sx = x1 + ux * t;
        const sy = y1 + uy * t;
        const ex = x1 + ux * (t + segLen);
        const ey = y1 + uy * (t + segLen);
        g.moveTo(sx, sy).lineTo(ex, ey).stroke({ width: 3, color: COLOR, alpha: ALPHA });
      }
      t += segLen;
      drawing = !drawing;
    }

    // Arrowhead shadow
    const ARROW = 12;
    const perpX = -uy;
    const perpY = ux;
    shadow
      .moveTo(x2, y2)
      .lineTo(x2 - ux * ARROW + perpX * (ARROW / 2), y2 - uy * ARROW + perpY * (ARROW / 2))
      .lineTo(x2 - ux * ARROW - perpX * (ARROW / 2), y2 - uy * ARROW - perpY * (ARROW / 2))
      .lineTo(x2, y2)
      .fill({ color: SHADOW_COLOR, alpha: SHADOW_ALPHA });

    // Arrowhead at end
    g.moveTo(x2, y2)
      .lineTo(x2 - ux * ARROW + perpX * (ARROW / 2), y2 - uy * ARROW + perpY * (ARROW / 2))
      .lineTo(x2 - ux * ARROW - perpX * (ARROW / 2), y2 - uy * ARROW - perpY * (ARROW / 2))
      .lineTo(x2, y2)
      .fill({ color: COLOR, alpha: ALPHA });

    shadow.zIndex = 1;
    g.zIndex = 2;
    this.container.addChild(shadow);
    this.container.addChild(g);
    this.planeShadow = shadow;
    this.planePath = g;
  }
}
