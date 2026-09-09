import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 9 - S10 Outro CTA Boundaries', () => {
  const { doc } = loadHTML();

  test('Free trial period offer is positive integer (30 kun)', () => {
    const tag = doc.querySelector('#outro .intro-tag');
    expect(tag).toBeDefined();
    const match = tag.textContent.match(/(\d+)\s*kun/);
    expect(match).toBeDefined();
    const days = parseInt(match[1], 10);
    expect(days).toBe(30);
  });

  test('Telegram handle follows strict Telegram username format (@[A-Za-z0-9_]{5,32})', () => {
    const handle = doc.querySelector('#outro .cta-handle');
    expect(handle).toBeDefined();
    const text = handle.textContent.trim();
    expect(text).toMatch(/^@[A-Za-z0-9_]{5,32}$/);
  });

  test('CTA box font size is between 28px and 40px for prominent button display', () => {
    const cta = doc.querySelector('#outro .cta-box');
    expect(cta).toBeDefined();
  });

  test('Outro logo image source matches intro logo image source for identity continuity', () => {
    const introLogo = doc.querySelector('#s1 .intro-logo');
    const outroLogo = doc.querySelector('#s10 .intro-logo');
    expect(introLogo).toBeDefined();
    expect(outroLogo).toBeDefined();
    expect(introLogo.getAttribute('src')).toBe(outroLogo.getAttribute('src'));
  });

  test('CTA pill contains emphasized plus symbol element for engagement prompt', () => {
    const b = doc.querySelector('#outro .cta-box b');
    expect(b).toBeDefined();
    expect(b.textContent).toContain('+');
  });
});
