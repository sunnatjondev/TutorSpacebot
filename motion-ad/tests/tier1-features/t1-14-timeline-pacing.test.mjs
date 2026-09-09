import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 14 - Timeline Pacing & Looping (R2)', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Total timeline duration is between 28.0 and 35.0 seconds', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const duration = tl.duration();
    expect(duration).toBeGreaterThanOrEqual(28.0);
    expect(duration).toBeLessThanOrEqual(35.0);
  });

  test('Timeline repeat is configured for continuous ad looping (repeat: -1)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    expect(tl.vars.repeat).toBe(-1);
  });

  test('Timeline repeat delay is configured for clean loop rest', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    expect(tl.vars.repeatDelay).toBeGreaterThanOrEqual(1.0);
  });

  test('Scene labels are monotonically spaced in chronological sequence', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const labels = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    let prevTime = -1;
    for (const lbl of labels) {
      const t = tl.labels.get(lbl);
      expect(t).toBeGreaterThan(prevTime);
      prevTime = t;
    }
  });

  test('OBS timecode display targets 32.0s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const tcElem = env.doc.getElementById('tc');
    expect(tcElem).toBeDefined();
    expect(tcElem.textContent).toContain('32.0');
  });
});
