import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 13 - Rich Micro-Interactions (R2)', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Timeline defines at least 3 distinct feature micro-interactions', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const microTargets = tl.tweens.map(tw => tw.target).filter(t => 
      t.includes('.ui-att-row.absent') ||
      t.includes('.ui-btn-remind') ||
      t.includes('.ui-hw-fill') ||
      t.includes('.ui-ping') ||
      t.includes('.ui-toast')
    );
    expect(microTargets.length).toBeGreaterThanOrEqual(3);
  });

  test('S6 Davomat includes attendance toggle absent row pulse animation', () => {
    expect(motionCode).toContain('#f2 .ui-att-row.absent');
    expect(motionCode).toMatch(/boxShadow|pulse/i);
  });

  test('S6 Davomat includes parent notification toast animation', () => {
    expect(motionCode).toContain('#f2 .ui-toast');
    expect(motionCode).toContain('opacity');
  });

  test('S7 Moliya includes remind CTA button micro-interaction', () => {
    expect(motionCode).toContain('#f3 .ui-btn-remind');
    expect(motionCode).toContain('scale');
  });

  test('S9 Jadval includes homework fill bar and live ping dot animation', () => {
    expect(motionCode).toContain('#f5 .ui-hw-fill');
    expect(motionCode).toContain('#f5 .ui-ping');
  });
});
