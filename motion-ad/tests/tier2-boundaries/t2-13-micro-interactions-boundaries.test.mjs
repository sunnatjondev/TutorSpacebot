import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 13 - Micro-Interactions Boundaries', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Micro-interaction tween durations are bounded under 1.5 seconds', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const microTweens = tl.tweens.filter(tw => 
      tw.target.includes('.ui-att-row.absent') ||
      tw.target.includes('.ui-btn-remind') ||
      tw.target.includes('.ui-hw-fill') ||
      tw.target.includes('.ui-ping') ||
      tw.target.includes('.ui-toast')
    );

    for (const tw of microTweens) {
      expect(tw.duration).toBeLessThanOrEqual(1.5);
    }
  });

  test('Ping dot pulse animation uses finite repeat count', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const pingTween = tl.tweens.find(tw => tw.target.includes('.ui-ping'));
    expect(pingTween).toBeDefined();
    const repeat = pingTween.to.repeat;
    expect(repeat).toBeGreaterThanOrEqual(1);
    expect(repeat).toBeLessThanOrEqual(10);
  });

  test('Homework progress bar fromVars width starts at 0%', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const hwTween = tl.tweens.find(tw => tw.target.includes('.ui-hw-fill'));
    expect(hwTween).toBeDefined();
    expect(hwTween.from.width).toBe('0%');
  });

  test('Remind button scale bounce does not compress below 0.85', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const remindTween = tl.tweens.find(tw => tw.target.includes('.ui-btn-remind'));
    expect(remindTween).toBeDefined();
    expect(remindTween.to.scale).toBeGreaterThanOrEqual(0.85);
  });

  test('Toast slide-in horizontal displacement magnitude is bounded (|x| <= 100px)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const toastTween = tl.tweens.find(tw => tw.target.includes('#f2 .ui-toast'));
    expect(toastTween).toBeDefined();
    const fromX = Math.abs(toastTween.from.x || 0);
    expect(fromX).toBeLessThanOrEqual(100);
  });
});
