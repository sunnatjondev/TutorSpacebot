/**
 * TutorSpace Motion Ad — Audio Subsystem (Requirement R3)
 * Provides:
 * - window.TutorSpaceAudio controller
 * - HTML5 BGM player with procedural Web Audio synthesis fallback
 * - Autoplay policy compliance with zero console errors
 * - Zero-dependency procedural Web Audio API SFX synthesizer
 * - OBS hotkey and timeline synchronization
 */

(function (window) {
  'use strict';

  // --- Internal Audio State ---
  let audioCtx = null;
  let bgmAudio = null;
  let isMuted = false;
  let masterVolume = 0.85;
  let bgmVolume = 0.70;
  let sfxVolume = 0.80;
  let shouldBePlaying = false;
  let isAutoplayBlocked = false;
  let unlockListenersAttached = false;
  let isProceduralBgmActive = false;

  // --- Safe AudioContext Initializer ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch (_) {}
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // --- Autoplay Policy Unlock Handlers ---
  function setupAutoplayUnlock() {
    if (unlockListenersAttached) return;
    unlockListenersAttached = true;

    const unlockEvents = ['click', 'touchstart', 'keydown'];
    const unlockHandler = function () {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (shouldBePlaying && bgmAudio) {
        bgmAudio.play().catch(() => {});
      }
      isAutoplayBlocked = false;
      unlockEvents.forEach((evt) => {
        window.removeEventListener(evt, unlockHandler);
      });
      unlockListenersAttached = false;
    };

    unlockEvents.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { once: true, passive: true });
    });
  }

  // --- WAV Blob Generator for Procedural BGM Fallback ---
  function audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = buffer.length;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, s, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // --- Procedural 32-Second BGM Synthesizer (OfflineAudioContext) ---
  function generateProceduralBgmTrack(onReady) {
    const sampleRate = 22050; // Fast rendering
    const duration = 32.0;
    const totalSamples = Math.floor(sampleRate * duration);
    const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    if (!OfflineCtxClass) {
      if (onReady) onReady(null);
      return;
    }

    const offlineCtx = new OfflineCtxClass(2, totalSamples, sampleRate);
    const bpm = 120.0;
    const beatSec = 60.0 / bpm; // 0.5s

    // Master Compressor / Limiter
    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-12, 0);
    comp.knee.setValueAtTime(8, 0);
    comp.ratio.setValueAtTime(4, 0);
    comp.attack.setValueAtTime(0.005, 0);
    comp.release.setValueAtTime(0.1, 0);
    comp.connect(offlineCtx.destination);

    // Filtered Noise Buffer for Hats/Snare
    const noiseLength = sampleRate * 1;
    const noiseBuffer = offlineCtx.createBuffer(1, noiseLength, sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    // Schedule 16 bars (64 beats)
    const totalBeats = 64;
    for (let b = 0; b < totalBeats; b++) {
      const t = b * beatSec;
      const bar = Math.floor(b / 4);
      const beatInBar = b % 4;

      // 1. Kick Drum (Beats 0, 1, 2, 3)
      if (b >= 8 || beatInBar === 0 || beatInBar === 2) {
        const kickOsc = offlineCtx.createOscillator();
        const kickGain = offlineCtx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(38, t + 0.09);
        kickGain.gain.setValueAtTime(0.7, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(comp);
        kickOsc.start(t);
        kickOsc.stop(t + 0.13);
      }

      // 2. Snare / Clap on Beats 1 and 3 (2nd and 4th beats)
      if (b >= 16 && (beatInBar === 1 || beatInBar === 3)) {
        const snareNoise = offlineCtx.createBufferSource();
        snareNoise.buffer = noiseBuffer;
        const snareFilter = offlineCtx.createBiquadFilter();
        snareFilter.type = 'bandpass';
        snareFilter.frequency.setValueAtTime(1200, t);
        snareFilter.Q.setValueAtTime(1.8, t);
        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.4, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        snareNoise.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(comp);
        snareNoise.start(t);
        snareNoise.stop(t + 0.16);
      }

      // 3. Hi-Hats on 8th notes
      for (let sub = 0; sub < 2; sub++) {
        const hatT = t + sub * (beatSec / 2);
        const hatNoise = offlineCtx.createBufferSource();
        hatNoise.buffer = noiseBuffer;
        const hatFilter = offlineCtx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(7000, hatT);
        const hatGain = offlineCtx.createGain();
        const isOffbeat = sub === 1;
        hatGain.gain.setValueAtTime(isOffbeat ? 0.18 : 0.10, hatT);
        hatGain.gain.exponentialRampToValueAtTime(0.001, hatT + (isOffbeat ? 0.07 : 0.04));
        hatNoise.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(comp);
        hatNoise.start(hatT);
        hatNoise.stop(hatT + 0.08);
      }

      // 4. Bassline: Root notes Am (55Hz), F (43.65Hz), C (65.4Hz), G (49Hz)
      const bassRoots = [55.0, 43.65, 65.4, 49.0];
      const rootFreq = bassRoots[Math.floor(bar / 4) % 4];
      if (b >= 8) {
        const bassOsc = offlineCtx.createOscillator();
        const bassFilter = offlineCtx.createBiquadFilter();
        const bassGain = offlineCtx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(rootFreq, t);
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(650, t);
        bassFilter.Q.setValueAtTime(2.5, t);
        bassGain.gain.setValueAtTime(0.35, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + (beatSec * 0.85));
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(comp);
        bassOsc.start(t);
        bassOsc.stop(t + beatSec);
      }

      // 5. Arpeggio / Chords: Pentatonic sparkle (A4, C5, D5, E5, G5)
      const scale = [440.0, 523.25, 587.33, 659.25, 783.99];
      const noteFreq = scale[(b * 3) % scale.length];
      const arpOsc = offlineCtx.createOscillator();
      const arpGain = offlineCtx.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(noteFreq, t);
      arpGain.gain.setValueAtTime(0.12, t);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      arpOsc.connect(arpGain);
      arpGain.connect(comp);
      arpOsc.start(t);
      arpOsc.stop(t + 0.25);
    }

    offlineCtx.startRendering().then((renderedBuffer) => {
      const blob = audioBufferToWavBlob(renderedBuffer);
      if (onReady) onReady(URL.createObjectURL(blob));
    }).catch(() => {
      if (onReady) onReady(null);
    });
  }

  // --- Initialize BGM Player ---
  function initBgmPlayer() {
    if (bgmAudio) return;

    bgmAudio = document.getElementById('bgMusic') || new Audio();
    bgmAudio.id = 'bgMusic';
    bgmAudio.loop = true;
    bgmAudio.preload = 'auto';
    bgmAudio.volume = isMuted ? 0 : masterVolume * bgmVolume;

    // Handle missing local file gracefully with procedural fallback
    let fallbackAttempted = false;
    const triggerFallback = function () {
      if (fallbackAttempted) return;
      fallbackAttempted = true;
      isProceduralBgmActive = true;
      generateProceduralBgmTrack((blobUrl) => {
        if (blobUrl && bgmAudio) {
          bgmAudio.src = blobUrl;
          if (shouldBePlaying) {
            bgmAudio.play().catch(() => {
              isAutoplayBlocked = true;
              setupAutoplayUnlock();
            });
          }
        }
      });
    };

    bgmAudio.addEventListener('error', triggerFallback);
    if (bgmAudio.error) {
      triggerFallback();
    }

    if (!bgmAudio.src || bgmAudio.src.endsWith('/index.html') || bgmAudio.src === location.href) {
      bgmAudio.src = 'assets/bg-music.mp3';
    }
  }

  // --- Procedural SFX Generators ---

  function playWhooshSfx(ctx) {
    const duration = 0.40;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, ctx.currentTime);
    filter.frequency.setValueAtTime(240, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.14);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.38);

    const gain = ctx.createGain();
    const peakVol = Math.max(0.001, (isMuted ? 0 : masterVolume * sfxVolume) * 0.35);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peakVol, ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  }

  function playPopSfx(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    const vol = Math.max(0.001, (isMuted ? 0 : masterVolume * sfxVolume) * 0.32);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t0);
    osc.frequency.linearRampToValueAtTime(820, t0 + 0.008);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.055);

    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.065);
  }

  function playCheckSfx(ctx) {
    const t0 = ctx.currentTime;
    const vol = Math.max(0.001, (isMuted ? 0 : masterVolume * sfxVolume) * 0.28);

    // Dual-tone chime: E5 (659Hz) -> C6 (1046Hz)
    const tones = [
      { freq: 659.25, start: 0.000, dur: 0.16 },
      { freq: 1046.50, start: 0.035, dur: 0.24 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, t0 + tone.start);

      gain.gain.setValueAtTime(0.001, t0 + tone.start);
      gain.gain.linearRampToValueAtTime(vol, t0 + tone.start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + tone.start + tone.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0 + tone.start);
      osc.stop(t0 + tone.start + tone.dur);
    });
  }

  function playCashSfx(ctx) {
    const t0 = ctx.currentTime;
    const vol = Math.max(0.001, (isMuted ? 0 : masterVolume * sfxVolume) * 0.26);

    // Ascending 4-note pentatonic sparkle arpeggio
    const notes = [
      { f: 1046.50, delay: 0.000 }, // C6
      { f: 1318.51, delay: 0.032 }, // E6
      { f: 1567.98, delay: 0.064 }, // G6
      { f: 2093.00, delay: 0.096 }, // C7
    ];

    notes.forEach((n) => {
      const startT = t0 + n.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, startT);

      gain.gain.setValueAtTime(0.001, startT);
      gain.gain.linearRampToValueAtTime(vol, startT + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.36);
    });
  }

  function playChimeSfx(ctx) {
    const t0 = ctx.currentTime;
    const vol = Math.max(0.001, (isMuted ? 0 : masterVolume * sfxVolume) * 0.24);

    // Radiant triad bell (A5, C#6, E6)
    const triad = [880.0, 1108.73, 1318.51];
    triad.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.56);
    });
  }

  // --- Public API Contract ---
  const TutorSpaceAudio = {
    /**
     * Start playing background music with graceful autoplay restriction handling
     */
    playBGM() {
      shouldBePlaying = true;
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!bgmAudio) initBgmPlayer();

      const playPromise = bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was blocked by browser policy. Do not log error.
          isAutoplayBlocked = true;
          setupAutoplayUnlock();
        });
      }
    },

    /**
     * Pause background music
     */
    pauseBGM() {
      shouldBePlaying = false;
      if (bgmAudio) bgmAudio.pause();
    },

    /**
     * Rewind background music to start and play
     */
    restartBGM() {
      if (bgmAudio) {
        try {
          bgmAudio.currentTime = 0;
        } catch (_) {}
      }
      this.playBGM();
    },

    /**
     * Synchronize BGM playback position to timeline second
     * @param {number} sec - Current GSAP timeline position in seconds
     */
    syncToTime(sec) {
      if (!bgmAudio || isNaN(sec)) return;
      const targetTime = sec % (bgmAudio.duration || 32.0);
      if (Math.abs(bgmAudio.currentTime - targetTime) > 0.35) {
        try {
          bgmAudio.currentTime = targetTime;
        } catch (_) {}
      }
    },

    /**
     * Trigger a zero-latency procedural Web Audio sound effect
     * @param {'whoosh'|'pop'|'check'|'cash'|'chime'|string} name
     */
    playSfx(name) {
      if (!name || typeof name !== 'string') return;
      // Guard against muted or zero volume to prevent Web Audio exponential ramp RangeError
      if (isMuted || masterVolume <= 0 || sfxVolume <= 0) return;

      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      try {
        switch (name) {
          case 'whoosh':
            playWhooshSfx(ctx);
            break;
          case 'pop':
          case 'tap':
            playPopSfx(ctx);
            break;
          case 'check':
          case 'checkmark':
            playCheckSfx(ctx);
            break;
          case 'cash':
          case 'counter':
            playCashSfx(ctx);
            break;
          case 'chime':
          case 'sparkle':
            playChimeSfx(ctx);
            break;
          default:
            break;
        }
      } catch (_) {
        // Suppress any unexpected Web Audio parameter ramp errors
      }
    },

    /**
     * Master volume controls
     */
    setMasterVolume(val) {
      masterVolume = Math.max(0, Math.min(1, val));
      if (bgmAudio) bgmAudio.volume = isMuted ? 0 : masterVolume * bgmVolume;
    },
    setBgmVolume(val) {
      bgmVolume = Math.max(0, Math.min(1, val));
      if (bgmAudio) bgmAudio.volume = isMuted ? 0 : masterVolume * bgmVolume;
    },
    setSfxVolume(val) {
      sfxVolume = Math.max(0, Math.min(1, val));
    },

    /**
     * Mute / Unmute controls
     */
    mute() {
      isMuted = true;
      if (bgmAudio) bgmAudio.volume = 0;
    },
    unmute() {
      isMuted = false;
      if (bgmAudio) bgmAudio.volume = masterVolume * bgmVolume;
    },
    toggleMute() {
      if (isMuted) this.unmute();
      else this.mute();
      return isMuted;
    },

    /**
     * Diagnostic state for E2E testing
     */
    getState() {
      return {
        isMuted,
        masterVolume,
        bgmVolume,
        sfxVolume,
        shouldBePlaying,
        isAutoplayBlocked,
        isProceduralBgmActive,
        currentTime: bgmAudio ? bgmAudio.currentTime : 0,
        duration: bgmAudio ? bgmAudio.duration : 32.0,
      };
    },
  };

  // Expose to global window
  window.TutorSpaceAudio = TutorSpaceAudio;

  // Auto-initialize audio element and bind OBS restart controls on page load
  function setupDOMIntegration() {
    initBgmPlayer();
    TutorSpaceAudio.playBGM();

    const btnR = document.getElementById('btnR');
    if (btnR) {
      btnR.addEventListener('click', () => {
        TutorSpaceAudio.restartBGM();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'KeyR') {
        TutorSpaceAudio.restartBGM();
      }
      if (e.code === 'KeyM') {
        TutorSpaceAudio.toggleMute();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDOMIntegration);
  } else {
    setupDOMIntegration();
  }
})(window);
