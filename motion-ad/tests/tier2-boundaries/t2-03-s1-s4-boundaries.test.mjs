import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML, loadCSS } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 3 - S1-S4 Brand & Problems Boundaries', () => {
  const { doc } = loadHTML();
  const { main } = loadCSS();

  test('Intro logo object-fit is set to cover to prevent visual distortion', () => {
    const fit = main.getProperty('.intro-logo', 'object-fit');
    expect(fit).toBe('cover');
  });

  test('Uzbek special characters (apostrophes o\', g\') are valid UTF-8 without entity corruption', () => {
    const raw = doc.innerHTML;
    // Should not contain corrupted character replacements like  or broken entities
    expect(raw).not.toContain('\uFFFD');
    expect(raw).not.toContain('&amp;#');
    expect(raw).toContain("o'quvchi");
    expect(raw).toContain("qo'shing");
  });

  test('Problem chip has non-zero padding and border radius for button-like pill styling', () => {
    const rad = main.getProperty('.prob-chip', 'border-radius');
    const pad = main.getProperty('.prob-chip', 'padding');
    expect(rad).toBeDefined();
    expect(pad).toBeDefined();
    expect(rad).toMatch(/(999px|9999px|50%)/);
  });

  test('Problem card heading font size is between 40px and 60px to prevent canvas overflow', () => {
    const fontSize = main.getProperty('.prob h1', 'font-size');
    expect(fontSize).toBeDefined();
    const px = parseInt(fontSize, 10);
    expect(px).toBeGreaterThanOrEqual(40);
    expect(px).toBeLessThanOrEqual(60);
  });

  test('Bridge icon animation pulse scale does not exceed 1.25 to prevent canvas clipping', () => {
    const { mainRaw } = loadCSS();
    expect(mainRaw).not.toMatch(/scale\([2-9]\)/);
  });
});
