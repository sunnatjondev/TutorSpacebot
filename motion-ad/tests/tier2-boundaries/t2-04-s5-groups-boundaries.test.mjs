import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 4 - S5 Guruhlar (Groups) Boundaries', () => {
  const { doc } = loadHTML();

  test('Group card attendance percentage is bounded between 0% and 100%', () => {
    const pctElem = doc.querySelector('#f1 .ui-pct');
    expect(pctElem).toBeDefined();
    const match = pctElem.textContent.match(/(\d+)%/);
    expect(match).toBeDefined();
    const val = parseInt(match[1], 10);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(100);
  });

  test('Group student count chip contains positive integer count', () => {
    const chip = doc.querySelector('#f1 .ui-chip.muted');
    expect(chip).toBeDefined();
    const match = chip.textContent.match(/(\d+)\s*ta/);
    expect(match).toBeDefined();
    const count = parseInt(match[1], 10);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100);
  });

  test('Invite URL deep-link parameter format contains valid identifier', () => {
    const inviteUrl = doc.querySelector('#f1 .ui-invite-url');
    expect(inviteUrl).toBeDefined();
    const text = inviteUrl.textContent;
    expect(text).toMatch(/start=([a-zA-Z0-9_-]+)/);
  });

  test('Invite copy button has non-empty label text', () => {
    const btn = doc.querySelector('#f1 .ui-invite button');
    expect(btn).toBeDefined();
    expect(btn.textContent.trim().length).toBeGreaterThan(2);
  });

  test('Student joined toast contains student avatar dot and username', () => {
    const toast = doc.querySelector('#f1 .ui-toast');
    expect(toast).toBeDefined();
    expect(toast.querySelector('.ui-toast-dot')).toBeDefined();
    expect(toast.textContent).toContain('@');
  });
});
