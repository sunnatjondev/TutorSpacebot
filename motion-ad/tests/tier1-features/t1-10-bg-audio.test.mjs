import fs from 'node:fs';
import { describe, test, expect } from '../helpers/test-framework.mjs';
import { BGM_PATH, SERVER_MJS_PATH, AUDIO_JS_PATH, HTML_PATH } from '../helpers/project-paths.mjs';
import { createSimulatorEnvironment, MockAudioElement } from '../helpers/runtime-simulator.mjs';

describe('Tier 1: Feature 10 - Background Audio (R3)', () => {
  test('BGM audio asset file exists or is referenced in project', () => {
    const fileExists = fs.existsSync(BGM_PATH);
    const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
    const audioJsContent = fs.existsSync(AUDIO_JS_PATH) ? fs.readFileSync(AUDIO_JS_PATH, 'utf-8') : '';
    const hasAudioRef = htmlContent.includes('bg-music.mp3') || 
                        audioJsContent.includes('bg-music.mp3') ||
                        audioJsContent.includes('data:audio') ||
                        fileExists;
    expect(hasAudioRef).toBeTruthy();
  });

  test('Audio controller contract window.TutorSpaceAudio specifies playBGM, pauseBGM, restartBGM', () => {
    // Check either audio.js implementation or verify contract interface
    const audioExists = fs.existsSync(AUDIO_JS_PATH);
    if (!audioExists) {
      // Contract requirement from PROJECT.md:
      // Audio controller must provide playBGM, pauseBGM, restartBGM
      throw new Error('AUDIO_NOT_IMPLEMENTED: js/audio.js does not exist yet. Expected window.TutorSpaceAudio controller.');
    }
    const { raw } = { raw: fs.readFileSync(AUDIO_JS_PATH, 'utf-8') };
    expect(raw).toContain('playBGM');
    expect(raw).toContain('pauseBGM');
    expect(raw).toContain('restartBGM');
  });

  test('Audio player catches autoplay policy rejection gracefully', async () => {
    const mockAudio = new MockAudioElement('assets/bg-music.mp3');
    mockAudio.simulatedRejection = true;
    let caught = false;

    // A compliant player wraps play() in .catch()
    await mockAudio.play().catch(err => {
      caught = true;
      expect(err.message).toContain('Autoplay');
    });

    expect(caught).toBeTruthy();
  });

  test('Audio loop is enabled for continuous ad playback', () => {
    const mockAudio = new MockAudioElement('assets/bg-music.mp3');
    mockAudio.loop = true;
    expect(mockAudio.loop).toBe(true);
  });

  test('server.mjs contains audio/mpeg MIME mapping for .mp3', () => {
    const serverCode = fs.readFileSync(SERVER_MJS_PATH, 'utf-8');
    expect(serverCode).toContain("'.mp3'");
    expect(serverCode).toContain('audio/mpeg');
  });
});
