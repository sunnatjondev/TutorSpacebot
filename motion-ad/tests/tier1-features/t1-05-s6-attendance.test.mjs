import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 5 - S6 Davomat (Attendance) Screen', () => {
  const { doc } = loadHTML();

  test('S6 container and feature card exist with number 02 and label DAVOMAT', () => {
    const s6 = doc.getElementById('s6');
    expect(s6).toBeDefined();
    const f2 = doc.getElementById('f2');
    expect(f2).toBeDefined();
    expect(f2.querySelector('.feat-num').textContent.trim()).toBe('02');
    expect(f2.querySelector('.feat-label').textContent.trim()).toBe('DAVOMAT');
  });

  test('S6 heading presents authentic Uzbek copy', () => {
    const h2 = doc.querySelector('#f2 h2');
    expect(h2).toBeDefined();
    expect(h2.textContent).toContain('1 bosishda davomat');
    expect(h2.textContent).toContain('ota-onaga avtoxabar');
  });

  test('S6 contains mark-all action button with check-circle-2 icon', () => {
    const btn = doc.querySelector('#f2 .ui-mark-all');
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain('Hammani bor deb belgilash');
    expect(btn.querySelector('[data-lucide="check-circle-2"]')).toBeDefined();
  });

  test('S6 student list contains attendance rows with avatars and names', () => {
    const rows = doc.querySelectorAll('#f2 .ui-att-row');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const rowTexts = rows.map(r => r.textContent);
    expect(rowTexts.some(t => t.includes('Sardor Karimov'))).toBeTruthy();
    expect(rowTexts.some(t => t.includes('Malika Toshmatova'))).toBeTruthy();
  });

  test('S6 attendance rows distinguish present and absent toggles with parent alert toast', () => {
    const toggles = doc.querySelectorAll('#f2 .ui-toggle');
    expect(toggles.length).toBeGreaterThanOrEqual(2);
    const alertToast = doc.querySelector('#f2 .ui-toast');
    expect(alertToast).toBeDefined();
    expect(alertToast.textContent).toContain('Ota-onaga');
  });
});
