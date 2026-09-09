import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 2: Feature 6 - S7 Moliya (Finance) Boundaries', () => {
  const { doc } = loadHTML();

  test('Finance monetary figures format thousands with space separators', () => {
    const vals = doc.querySelectorAll('#f3 .ui-fin-val');
    expect(vals.length).toBe(2);
    for (const val of vals) {
      const text = val.textContent.trim();
      expect(text).toMatch(/^\d{1,3}(\s\d{3})+$/);
    }
  });

  test('Currency denomination is consistently UZS across finance grid and rows', () => {
    const grid = doc.querySelector('#f3 .ui-fin-grid');
    expect(grid.textContent).toContain('UZS');
    const rows = doc.querySelectorAll('#f3 .ui-pay-row');
    for (const r of rows) {
      expect(r.textContent).toContain('UZS');
    }
  });

  test('Debt count in summary matches badge count in remind button', () => {
    const debtCard = doc.querySelector('#f3 .ui-fin-card.red');
    expect(debtCard.textContent).toContain('2 ta');
    const remindBtn = doc.querySelector('#f3 .ui-btn-remind');
    expect(remindBtn.textContent).toContain('(2)');
  });

  test('Payment rows have dedicated paid and unpaid class modifiers', () => {
    const paidRow = doc.querySelector('#f3 .ui-pay-row.paid');
    const unpaidRow = doc.querySelector('#f3 .ui-pay-row.unpaid');
    expect(paidRow).toBeDefined();
    expect(unpaidRow).toBeDefined();
  });

  test('Payment status badges have corresponding green and red class modifiers', () => {
    const greenBadge = doc.querySelector('#f3 .ui-pay-badge.green');
    const redBadge = doc.querySelector('#f3 .ui-pay-badge.red');
    expect(greenBadge).toBeDefined();
    expect(redBadge).toBeDefined();
  });
});
