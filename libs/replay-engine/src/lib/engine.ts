import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export class ReplayEngine {
  private app!: Application;
  private viewport!: Viewport;
  private mapLayer!: Container;
  private zoneLayer!: Container;
  private carePackageLayer!: Container;
  private playerLayer!: Container;
  private eventLayer!: Container;

  async init(container: HTMLElement, width: number, height: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width,
      height,
      backgroundColor: 0x0d1a0d,
      antialias: true,
    });
    container.appendChild(this.app.canvas);

    this.viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: width,
      worldHeight: height,
      events: this.app.renderer.events,
    });

    this.app.stage.addChild(this.viewport);

    this.viewport
      .drag()
      .pinch()
      .wheel()
      .clampZoom({ minScale: 0.5, maxScale: 10 });

    // Build layer stack inside the viewport
    this.mapLayer = new Container();
    this.mapLayer.label = 'map';

    this.zoneLayer = new Container();
    this.zoneLayer.label = 'zones';

    this.carePackageLayer = new Container();
    this.carePackageLayer.label = 'carePackages';

    this.playerLayer = new Container();
    this.playerLayer.label = 'players';

    this.eventLayer = new Container();
    this.eventLayer.label = 'events';

    this.viewport.addChild(this.mapLayer);
    this.viewport.addChild(this.zoneLayer);
    this.viewport.addChild(this.carePackageLayer);
    this.viewport.addChild(this.playerLayer);
    this.viewport.addChild(this.eventLayer);
  }

  getCanvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  getApp(): Application {
    return this.app;
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  getPlayerLayer(): Container {
    return this.playerLayer;
  }

  getZoneLayer(): Container {
    return this.zoneLayer;
  }

  getEventLayer(): Container {
    return this.eventLayer;
  }

  getCarePackageLayer(): Container {
    return this.carePackageLayer;
  }

  getMapLayer(): Container {
    return this.mapLayer;
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
