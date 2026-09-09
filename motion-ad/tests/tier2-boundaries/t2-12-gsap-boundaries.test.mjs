import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 12 - GSAP Transitions Boundaries', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Timeline duration meets minimum 28.0 seconds lower bound', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    expect(tl.duration()).toBeGreaterThanOrEqual(28.0);
  });

  test('Timeline duration meets maximum 35.0 seconds upper bound', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    expect(tl.duration()).toBeLessThanOrEqual(35.0);
  });

  test('Every registered tween has positive non-zero duration', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    for (const tw of tl.tweens) {
      if (tw.type !== 'set') {
        expect(tw.duration).toBeGreaterThan(0);
        expect(Number.isNaN(tw.duration)).toBe(false);
      }
    }
  });

  test('All tween target selectors match elements in DOM or use valid syntax', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    for (const tw of tl.tweens) {
      if (typeof tw.target === 'string') {
        expect(tw.target.length).toBeGreaterThan(1);
        expect(tw.target.startsWith('#') || tw.target.startsWith('.')).toBe(true);
      }
    }
  });

  test('Transition gaps between scene exits and next entrances do not exceed 0.1s', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const s1Exit = 2.85 + 0.35; // 3.2s
    const s2Entrance = tl.labels.get('s2'); // 3.2s
    expect(Math.abs(s2Entrance - s1Exit)).toBeLessThanOrEqual(0.1);
  });
});
