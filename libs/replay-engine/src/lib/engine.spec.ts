// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ReplayEngine } from './engine';

// Mock pixi.js since it requires WebGL context
vi.mock('pixi.js', () => {
  class MockApplication {
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  }
  class MockContainer {
    addChild = vi.fn();
    removeChildren = vi.fn();
    label = '';
    children: any[] = [];
    visible = true;
  }
  class MockGraphics {
    circle = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    visible = true;
    alpha = 1;
  }
  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
  };
});

describe('ReplayEngine', () => {
  it('creates and initializes', async () => {
    const engine = new ReplayEngine();
    const container = document.createElement('div');
    await engine.init(container, 800, 600);
    expect(engine.getCanvas()).toBeInstanceOf(HTMLCanvasElement);
  });

  it('destroys cleanly', async () => {
    const engine = new ReplayEngine();
    const container = document.createElement('div');
    await engine.init(container, 800, 600);
    engine.destroy();
    // Should not throw
  });
});
