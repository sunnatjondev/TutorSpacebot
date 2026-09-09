import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 3 - S1-S4 Brand & Problems', () => {
  const { doc } = loadHTML();

  test('S1 Intro includes brand logo pointing to assets/logo.jpg and title TutorSpace', () => {
    const s1 = doc.getElementById('s1');
    expect(s1).toBeDefined();
    const logo = s1.querySelector('img.intro-logo');
    expect(logo).toBeDefined();
    expect(logo.getAttribute('src')).toBe('assets/logo.jpg');
    const name = s1.querySelector('.intro-name');
    expect(name).toBeDefined();
    expect(name.textContent.trim()).toBe('TutorSpace');
  });

  test('S1 Intro displays 3 authentic feature pills', () => {
    const pills = doc.querySelectorAll('#s1 .intro-pills span');
    expect(pills.length).toBe(3);
    const pillTexts = pills.map(p => p.textContent.trim());
    expect(pillTexts).toContain('Avtomatlashgan');
    expect(pillTexts).toContain('Telegram ichida');
    expect(pillTexts).toContain('Shaffof');
  });

  test('S2 Problem 1 contains authentic Uzbek copy and clipboard-x icon', () => {
    const s2 = doc.getElementById('s2');
    expect(s2).toBeDefined();
    const h1 = s2.querySelector('h1');
    expect(h1).toBeDefined();
    expect(h1.textContent).toContain('Davomatni');
    expect(h1.textContent).toContain('daftarda tekshiryapsizmi?');
    const icon = s2.querySelector('[data-lucide="clipboard-x"]');
    expect(icon).toBeDefined();
  });

  test('S3 Problem 2 contains authentic Uzbek copy and file-spreadsheet icon', () => {
    const s3 = doc.getElementById('s3');
    expect(s3).toBeDefined();
    const h1 = s3.querySelector('h1');
    expect(h1).toBeDefined();
    expect(h1.textContent).toContain("To'lovlarni Excel-da");
    expect(h1.textContent).toContain('charchadingizmi?');
    const icon = s3.querySelector('[data-lucide="file-spreadsheet"]');
    expect(icon).toBeDefined();
  });

  test('S4 Solution Bridge contains sparkles icon and headline', () => {
    const s4 = doc.getElementById('s4');
    expect(s4).toBeDefined();
    const h1 = s4.querySelector('h1');
    expect(h1).toBeDefined();
    expect(h1.textContent).toContain('TutorSpace ni');
    expect(h1.textContent).toContain("sinab ko'ring!");
    const icon = s4.querySelector('[data-lucide="sparkles"]');
    expect(icon).toBeDefined();
  });
});
