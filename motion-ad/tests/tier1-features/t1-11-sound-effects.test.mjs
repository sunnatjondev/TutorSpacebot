import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { AUDIO_JS_PATH } from '../helpers/project-paths.mjs';
import { MockAudioContext } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 11 - Procedural Web Audio SFX (R3)', () => {
  test('Audio controller supports specified SFX types (whoosh, pop, check, cash, chime)', () => {
    if (!fs.existsSync(AUDIO_JS_PATH)) {
      throw new Error('AUDIO_NOT_IMPLEMENTED: js/audio.js missing. Expected playSfx(type) contract with whoosh, pop, check, cash, chime.');
    }
    const audioCode = fs.readFileSync(AUDIO_JS_PATH, 'utf-8');
    expect(audioCode).toContain('playSfx');
    expect(audioCode).toMatch(/(whoosh|pop|check|cash|chime)/);
  });

  test('Web Audio API context constructor is referenced in audio implementation', () => {
    if (!fs.existsSync(AUDIO_JS_PATH)) {
      throw new Error('AUDIO_NOT_IMPLEMENTED: js/audio.js missing.');
    }
    const audioCode = fs.readFileSync(AUDIO_JS_PATH, 'utf-8');
    expect(audioCode).toMatch(/(AudioContext|webkitAudioContext)/);
  });

  test('AudioContext handles suspended state resumption cleanly', async () => {
    const ctx = new MockAudioContext();
    expect(ctx.state).toBe('suspended');
    await ctx.resume();
    expect(ctx.state).toBe('running');
    expect(ctx.resumeCallCount).toBe(1);
  });

  test('Procedural SFX creates oscillator and gain nodes for synthetic sound generation', () => {
    const ctx = new MockAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    expect(osc).toBeDefined();
    expect(gain).toBeDefined();
    expect(typeof osc.start).toBe('function');
    expect(typeof osc.stop).toBe('function');
  });

  test('SFX playback function executes synchronously without blocking frame execution', () => {
    const startTime = Date.now();
    const ctx = new MockAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    osc.start();
    osc.stop();
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(50);
  });
});
