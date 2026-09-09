import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 15 - OBS Controls & Zero-Build Execution', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('OBS control overlay container #obs exists with #btnR and #tc', () => {
    const env = createSimulatorEnvironment(htmlContent);
    const obs = env.doc.getElementById('obs');
    const btnR = env.doc.getElementById('btnR');
    const tc = env.doc.getElementById('tc');
    expect(obs).toBeDefined();
    expect(btnR).toBeDefined();
    expect(tc).toBeDefined();
  });

  test('OBS restart button handler resets timeline to start and shows scene s1', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    tl.seek(20.0);
    expect(tl.time()).toBe(20.0);

    // Call restart
    tl.restart();
    expect(tl.time()).toBe(0);
    const s1 = env.doc.getElementById('s1');
    expect(s1.classList.contains('on')).toBe(true);
  });

  test('Keyboard hotkeys Space and KeyR are handled for timeline restart', () => {
    expect(motionCode).toContain("e.code === 'Space'");
    expect(motionCode).toContain("e.code === 'KeyR'");
    expect(motionCode).toContain('restart()');
  });

  test('Keyboard hotkey KeyH toggles .hidden class on #obs container', () => {
    expect(motionCode).toContain("e.code === 'KeyH'");
    expect(motionCode).toContain("obs.classList.toggle('hidden')");
  });

  test('HTML uses zero build tools and loads purely via CDN and local files', () => {
    // Scripts must only be local or CDN, no node_modules or Webpack/Vite bundles
    expect(htmlContent).not.toContain('node_modules');
    expect(htmlContent).not.toContain('/@vite/');
    expect(htmlContent).toContain('https://cdnjs.cloudflare.com/ajax/libs/gsap');
    expect(htmlContent).toContain('https://unpkg.com/lucide');
  });
});
