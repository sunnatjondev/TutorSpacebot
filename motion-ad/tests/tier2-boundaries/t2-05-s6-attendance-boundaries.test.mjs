import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 5 - S6 Davomat (Attendance) Boundaries', () => {
  const { doc } = loadHTML();

  test('Attendance toggles include both present (.on) and absent (.off) states', () => {
    const onToggle = doc.querySelector('#f2 .ui-toggle.on');
    const offToggle = doc.querySelector('#f2 .ui-toggle.off');
    expect(onToggle).toBeDefined();
    expect(offToggle).toBeDefined();
  });

  test('All student avatar initials are exactly 2 capital letters', () => {
    const avas = doc.querySelectorAll('#f2 .ui-ava');
    expect(avas.length).toBeGreaterThanOrEqual(3);
    for (const ava of avas) {
      const text = ava.textContent.trim();
      expect(text).toMatch(/^[A-Z]{2}$/);
    }
  });

  test('Absent row has dedicated .absent class modifier for distinct styling', () => {
    const absentRow = doc.querySelector('#f2 .ui-att-row.absent');
    expect(absentRow).toBeDefined();
    const avatar = absentRow.querySelector('.ui-ava');
    expect(avatar.classList.contains('red')).toBe(true);
  });

  test('Mark-all button contains valid Lucide icon element', () => {
    const btn = doc.querySelector('#f2 .ui-mark-all');
    expect(btn).toBeDefined();
    const icon = btn.querySelector('i[data-lucide]');
    expect(icon).toBeDefined();
  });

  test('Parent notification alert toast quotes absent student name', () => {
    const toast = doc.querySelector('#f2 .ui-toast');
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain('Malika');
    expect(toast.textContent).toContain('kelmadi');
  });
});
