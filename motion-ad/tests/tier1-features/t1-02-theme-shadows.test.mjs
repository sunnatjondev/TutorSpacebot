import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML, loadCSS } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 2 - White Theme Polish & Shadows', () => {
  const { doc } = loadHTML();
  const { tokens, main } = loadCSS();

  test('Reels canvas has white background and 1080x1920 dimension styling', () => {
    const canvasBg = main.getProperty('.reels-canvas', 'background');
    const width = main.getProperty('.reels-canvas', 'width');
    const height = main.getProperty('.reels-canvas', 'height');
    expect(canvasBg).toBe('#FFFFFF');
    expect(width).toBe('1080px');
    expect(height).toBe('1920px');
  });

  test('M3 elevation shadows are defined in tokens', () => {
    const shadow1 = tokens.getVariable('--md-sys-shadow-1');
    const shadow2 = tokens.getVariable('--md-sys-shadow-2');
    const shadow3 = tokens.getVariable('--md-sys-shadow-3');
    expect(shadow1).toBeDefined();
    expect(shadow2).toBeDefined();
    expect(shadow3).toBeDefined();
  });

  test('Ambient glow elements exist in canvas for subtle gradient background', () => {
    const amb1 = doc.querySelector('.amb-1');
    const amb2 = doc.querySelector('.amb-2');
    const amb3 = doc.querySelector('.amb-3');
    expect(amb1).toBeDefined();
    expect(amb2).toBeDefined();
    expect(amb3).toBeDefined();
  });

  test('Problem cards (S2, S3) use distinct border and soft shadows', () => {
    const probBorder = main.getProperty('.prob', 'border');
    const probShadow = main.getProperty('.prob', 'box-shadow');
    expect(probBorder).toBeDefined();
    expect(probShadow).toBeDefined();
  });

  test('Visual hierarchy maintains scene containers (.sc) with absolute positioning', () => {
    const scPos = main.getProperty('.sc', 'position');
    const scInset = main.getProperty('.sc', 'inset');
    expect(scPos).toBe('absolute');
    expect(scInset).toBe('0');
  });
});
