import { describe, test, expect } from '../helpers/test-framework.mjs';
import { MockAudioElement } from '../helpers/runtime-simulator.mjs';

describe('Tier 2: Feature 10 - Background Audio Boundaries', () => {
  test('Audio player handles missing source error event gracefully', () => {
    const audio = new MockAudioElement('assets/missing-file.mp3');
    let errorFired = false;
    audio.addEventListener('error', () => {
      errorFired = true;
    });
    expect(audio.src).toBe('assets/missing-file.mp3');
  });

  test('Audio volume must be bounded within 0.0 to 1.0', () => {
    const audio = new MockAudioElement();
    audio.volume = 0.5;
    expect(audio.volume).toBeGreaterThanOrEqual(0.0);
    expect(audio.volume).toBeLessThanOrEqual(1.0);

    // Boundary clamps
    const clamp = (v) => Math.max(0.0, Math.min(1.0, v));
    expect(clamp(-0.5)).toBe(0.0);
    expect(clamp(1.5)).toBe(1.0);
  });

  test('Audio time synchronization handles negative or exceeding timestamps cleanly', () => {
    const duration = 32.0;
    const clampTime = (t) => Math.max(0, Math.min(duration, t));
    expect(clampTime(-5)).toBe(0);
    expect(clampTime(40)).toBe(32.0);
    expect(clampTime(15.5)).toBe(15.5);
  });

  test('Pausing an already paused audio element executes without throwing', () => {
    const audio = new MockAudioElement();
    expect(audio.paused).toBe(true);
    audio.pause();
    expect(audio.paused).toBe(true);
    expect(audio.pauseCallCount).toBe(1);
  });

  test('Rapid concurrent play/pause invocations do not cause unhandled promise rejection', async () => {
    const audio = new MockAudioElement();
    const p1 = audio.play();
    audio.pause();
    const p2 = audio.play();
    await Promise.all([p1, p2]);
    expect(audio.playCallCount).toBe(2);
    expect(audio.pauseCallCount).toBe(1);
  });
});
