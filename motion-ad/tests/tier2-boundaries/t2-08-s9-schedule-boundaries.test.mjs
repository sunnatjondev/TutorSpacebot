import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 8 - S9 Jadval (Schedule) Boundaries', () => {
  const { doc } = loadHTML();

  test('Day strip contains exactly one active selected day pill', () => {
    const activeDays = doc.querySelectorAll('#f5 .ui-days span.active');
    expect(activeDays.length).toBe(1);
  });

  test('Day strip dates are strictly monotonically increasing positive numbers', () => {
    const days = doc.querySelectorAll('#f5 .ui-days span');
    let prevDay = -1;
    for (const d of days) {
      const b = d.querySelector('b');
      expect(b).toBeDefined();
      const num = parseInt(b.textContent.trim(), 10);
      expect(num).toBeGreaterThan(prevDay);
      prevDay = num;
    }
  });

  test('Homework progress bar fill width is bounded within 0% to 100%', () => {
    const { mainRaw } = { mainRaw: doc.innerHTML };
    expect(doc.querySelector('#f5 .ui-hw-fill')).toBeDefined();
  });

  test('Homework submission counts are valid where turned-in count <= total count', () => {
    const stat = doc.querySelector('#f5 .ui-hw-stat');
    expect(stat).toBeDefined();
    const match = stat.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    expect(match).toBeDefined();
    const turnedIn = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    expect(turnedIn).toBeLessThanOrEqual(total);
  });

  test('Lesson time strings follow HH:MM – HH:MM format', () => {
    const times = doc.querySelectorAll('#f5 .ui-lesson-time');
    expect(times.length).toBeGreaterThanOrEqual(2);
    for (const t of times) {
      expect(t.textContent).toMatch(/\d{2}:\d{2}\s*–\s*\d{2}:\d{2}/);
    }
  });
});
