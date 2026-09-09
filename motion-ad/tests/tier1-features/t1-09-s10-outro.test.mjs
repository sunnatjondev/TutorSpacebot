import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 9 - S10 Outro CTA Screen', () => {
  const { doc } = loadHTML();

  test('S10 container and outro card exist with brand logo', () => {
    const s10 = doc.getElementById('s10');
    expect(s10).toBeDefined();
    const outro = doc.getElementById('outro');
    expect(outro).toBeDefined();
    const logo = outro.querySelector('img.intro-logo');
    expect(logo).toBeDefined();
    expect(logo.getAttribute('src')).toBe('assets/logo.jpg');
  });

  test('S10 headline presents conversion hook Bugunoq boshlang!', () => {
    const h1 = doc.querySelector('#outro h1');
    expect(h1).toBeDefined();
    expect(h1.textContent.trim()).toBe('Bugunoq boshlang!');
  });

  test('S10 description includes offer birinchi 30 kun bepul', () => {
    const tag = doc.querySelector('#outro .intro-tag');
    expect(tag).toBeDefined();
    expect(tag.textContent).toContain('birinchi 30 kun bepul');
  });

  test('S10 CTA pill contains comment action Izohlarda «+» qoldiring', () => {
    const cta = doc.querySelector('#outro .cta-box');
    expect(cta).toBeDefined();
    expect(cta.textContent).toContain('Izohlarda');
    expect(cta.textContent).toContain('+');
  });

  test('S10 displays official bot handle @TutorSpace_bot with bot icon', () => {
    const handle = doc.querySelector('#outro .cta-handle');
    expect(handle).toBeDefined();
    expect(handle.textContent).toContain('@TutorSpace_bot');
    expect(handle.querySelector('[data-lucide="bot"]')).toBeDefined();
  });
});
