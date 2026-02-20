import type { PlayerFrame } from '@pubg-replay/shared-types';
import { type Container, Graphics, Text, TextStyle } from 'pixi.js';

// Arc/pie overlay colors — indicate team relationship or focus
const PLAYER_COLORS = {
  highlighted: 0x7aff4a, // bright green  — focused / selected player
  friendly:    0xd4a832, // amber         — same team as focused player
  enemy:       0x6a8ac8, // steel blue    — all other players
};

// Status circle fill colors — indicate health state
const STATUS_COLORS = {
  alive:   0x444444, // dark grey  — normal living player
  knocked: 0xff8800, // orange     — health = 0 but still "alive" (knocked down)
  dead:    0x2a2a2a, // near-black — eliminated
};

const STROKE_WIDTH  = 1.5;
const DOT_RADIUS    = 4;        // px — matches pubgsh reference (8 px diameter)
const DEAD_RADIUS   = 3;        // slightly smaller dot for dead players
const DEAD_ALPHA    = 0.35;
const POSITION_SMOOTHING = 0.16;
const SNAP_DISTANCE_PX = 120;

interface PlayerDot {
  graphics: Graphics;
  label: Text;
  accountId: string;
  renderX: number;
  renderY: number;
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

  update(players: PlayerFrame[], canvasWidth: number, canvasHeight: number, zoom = 1): void {
    const safeZoom = Math.max(zoom, 0.001);
    const scale = 1 / safeZoom;
    const dotRadius = DOT_RADIUS * scale;
    const deadRadius = DEAD_RADIUS * scale;
    const strokeWidth = STROKE_WIDTH * scale;

    for (const player of players) {
      const x = player.x * canvasWidth;
      const y = player.y * canvasHeight;

      // ── 1. Create graphics + label for first-seen players ──────────────────
      let dot = this.dots.get(player.accountId);

      if (!dot) {
        const graphics = new Graphics();
        const labelStyle = new TextStyle({
          fontFamily: 'IBM Plex Mono',
          fontSize: 9 * scale,
          fill: 0xc8d8b0,
        });
        const label = new Text({ text: player.name, style: labelStyle });
        label.anchor.set(0.5, 0);

        this.container.addChild(graphics);
        this.container.addChild(label);

        dot = { graphics, label, accountId: player.accountId, renderX: x, renderY: y };
        this.dots.set(player.accountId, dot);
      }
      (dot.label.style as TextStyle).fontSize = 9 * scale;

      // ── 2. Determine player (arc) color ────────────────────────────────────
      let playerColor: number;
      if (player.accountId === this.highlightedAccountId) {
        playerColor = PLAYER_COLORS.highlighted;
      } else if (this.friendlyTeamId !== null && player.teamId === this.friendlyTeamId) {
        playerColor = PLAYER_COLORS.friendly;
      } else {
        playerColor = PLAYER_COLORS.enemy;
      }

      // ── 3. Determine status (circle fill) color ────────────────────────────
      const isKnocked = player.isAlive && player.health === 0;
      let statusColor: number;
      if (!player.isAlive) {
        statusColor = STATUS_COLORS.dead;
      } else if (isKnocked) {
        statusColor = STATUS_COLORS.knocked;
      } else {
        statusColor = STATUS_COLORS.alive;
      }

      // ── 4. Clear previous frame's drawing ─────────────────────────────────
      dot.graphics.clear();
      dot.graphics.alpha = 1;

      if (player.isAlive) {
        // ── 5a. Alive (including knocked): status circle + health arc ─────────
        const strokeColor = playerColor;

        // Layer 1 — status circle with black stroke
        dot.graphics
          .circle(0, 0, dotRadius)
          .fill({ color: statusColor })
          .stroke({ color: strokeColor, width: strokeWidth });

        // Layer 2 — health arc (pie sector) drawn on top
        // Knocked players have health = 0, so the arc covers 0° (invisible).
        // Full health = full circle; partial health = partial arc.
        const health = Math.max(0, Math.min(100, player.health ?? 100));
        if (health > 0) {
          const startAngle = -Math.PI / 2;                        // 12 o'clock
          const endAngle   = startAngle + (health / 100) * Math.PI * 2;

          dot.graphics
            .moveTo(0, 0)
            .arc(0, 0, dotRadius, startAngle, endAngle)
            .lineTo(0, 0)
            .fill({ color: playerColor });
        }
      } else {
        // ── 5b. Dead: small dim grey dot (no X marker) ───────────────────────
        dot.graphics
          .circle(0, 0, deadRadius)
          .fill({ color: STATUS_COLORS.dead });
        dot.graphics.alpha = DEAD_ALPHA;
      }

      // ── 6. Position graphics and label ────────────────────────────────────
      // Smooth small frame-to-frame movement; snap on large jumps (seek/teleport).
      const dx = x - dot.renderX;
      const dy = y - dot.renderY;
      const distance = Math.hypot(dx, dy);
      if (distance > SNAP_DISTANCE_PX) {
        dot.renderX = x;
        dot.renderY = y;
      } else {
        dot.renderX += dx * POSITION_SMOOTHING;
        dot.renderY += dy * POSITION_SMOOTHING;
      }

      dot.graphics.position.set(dot.renderX, dot.renderY);
      dot.label.position.set(dot.renderX, dot.renderY + dotRadius + 2 * scale);
      dot.label.visible = player.accountId === this.highlightedAccountId;
    }
  }

  clear(): void {
    this.container.removeChildren();
    this.dots.clear();
  }
}
