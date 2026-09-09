import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 8 - S9 Jadval (Schedule) Screen', () => {
  const { doc } = loadHTML();

  test('S9 container and feature card exist with number 05 and label DARS JADVALI', () => {
    const s9 = doc.getElementById('s9');
    expect(s9).toBeDefined();
    const f5 = doc.getElementById('f5');
    expect(f5).toBeDefined();
    expect(f5.querySelector('.feat-num').textContent.trim()).toBe('05');
    expect(f5.querySelector('.feat-label').textContent.trim()).toBe('DARS JADVALI');
  });

  test('S9 heading presents authentic Uzbek copy', () => {
    const h2 = doc.querySelector('#f5 h2');
    expect(h2).toBeDefined();
    expect(h2.textContent).toContain('Jadval va vazifalar');
    expect(h2.textContent).toContain('yagona tizimda');
  });

  test('S9 Day strip contains weekday pills with an active day indicator', () => {
    const days = doc.querySelectorAll('#f5 .ui-days span');
    expect(days.length).toBeGreaterThanOrEqual(5);
    const activeDay = doc.querySelector('#f5 .ui-days span.active');
    expect(activeDay).toBeDefined();
  });

  test('S9 Lesson card includes time range, subject title, and live pulsing dot', () => {
    const lesson = doc.querySelector('#f5 .ui-lesson.now');
    expect(lesson).toBeDefined();
    expect(lesson.textContent).toContain('IELTS Intensive');
    const ping = lesson.querySelector('.ui-ping');
    expect(ping).toBeDefined();
  });

  test('S9 Homework card includes progress bar and submission stats', () => {
    const hw = doc.querySelector('#f5 .ui-hw');
    expect(hw).toBeDefined();
    expect(hw.querySelector('.ui-hw-fill')).toBeDefined();
    expect(hw.textContent).toMatch(/Topshirdi:\s*\d+\s*\/\s*\d+/);
  });
});
