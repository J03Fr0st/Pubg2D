import type { ZoneFrame } from '@pubg-replay/shared-types';
import { type Container, Graphics } from 'pixi.js';

export class ZoneRenderer {
  private container: Container;
  private closedOverlay: Graphics;
  private safeZone: Graphics;
  private poisonZone: Graphics;
  private redZone: Graphics;
  private visible = true;

  constructor(container: Container) {
    this.container = container;
    this.closedOverlay = new Graphics();
    this.safeZone = new Graphics();
    this.poisonZone = new Graphics();
    this.redZone = new Graphics();
    // closed overlay sits behind the zone circles
    this.container.addChild(this.closedOverlay);
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

    // Closed-area tint disabled by request.
    this.closedOverlay.clear();

    // safetyZonePosition → the blue zone (current shrinking boundary)
    this.safeZone.clear();
    this.safeZone
      .circle(zone.safeX * canvasWidth, zone.safeY * canvasHeight, zone.safeRadius * canvasWidth)
      .stroke({ width: 2, color: 0x0000ff, alpha: 0.8 });

    // poisonGasWarningPosition → the white circle (next safe zone destination)
    this.poisonZone.clear();
    this.poisonZone
      .circle(
        zone.poisonX * canvasWidth,
        zone.poisonY * canvasHeight,
        zone.poisonRadius * canvasWidth,
      )
      .stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

    // Red zone — same semi-transparent red for fill and stroke (matches pubgsh)
    if (zone.redRadius > 0) {
      this.redZone.clear();
      this.redZone
        .circle(zone.redX * canvasWidth, zone.redY * canvasHeight, zone.redRadius * canvasWidth)
        .fill({ color: 0xff0000, alpha: 0.27 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.27 });
    } else {
      this.redZone.clear();
    }
  }
}
