/**
 * Tier 4: Real-World Playback Workload Scenarios for TutorSpace Motion-Ad.
 * Comprehensive end-to-end simulations of 10-scene sequential execution, teacher workflows,
 * financial conversions, parent engagement, and OBS broadcast runs.
 */

import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { HTML_PATH, MOTION_JS_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment } from '../helpers/runtime-simulator.mjs';

describe('Tier 4: Real-World Playload Scenarios', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const motionCode = fs.readFileSync(MOTION_JS_PATH, 'utf-8');

  test('Scenario 1: Full 32s Playback Simulation across all 10 scenes without interruptions', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    expect(tl).toBeDefined();

    // Scene timeline sequence with expected timestamps
    const sceneSequence = [
      { id: 's1', time: 0.0, label: 's1' },
      { id: 's2', time: 3.2, label: 's2' },
      { id: 's3', time: 5.6, label: 's3' },
      { id: 's4', time: 8.0, label: 's4' },
      { id: 's5', time: 10.2, label: 's5' },
      { id: 's6', time: 13.8, label: 's6' },
      { id: 's7', time: 17.4, label: 's7' },
      { id: 's8', time: 21.0, label: 's8' },
      { id: 's9', time: 24.6, label: 's9' },
      { id: 's10', time: 28.2, label: 's10' },
    ];

    // Simulate stepping through time in 0.2s increments from 0 to 32s
    let currentActiveScene = null;
    const sceneTransitionsObserved = [];

    for (let t = 0; t <= 32.0; t += 0.2) {
      tl.seek(Number(t.toFixed(1)));
      for (const sc of sceneSequence) {
        const elem = env.doc.getElementById(sc.id);
        if (elem && elem.classList.contains('on')) {
          if (currentActiveScene !== sc.id) {
            currentActiveScene = sc.id;
            sceneTransitionsObserved.push({ id: sc.id, time: Number(t.toFixed(1)) });
          }
        }
      }
    }

    // Verify all 10 scenes were activated in correct sequential order
    const observedIds = sceneTransitionsObserved.map(s => s.id);
    expect(observedIds).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']);
  });

  test('Scenario 2: Teacher Workflow Showcase (Guruhlar S5 -> Davomat S6 -> Jadval S9)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];

    // 1. Visit Guruhlar (S5 at 10.2s)
    tl.seek(10.2);
    const s5 = env.doc.getElementById('s5');
    expect(s5.classList.contains('on')).toBe(true);
    expect(s5.textContent).toContain('IELTS Morning A1');
    expect(s5.textContent).toContain('14 ta');

    // 2. Advance to Davomat (S6 at 13.8s)
    tl.seek(13.8);
    const s6 = env.doc.getElementById('s6');
    expect(s6.classList.contains('on')).toBe(true);
    expect(s6.querySelector('.ui-mark-all')).toBeDefined();
    expect(s6.querySelector('.ui-att-row.absent')).toBeDefined();

    // 3. Advance to Jadval (S9 at 24.6s)
    tl.seek(24.6);
    const s9 = env.doc.getElementById('s9');
    expect(s9.classList.contains('on')).toBe(true);
    expect(s9.querySelector('.ui-days')).toBeDefined();
    expect(s9.querySelector('.ui-lesson.now')).toBeDefined();
    expect(s9.querySelector('.ui-hw-fill')).toBeDefined();
  });

  test('Scenario 3: Finance & Conversion Flow (Excel S3 -> Bridge S4 -> Moliya S7 -> Outro S10)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];

    // 1. Excel problem pain point
    tl.seek(5.6);
    const s3 = env.doc.getElementById('s3');
    expect(s3.classList.contains('on')).toBe(true);
    expect(s3.textContent).toContain('Excel-da');

    // 2. Bridge solution
    tl.seek(8.0);
    const s4 = env.doc.getElementById('s4');
    expect(s4.classList.contains('on')).toBe(true);
    expect(s4.textContent).toContain('TutorSpace ni');

    // 3. Finance dashboard with debt reminders
    tl.seek(17.4);
    const s7 = env.doc.getElementById('s7');
    expect(s7.classList.contains('on')).toBe(true);
    expect(s7.textContent).toContain('QARZDORLIK');
    expect(s7.textContent).toContain('450 000');

    // 4. Outro conversion CTA
    tl.seek(28.2);
    const s10 = env.doc.getElementById('s10');
    expect(s10.classList.contains('on')).toBe(true);
    expect(s10.textContent).toContain('Bugunoq boshlang!');
    expect(s10.textContent).toContain('@TutorSpace_bot');
  });

  test('Scenario 4: Parent Engagement Journey (Davomat Alert S6 -> Parent Portal S8)', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];

    // 1. Davomat absent alert sent to parents
    tl.seek(13.8);
    const s6 = env.doc.getElementById('s6');
    const toast = s6.querySelector('.ui-toast.red');
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain('Ota-onaga');

    // 2. Parent opens portal (S8 at 21.0s)
    tl.seek(21.0);
    const s8 = env.doc.getElementById('s8');
    expect(s8.classList.contains('on')).toBe(true);
    const childRow = s8.querySelector('.ui-child-row');
    const metrics = s8.querySelector('.ui-metrics-3');
    const note = s8.querySelector('.ui-note-card');

    expect(childRow.textContent).toContain('Jasur Aliyev');
    expect(metrics.textContent).toContain('96%');
    expect(metrics.textContent).toContain('5/5');
    expect(note.textContent).toContain('Writing Task 2: Essay');
  });

  test('Scenario 5: OBS Studio Broadcast Run & Controls Simulation', () => {
    const env = createSimulatorEnvironment(htmlContent);
    env.runScript(motionCode, 'motion.js');
    env.fireEvent('DOMContentLoaded');

    const tl = env.timelines[0];
    const obs = env.doc.getElementById('obs');
    const btnR = env.doc.getElementById('btnR');
    const tc = env.doc.getElementById('tc');

    expect(obs).toBeDefined();
    expect(btnR).toBeDefined();
    expect(tc).toBeDefined();

    // 1. Play ad halfway through
    tl.seek(16.0);
    expect(tl.time()).toBe(16.0);

    // 2. Hide OBS overlay via KeyH
    env.fireEvent('keydown', { code: 'KeyH' });
    expect(obs.classList.contains('hidden')).toBe(true);

    // 3. Show OBS overlay via KeyH
    env.fireEvent('keydown', { code: 'KeyH' });
    expect(obs.classList.contains('hidden')).toBe(false);

    // 4. Hotkey Restart via Space
    let prevented = false;
    env.fireEvent('keydown', { code: 'Space', preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(true);
    expect(tl.time()).toBe(0.0);

    const s1 = env.doc.getElementById('s1');
    expect(s1.classList.contains('on')).toBe(true);
  });
});
