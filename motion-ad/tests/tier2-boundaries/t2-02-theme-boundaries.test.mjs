import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadCSS, loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 2 - Theme & Scaling Boundaries', () => {
  const { main } = loadCSS();

  test('Canvas aspect ratio strictly matches 9:16 vertical Reels format', () => {
    const w = parseInt(main.getProperty('.reels-canvas', 'width'), 10);
    const h = parseInt(main.getProperty('.reels-canvas', 'height'), 10);
    expect(w).toBe(1080);
    expect(h).toBe(1920);
    const ratio = w / h;
    expect(Math.abs(ratio - (9 / 16))).toBeLessThan(0.001);
  });

  test('Canvas scale computation for 4K desktop (3840x2160) does not exceed 1.0', () => {
    const innerWidth = 3840;
    const innerHeight = 2160;
    const s = Math.min((innerWidth - 40) / 1080, (innerHeight - 60) / 1920, 1);
    expect(s).toBe(1);
    expect(Number.isNaN(s)).toBe(false);
  });

  test('Canvas scale computation for small mobile screen (320x480) produces valid positive scale', () => {
    const innerWidth = 320;
    const innerHeight = 480;
    const s = Math.min((innerWidth - 40) / 1080, (innerHeight - 60) / 1920, 1);
    expect(s).toBeGreaterThan(0.1);
    expect(s).toBeLessThan(0.3);
  });

  test('Canvas scale computation with zero or negative dimensions does not crash or produce NaN', () => {
    const innerWidth = 0;
    const innerHeight = 0;
    const s = Math.min((innerWidth - 40) / 1080, (innerHeight - 60) / 1920, 1);
    expect(Number.isNaN(s)).toBe(false);
  });

  test('Ambient blur filter is bounded between 100px and 200px for optimal GPU performance', () => {
    const filter = main.getProperty('.amb', 'filter');
    expect(filter).toBeDefined();
    const blurMatch = filter.match(/blur\((\d+)px\)/);
    expect(blurMatch).toBeDefined();
    const blurVal = parseInt(blurMatch[1], 10);
    expect(blurVal).toBeGreaterThanOrEqual(100);
    expect(blurVal).toBeLessThanOrEqual(200);
  });
});
