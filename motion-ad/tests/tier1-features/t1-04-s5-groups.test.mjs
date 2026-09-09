import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 4 - S5 Guruhlar (Groups) Screen', () => {
  const { doc } = loadHTML();

  test('S5 container and feature card exist with number 01 and label GURUHLAR', () => {
    const s5 = doc.getElementById('s5');
    expect(s5).toBeDefined();
    const f1 = doc.getElementById('f1');
    expect(f1).toBeDefined();
    const num = f1.querySelector('.feat-num');
    const label = f1.querySelector('.feat-label');
    expect(num.textContent.trim()).toBe('01');
    expect(label.textContent.trim()).toBe('GURUHLAR');
  });

  test('S5 heading presents authentic Uzbek copy', () => {
    const h2 = doc.querySelector('#f1 h2');
    expect(h2).toBeDefined();
    expect(h2.textContent).toContain("O'quvchini 1 klikda");
    expect(h2.textContent).toContain("qo'shing");
  });

  test('S5 Group card includes subject chip, student count, and group title', () => {
    const card = doc.querySelector('#f1 .ui-group-card');
    expect(card).toBeDefined();
    const chips = card.querySelectorAll('.ui-chip');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(card.textContent).toContain('Ingliz tili');
    expect(card.textContent).toContain('14 ta');
    expect(card.textContent).toContain('IELTS Morning A1');
  });

  test('S5 Invite box presents Telegram bot link and copy button', () => {
    const invite = doc.querySelector('#f1 .ui-invite');
    expect(invite).toBeDefined();
    expect(invite.textContent).toMatch(/t\.me\/.*(tut0rspacebot|tutorspace)/i);
    const btn = invite.querySelector('button');
    expect(btn).toBeDefined();
    expect(btn.textContent).toMatch(/(Nusxalash|Ulashish)/);
  });

  test('S5 includes toast notification for student joined', () => {
    const toast = doc.querySelector('#f1 .ui-toast');
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain("Jasur Aliyev qo'shildi!");
  });
});
