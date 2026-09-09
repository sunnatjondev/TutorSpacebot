import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 15 - OBS Controls Boundaries', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Burst of 50 consecutive resize events runs without errors or unhandled exceptions', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    let errors = 0;
    for (let i = 0; i < 50; i++) {
      try {
        env.windowMock.innerWidth = 1000 + (i % 10) * 10;
        env.windowMock.innerHeight = 1800 + (i % 10) * 20;
        env.fireEvent('resize');
      } catch (e) {
        errors++;
      }
    }
    expect(errors).toBe(0);
  });

  test('Ignored keyboard events (Enter, Escape, Tab) do not alter timeline state', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(15.0);
    env.fireEvent('keydown', { code: 'Enter' });
    env.fireEvent('keydown', { code: 'Escape' });
    env.fireEvent('keydown', { code: 'Tab' });

    expect(tl.time()).toBe(15.0);
  });

  test('Designated hotkeys (Space, KeyR) call preventDefault()', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    let spacePrevented = false;
    let keyRPrevented = false;

    env.fireEvent('keydown', {
      code: 'Space',
      preventDefault: () => { spacePrevented = true; }
    });
    env.fireEvent('keydown', {
      code: 'KeyR',
      preventDefault: () => { keyRPrevented = true; }
    });

    expect(spacePrevented).toBe(true);
    expect(keyRPrevented).toBe(true);
  });

  test('Repeated KeyH toggling alternates .hidden class state reliably', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const obs = env.doc.getElementById('obs');
    expect(obs.classList.contains('hidden')).toBe(false);

    env.fireEvent('keydown', { code: 'KeyH' });
    expect(obs.classList.contains('hidden')).toBe(true);

    env.fireEvent('keydown', { code: 'KeyH' });
    expect(obs.classList.contains('hidden')).toBe(false);
  });

  test('Rapid double-press restart within 10ms maintains clean scene s1 activation', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(22.0);

    env.fireEvent('keydown', { code: 'KeyR', preventDefault: () => {} });
    env.fireEvent('keydown', { code: 'KeyR', preventDefault: () => {} });

    expect(tl.time()).toBe(0.0);
    const s1 = env.doc.getElementById('s1');
    expect(s1.classList.contains('on')).toBe(true);
  });
});
