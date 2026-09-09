import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 6 - S7 Moliya (Finance) Screen', () => {
  const { doc } = loadHTML();

  test('S7 container and feature card exist with number 03 and label MOLIYA', () => {
    const s7 = doc.getElementById('s7');
    expect(s7).toBeDefined();
    const f3 = doc.getElementById('f3');
    expect(f3).toBeDefined();
    expect(f3.querySelector('.feat-num').textContent.trim()).toBe('03');
    expect(f3.querySelector('.feat-label').textContent.trim()).toBe('MOLIYA');
  });

  test('S7 heading presents authentic Uzbek copy', () => {
    const h2 = doc.querySelector('#f3 h2');
    expect(h2).toBeDefined();
    expect(h2.textContent).toContain("To'lovlar nazorati");
    expect(h2.textContent).toContain('qarzdorlarga eslatma');
  });

  test('S7 finance grid has 2-column cards for Tushum and Qarzdorlik with UZS currency', () => {
    const grid = doc.querySelector('#f3 .ui-fin-grid');
    expect(grid).toBeDefined();
    const cards = grid.querySelectorAll('.ui-fin-card');
    expect(cards.length).toBe(2);
    expect(grid.textContent).toContain('TUSHUM');
    expect(grid.textContent).toContain('QARZDORLIK');
    expect(grid.textContent).toContain('UZS');
  });

  test('S7 contains remind CTA button with bell icon and counter', () => {
    const btn = doc.querySelector('#f3 .ui-btn-remind');
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain('Qarzdorlarga eslatish');
    expect(btn.querySelector('[data-lucide="bell"]')).toBeDefined();
  });

  test('S7 payment rows feature colored left indicator bars and status badges', () => {
    const rows = doc.querySelectorAll('#f3 .ui-pay-row');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const bars = doc.querySelectorAll('#f3 .ui-pay-bar');
    expect(bars.length).toBeGreaterThanOrEqual(2);
    const badges = doc.querySelectorAll('#f3 .ui-pay-badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
    const badgeTexts = badges.map(b => b.textContent.trim());
    expect(badgeTexts.some(t => t.includes("To'langan"))).toBeTruthy();
    expect(badgeTexts.some(t => t.includes("To'lanmagan"))).toBeTruthy();
  });
});
