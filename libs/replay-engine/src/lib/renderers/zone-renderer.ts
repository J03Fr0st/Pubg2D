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

    // Safe zone (white circle)
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
