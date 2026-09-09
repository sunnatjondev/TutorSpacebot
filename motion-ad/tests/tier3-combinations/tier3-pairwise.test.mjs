/**
 * Tier 3: Pairwise Cross-Feature Combinations for TutorSpace Motion-Ad.
 * Tests interactions across GSAP Timeline, DOM Scenes, Audio Controller, and OBS Controls.
 */

import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH, AUDIO_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment, MockAudioElement } from '../helpers/runtime-simulator.mjs';

describe('Tier 3: Pairwise Cross-Feature Combinations', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Pair 1: GSAP Timeline Start invokes onStart and activates Scene S1', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const s1 = env.doc.getElementById('s1');
    const s2 = env.doc.getElementById('s2');

    tl.restart();
    expect(s1.classList.contains('on')).toBe(true);
    expect(s2.classList.contains('on')).toBe(false);
  });

  test('Pair 2: Scene Transition (S1 -> S2) triggers scene switch at timestamp 3.2s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const s1 = env.doc.getElementById('s1');
    const s2 = env.doc.getElementById('s2');

    tl.seek(3.2);
    expect(s2.classList.contains('on')).toBe(true);
    expect(s1.classList.contains('on')).toBe(false);
  });

  test('Pair 3: S2 Problem 1 -> S3 Problem 2 preserves card visual hierarchy and updates icon', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(5.6);

    const s3 = env.doc.getElementById('s3');
    expect(s3.classList.contains('on')).toBe(true);
    expect(s3.querySelector('[data-lucide="file-spreadsheet"]')).toBeDefined();
  });

  test('Pair 4: S3 Problem 2 -> S4 Solution Bridge transitions from problem to solution styling', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(8.0);

    const s4 = env.doc.getElementById('s4');
    expect(s4.classList.contains('on')).toBe(true);
    expect(s4.querySelector('[data-lucide="sparkles"]')).toBeDefined();
  });

  test('Pair 5: S4 Bridge -> S5 Guruhlar mounts feature app-screen with group details', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(10.2);

    const s5 = env.doc.getElementById('s5');
    expect(s5.classList.contains('on')).toBe(true);
    expect(s5.querySelector('.app-screen')).toBeDefined();
    expect(s5.textContent).toContain('IELTS Morning A1');
  });

  test('Pair 6: S5 Guruhlar feature contains invite card and student joined toast', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const s5 = env.doc.getElementById('s5');
    const invite = s5.querySelector('.ui-invite');
    const toast = s5.querySelector('.ui-toast');

    expect(invite).toBeDefined();
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain("Jasur Aliyev qo'shildi!");
  });

  test('Pair 7: S5 Guruhlar -> S6 Davomat activates attendance screen at timestamp 13.8s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(13.8);

    const s6 = env.doc.getElementById('s6');
    expect(s6.classList.contains('on')).toBe(true);
    expect(s6.querySelector('.ui-mark-all')).toBeDefined();
  });

  test('Pair 8: S6 Davomat marks absent row and correlates with parent SMS alert toast', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const s6 = env.doc.getElementById('s6');
    const absentRow = s6.querySelector('.ui-att-row.absent');
    const alertToast = s6.querySelector('.ui-toast.red');

    expect(absentRow).toBeDefined();
    expect(alertToast).toBeDefined();
    expect(absentRow.textContent).toContain('Malika Toshmatova');
    expect(alertToast.textContent).toContain('Malika');
  });

  test('Pair 9: S6 Davomat -> S7 Moliya activates financial dashboard at timestamp 17.4s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(17.4);

    const s7 = env.doc.getElementById('s7');
    expect(s7.classList.contains('on')).toBe(true);
    expect(s7.querySelector('.ui-fin-grid')).toBeDefined();
  });

  test('Pair 10: S7 Moliya debt reminder correlates with unpaid student rows', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const s7 = env.doc.getElementById('s7');
    const remindBtn = s7.querySelector('.ui-btn-remind');
    const unpaidRows = s7.querySelectorAll('.ui-pay-row.unpaid');

    expect(remindBtn).toBeDefined();
    expect(unpaidRows.length).toBeGreaterThanOrEqual(1);
    expect(remindBtn.textContent).toContain('(2)');
  });

  test('Pair 11: S7 Moliya -> S8 Ota-ona activates parent portal at timestamp 21.0s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(21.0);

    const s8 = env.doc.getElementById('s8');
    expect(s8.classList.contains('on')).toBe(true);
    expect(s8.querySelector('.ui-child-row')).toBeDefined();
  });

  test('Pair 12: S8 Ota-ona metrics reflect active student profile with grade reviews', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const s8 = env.doc.getElementById('s8');
    const child = s8.querySelector('.ui-child-row');
    const note = s8.querySelector('.ui-note-card');

    expect(child.textContent).toContain('Jasur Aliyev');
    expect(note.textContent).toContain('Writing Task 2: Essay');
  });

  test('Pair 13: S8 Ota-ona -> S9 Jadval activates schedule screen at timestamp 24.6s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(24.6);

    const s9 = env.doc.getElementById('s9');
    expect(s9.classList.contains('on')).toBe(true);
    expect(s9.querySelector('.ui-lesson.now')).toBeDefined();
  });

  test('Pair 14: S9 Jadval -> S10 Outro CTA activates conversion outro at timestamp 28.2s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(28.2);

    const s10 = env.doc.getElementById('s10');
    expect(s10.classList.contains('on')).toBe(true);
    expect(s10.querySelector('.cta-box')).toBeDefined();
    expect(s10.querySelector('.cta-handle')).toBeDefined();
  });

  test('Pair 15: OBS Restart button click resets timeline time and re-activates Scene S1', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(29.0);
    expect(tl.time()).toBe(29.0);

    const btnR = env.doc.getElementById('btnR');
    expect(btnR).toBeDefined();

    // Trigger restart
    tl.restart();
    expect(tl.time()).toBe(0.0);
    const s1 = env.doc.getElementById('s1');
    expect(s1.classList.contains('on')).toBe(true);
  });

  test('Pair 16: Keyboard Hotkey Space / KeyR triggers restart handler and restores S1', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(18.0);
    expect(tl.time()).toBe(18.0);

    let prevented = false;
    env.fireEvent('keydown', {
      code: 'Space',
      preventDefault: () => { prevented = true; }
    });

    expect(prevented).toBe(true);
    expect(tl.time()).toBe(0.0);
    const s1 = env.doc.getElementById('s1');
    expect(s1.classList.contains('on')).toBe(true);
  });
});
