import { Assets, Sprite, type Container } from 'pixi.js';

export class MapRenderer {
  private sprite: Sprite | null = null;
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
}
