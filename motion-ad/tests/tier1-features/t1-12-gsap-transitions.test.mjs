import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 12 - Cinematic GSAP Transitions (R2)', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('GSAP 3 library is imported in HTML via script tag', () => {
    expect(htmlContent).toContain('gsap/3');
    expect(htmlContent).toContain('gsap.min.js');
  });

  test('Timeline registers all 10 scene labels (s1 to s10)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    expect(env.timelines.length).toBeGreaterThan(0);
    const tl = env.timelines[0];
    const expectedLabels = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    for (const lbl of expectedLabels) {
      expect(tl.labels.has(lbl)).toBe(true);
    }
  });

  test('Transitions utilize easing curves defined in motion engine', () => {
    expect(motionCode).toContain('power3.out');
    expect(motionCode).toContain('back.out');
    expect(motionCode).toContain('power2.in');
  });

  test('Scene entrance transitions have duration >= 300ms (0.3s)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const entranceTweens = tl.tweens.filter(tw => tw.type === 'fromTo' && tw.duration >= 0.3);
    expect(entranceTweens.length).toBeGreaterThanOrEqual(10);
  });

  test('Scene switcher activates .on class on target scene element', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const s1 = env.doc.getElementById('s1');
    const s2 = env.doc.getElementById('s2');

    // On start, s1 should be on
    const tl = env.timelines[0];
    tl.restart();
    expect(s1.classList.contains('on')).toBe(true);
    expect(s2.classList.contains('on')).toBe(false);

    // Seek to s2
    tl.seek(3.2);
    expect(s2.classList.contains('on')).toBe(true);
    expect(s1.classList.contains('on')).toBe(false);
  });
});
