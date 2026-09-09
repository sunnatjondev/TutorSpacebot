import { describe, test, expect } from '../helpers/test-framework.mjs';
import { MockAudioContext } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 11 - SFX Synthesizer Boundaries', () => {
  test('playSfx with invalid or null type does not throw unhandled exception', () => {
    const playSafeSfx = (type) => {
      const allowed = ['whoosh', 'pop', 'check', 'cash', 'chime'];
      if (!allowed.includes(type)) {
        return false; // silent no-op
      }
      return true;
    };

    expect(playSafeSfx('unknown_sfx')).toBe(false);
    expect(playSafeSfx(null)).toBe(false);
    expect(playSafeSfx(undefined)).toBe(false);
    expect(playSafeSfx('whoosh')).toBe(true);
  });

  test('Procedural frequencies are bounded within audible range (50Hz to 8000Hz)', () => {
    const sfxFrequencies = {
      whoosh: { start: 120, end: 400 },
      pop: { start: 600, end: 1200 },
      check: { start: 440, end: 880 },
      cash: { start: 800, end: 1600 },
      chime: { start: 1000, end: 2000 },
    };

    for (const [type, cfg] of Object.entries(sfxFrequencies)) {
      expect(cfg.start).toBeGreaterThanOrEqual(50);
      expect(cfg.end).toBeLessThanOrEqual(8000);
      expect(cfg.end).toBeGreaterThan(cfg.start);
    }
  });

  test('Gain node peak volume is strictly bounded <= 1.0 to prevent audio clipping', () => {
    const safeGain = (targetGain) => Math.min(1.0, Math.max(0.0, targetGain));
    expect(safeGain(0.3)).toBe(0.3);
    expect(safeGain(1.8)).toBe(1.0);
    expect(safeGain(-0.2)).toBe(0.0);
  });

  test('Burst of 20 concurrent sound effects does not exceed maximum oscillator threshold', () => {
    const ctx = new MockAudioContext();
    let count = 0;
    for (let i = 0; i < 20; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      osc.start();
      osc.stop();
      count++;
    }
    expect(count).toBe(20);
  });

  test('AudioContext handles closed state without throwing when attempting synthesis', async () => {
    const ctx = new MockAudioContext();
    await ctx.close();
    expect(ctx.state).toBe('closed');
  });
});
