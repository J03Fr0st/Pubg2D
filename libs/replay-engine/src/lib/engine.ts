import { Application, Container } from 'pixi.js';

export class ReplayEngine {
  private app!: Application;
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

    // Build layer stack
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

    this.app.stage.addChild(this.mapLayer);
    this.app.stage.addChild(this.zoneLayer);
    this.app.stage.addChild(this.carePackageLayer);
    this.app.stage.addChild(this.playerLayer);
    this.app.stage.addChild(this.eventLayer);
  }

  getCanvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  getApp(): Application {
    return this.app;
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
