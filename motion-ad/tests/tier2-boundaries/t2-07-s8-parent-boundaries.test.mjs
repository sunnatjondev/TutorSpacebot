import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 7 - S8 Ota-ona (Parent) Boundaries', () => {
  const { doc } = loadHTML();

  test('Attendance percentage metric value is bounded between 0% and 100%', () => {
    const val = doc.querySelector('#f4 .ui-m-val.green');
    expect(val).toBeDefined();
    const match = val.textContent.match(/(\d+)%/);
    expect(match).toBeDefined();
    const pct = parseInt(match[1], 10);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test('Task metric matches X/Y integer ratio where completed X <= total Y', () => {
    const val = doc.querySelector('#f4 .ui-m-val.purple');
    expect(val).toBeDefined();
    const match = val.textContent.match(/(\d+)\/(\d+)/);
    expect(match).toBeDefined();
    const completed = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    expect(completed).toBeLessThanOrEqual(total);
  });

  test('Child profile avatar has .lg class modifier for larger hero scale', () => {
    const childAva = doc.querySelector('#f4 .ui-child-row .ui-ava');
    expect(childAva).toBeDefined();
    expect(childAva.classList.contains('lg')).toBe(true);
  });

  test('Teacher feedback quote is non-empty and wrapped in quotes', () => {
    const comment = doc.querySelector('#f4 .ui-note-comment');
    expect(comment).toBeDefined();
    expect(comment.textContent.trim().length).toBeGreaterThan(5);
    expect(comment.textContent).toMatch(/["«]/);
  });

  test('Lesson grade badge is formatted as star rating', () => {
    const grade = doc.querySelector('#f4 .ui-note-grade');
    expect(grade).toBeDefined();
    expect(grade.textContent).toContain('⭐');
  });
});
