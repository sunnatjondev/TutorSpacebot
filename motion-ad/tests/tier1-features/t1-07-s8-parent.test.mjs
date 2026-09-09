import { describe, test, expect } from '../helpers/test-framework.mjs';
import { loadHTML } from '../helpers/project-paths.mjs';

describe('Tier 1: Feature 7 - S8 Ota-ona (Parent) Screen', () => {
  const { doc } = loadHTML();

  test('S8 container and feature card exist with number 04 and label OTA-ONA KABINETI', () => {
    const s8 = doc.getElementById('s8');
    expect(s8).toBeDefined();
    const f4 = doc.getElementById('f4');
    expect(f4).toBeDefined();
    expect(f4.querySelector('.feat-num').textContent.trim()).toBe('04');
    expect(f4.querySelector('.feat-label').textContent.trim()).toBe('OTA-ONA KABINETI');
  });

  test('S8 heading presents authentic Uzbek copy', () => {
    const h2 = doc.querySelector('#f4 h2');
    expect(h2).toBeDefined();
    expect(h2.textContent).toContain("Ota-onalar o'zlari");
    expect(h2.textContent).toContain('hamma narsani');
  });

  test('S8 Child profile row presents avatar, label Farzand:, and student name', () => {
    const row = doc.querySelector('#f4 .ui-child-row');
    expect(row).toBeDefined();
    expect(row.textContent).toContain('Farzand:');
    expect(row.textContent).toContain('Jasur Aliyev');
    expect(row.querySelector('.ui-ava')).toBeDefined();
  });

  test('S8 includes 3 metrics boxes', () => {
    const metrics = doc.querySelectorAll('#f4 .ui-metrics-3 .ui-m-box');
    expect(metrics.length).toBe(3);
    const text = doc.querySelector('#f4 .ui-metrics-3').textContent;
    expect(text).toContain('Davomat');
    expect(text).toContain('Vazifalar');
  });

  test('S8 includes lesson review card with star rating and teacher feedback', () => {
    const note = doc.querySelector('#f4 .ui-note-card');
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/⭐\s*5\/5/);
    expect(note.querySelector('.ui-note-comment')).toBeDefined();
  });
});
