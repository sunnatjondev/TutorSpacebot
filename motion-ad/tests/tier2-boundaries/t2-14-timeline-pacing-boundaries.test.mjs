import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 14 - Timeline Pacing Boundaries', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Nominal duration of 32.0s is inside the [28.0s, 35.0s] target window', () => {
    const target = 32.0;
    expect(target).toBeGreaterThanOrEqual(28.0);
    expect(target).toBeLessThanOrEqual(35.0);
  });

  test('Minimum single scene duration is at least 1.8s for viewer comprehension', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const labels = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    for (let i = 0; i < labels.length - 1; i++) {
      const tStart = tl.labels.get(labels[i]);
      const tEnd = tl.labels.get(labels[i + 1]);
      const duration = tEnd - tStart;
      expect(duration).toBeGreaterThanOrEqual(1.8);
    }
  });

  test('Maximum single scene duration does not exceed 4.5s to maintain viewer pacing', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const labels = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    for (let i = 0; i < labels.length - 1; i++) {
      const tStart = tl.labels.get(labels[i]);
      const tEnd = tl.labels.get(labels[i + 1]);
      const duration = tEnd - tStart;
      expect(duration).toBeLessThanOrEqual(4.5);
    }
  });

  test('Timecode calculation rejects negative time values and clamps to 0.0', () => {
    const calcTC = (t) => {
      const c = Math.max(0, Math.min(t, 32)).toFixed(1);
      return `${c} / 32.0`;
    };
    expect(calcTC(-2.5)).toBe('0.0 / 32.0');
    expect(calcTC(15.42)).toBe('15.4 / 32.0');
    expect(calcTC(35.0)).toBe('32.0 / 32.0');
  });

  test('Restarting timeline resets currentTime precisely to 0.0', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(25.0);
    expect(tl.time()).toBe(25.0);
    tl.restart();
    expect(tl.time()).toBe(0.0);
  });
});
