import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { PlayerFrame } from '@pubg-replay/shared-types';

const COLORS = {
  friendly: 0xd4a832,    // amber
  enemy: 0x6a7a5a,       // olive drab
  highlighted: 0x7aff4a, // bright green
  dead: 0xc84a2a,        // muted red
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
    for (const player of players) {
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
