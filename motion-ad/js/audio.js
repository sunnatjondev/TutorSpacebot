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
  let voiceAudio = null;
  let isMuted = false;
  let masterVolume = 0.85;
  let bgmVolume = 0.28; // Lowered background music so voiceover is crisp
  let voiceVolume = 1.0; // Voiceover prominent
  let sfxVolume = 0.70;
  let shouldBePlaying = false;
  let isAutoplayBlocked = false;
  let unlockListenersAttached = false;
  let isProceduralBgmActive = false;

  // --- Audio Ducking & Speech Synchronization State (Requirement R3) ---
  const DUCK_FACTOR_SPEECH = 0.22; // Background music drops to ~20-25% during speech
  const DUCK_FACTOR_PAUSE = 1.00;  // Recovers to 100% during pauses
  let currentDuck = 1.00;
  let targetDuck = 1.00;
  let duckAnimationId = null;
  let lastRestartTime = 0;
  let lastSyncTime = 0;
  let lastMuteToggleTime = 0;

  // Scene visual timing slots (GSAP 3 timeline aligned)
  const SPEECH_WINDOWS = [
    { id: 's1', start: 0.0, end: 2.8 },   // S1: Intro (0.0 — 3.2s)
    { id: 's2', start: 3.2, end: 5.3 },   // S2: Muammo 1 (3.2 — 5.6s)
    { id: 's3', start: 5.6, end: 7.7 },   // S3: Muammo 2 (5.6 — 8.0s)
    { id: 's4', start: 8.0, end: 9.9 },   // S4: Bridge (8.0 — 10.2s)
    { id: 's5', start: 10.2, end: 13.4 }, // S5: Guruhlar (10.2 — 13.8s)
    { id: 's6', start: 13.8, end: 17.0 }, // S6: Davomat (13.8 — 17.4s)
    { id: 's7', start: 17.4, end: 20.6 }, // S7: Moliya (17.4 — 21.0s)
    { id: 's8', start: 21.0, end: 24.2 }, // S8: Ota-ona (21.0 — 24.6s)
    { id: 's9', start: 24.6, end: 27.8 }, // S9: Jadval (24.6 — 28.2s)
    { id: 's10', start: 28.2, end: 31.6 }, // S10: Outro (28.2 — 32.0s)
  ];

  function isVoiceSpeaking(time) {
    let t = 0;
    if (typeof time === 'number' && !isNaN(time)) {
      t = time % 32.0;
    } else if (bgmAudio && !bgmAudio.paused && !isNaN(bgmAudio.currentTime) && bgmAudio.currentTime > 0) {
      t = bgmAudio.currentTime % 32.0;
    } else if (voiceAudio && !voiceAudio.paused && !isNaN(voiceAudio.currentTime)) {
      t = voiceAudio.currentTime % 32.0;
    }
    for (let i = 0; i < SPEECH_WINDOWS.length; i++) {
      const w = SPEECH_WINDOWS[i];
      if (t >= w.start && t <= w.end) return true;
    }
    return false;
  }

  function stopDuckingLoop() {
    if (duckAnimationId) {
      cancelAnimationFrame(duckAnimationId);
      duckAnimationId = null;
    }
  }

  function startDuckingLoop() {
    if (duckAnimationId) return;

    function tick() {
      if (!shouldBePlaying) {
        stopDuckingLoop();
        return;
      }
      if (bgmAudio) {
        const speaking = isVoiceSpeaking();
        targetDuck = speaking ? DUCK_FACTOR_SPEECH : DUCK_FACTOR_PAUSE;

        // Smooth attack / release ramp (~80ms) prevents any pops, clicks or clipping
        currentDuck += (targetDuck - currentDuck) * 0.14;
        currentDuck = Math.max(DUCK_FACTOR_SPEECH, Math.min(DUCK_FACTOR_PAUSE, currentDuck));

        if (isMuted) {
          bgmAudio.volume = 0;
          if (voiceAudio) voiceAudio.volume = 0;
        } else {
          const effectiveBgm = masterVolume * bgmVolume * currentDuck;
          bgmAudio.volume = Math.max(0, Math.min(1, effectiveBgm));
          if (voiceAudio) {
            voiceAudio.volume = Math.max(0, Math.min(1, masterVolume * voiceVolume));
          }
        }
      }
      duckAnimationId = requestAnimationFrame(tick);
    }

    duckAnimationId = requestAnimationFrame(tick);
  }

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
      if (shouldBePlaying && voiceAudio) {
        voiceAudio.play().catch(() => {});
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

    initVoicePlayer();
  }

  // --- Initialize Voiceover Player ---
  function initVoicePlayer() {
    if (voiceAudio) return;
    voiceAudio = document.getElementById('voiceOver');
    if (!voiceAudio) {
      voiceAudio = new Audio();
      voiceAudio.id = 'voiceOver';
    }
    voiceAudio.preload = 'auto';
    voiceAudio.loop = false; // Managed in lockstep with GSAP timeline and BGM
    voiceAudio.volume = isMuted ? 0 : masterVolume * voiceVolume;
    if (!voiceAudio.src || voiceAudio.src.endsWith('/index.html') || voiceAudio.src === location.href) {
      voiceAudio.src = 'assets/voiceover.wav';
    }

    // Dynamic browser-side audio alignment fallback:
    // If the voiceover asset is a raw unaligned multi-phrase recording (duration > 33s),
    // align it into an exact 32.0s master buffer via OfflineAudioContext and WAV Blob.
    let alignmentAttempted = false;
    function checkAndAlignVoiceover() {
      if (alignmentAttempted) return;
      if (voiceAudio.duration && !isNaN(voiceAudio.duration) && voiceAudio.duration > 33.5) {
        alignmentAttempted = true;
        alignRawVoiceoverToTimeline();
      }
    }

    voiceAudio.addEventListener('loadedmetadata', checkAndAlignVoiceover);
    voiceAudio.addEventListener('canplay', checkAndAlignVoiceover);

    voiceAudio.addEventListener('error', () => {
      console.warn('[Audio] Voiceover audio file not found or failed to load. Running in BGM-only fallback mode.');
    });
  }

  // Aligns raw voiceover recording to GSAP 3 timeline slots directly in browser Web Audio
  function alignRawVoiceoverToTimeline() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioCtx || !OfflineCtx) return;

    fetch(voiceAudio.src)
      .then(res => res.arrayBuffer())
      .then(buf => {
        const tempCtx = new AudioCtx();
        return tempCtx.decodeAudioData(buf);
      })
      .then(decoded => {
        const sRate = decoded.sampleRate;
        const totalDuration = 32.0;
        const totalOutSamples = Math.floor(sRate * totalDuration);
        const offline = new OfflineCtx(1, totalOutSamples, sRate);

        const channelData = decoded.getChannelData(0);
        const numSamples = decoded.length;

        // Energy-based silence segmentation in 15ms windows
        const wSize = Math.floor(sRate * 0.015);
        const nWindows = Math.floor(numSamples / wSize);
        const energies = new Float32Array(nWindows);
        for (let w = 0; w < nWindows; w++) {
          let sum = 0;
          const off = w * wSize;
          for (let i = 0; i < wSize; i++) sum += Math.abs(channelData[off + i]);
          energies[w] = sum / wSize;
        }

        const sorted = energies.slice().sort();
        const noiseFloor = sorted[Math.floor(sorted.length * 0.15)] || 0.001;
        const thresh = Math.max(0.012, noiseFloor * 2.8);
        const minSilenceWins = Math.floor(0.35 / 0.015);

        const rawSegs = [];
        let inSpeech = false;
        let sWin = 0;

        for (let w = 0; w < nWindows; w++) {
          const active = energies[w] > thresh;
          if (!inSpeech && active) {
            inSpeech = true;
            sWin = Math.max(0, w - 2);
          } else if (inSpeech && !active) {
            let sUntil = w;
            while (sUntil < nWindows && energies[sUntil] <= thresh) sUntil++;
            if (sUntil - w >= minSilenceWins || sUntil >= nWindows) {
              inSpeech = false;
              const startS = sWin * wSize;
              const endS = Math.min(numSamples, (w + 2) * wSize);
              if (endS - startS > sRate * 0.3) {
                rawSegs.push({ startS, endS });
              }
              w = sUntil - 1;
            }
          }
        }
        if (inSpeech) rawSegs.push({ startS: sWin * wSize, endS: numSamples });

        const segs = rawSegs.slice();
        while (segs.length > 10) {
          let minG = Infinity;
          let minI = 0;
          for (let i = 0; i < segs.length - 1; i++) {
            const g = segs[i + 1].startS - segs[i].endS;
            if (g < minG) { minG = g; minI = i; }
          }
          segs[minI].endS = segs[minI + 1].endS;
          segs.splice(minI + 1, 1);
        }

        while (segs.length < 10) {
          let maxL = 0;
          let maxI = 0;
          for (let i = 0; i < segs.length; i++) {
            const l = segs[i].endS - segs[i].startS;
            if (l > maxL) { maxL = l; maxI = i; }
          }
          const targetSeg = segs[maxI];
          const sWin = Math.floor(targetSeg.startS / wSize);
          const eWin = Math.floor(targetSeg.endS / wSize);
          const midStartW = sWin + Math.floor((eWin - sWin) * 0.35);
          const midEndW = sWin + Math.floor((eWin - sWin) * 0.65);

          let lowestE = Infinity;
          let splitW = Math.floor((sWin + eWin) / 2);
          for (let w = midStartW; w <= midEndW; w++) {
            if (energies[w] < lowestE) {
              lowestE = energies[w];
              splitW = w;
            }
          }
          const splitSample = Math.max(targetSeg.startS + wSize * 4, Math.min(targetSeg.endS - wSize * 4, splitW * wSize));
          segs.splice(maxI, 1,
            { startS: targetSeg.startS, endS: splitSample },
            { startS: splitSample, endS: targetSeg.endS }
          );
        }

        // Schedule the 10 phrases into their respective scene slots
        for (let i = 0; i < 10; i++) {
          const win = SPEECH_WINDOWS[i];
          const seg = segs[i];
          const maxSamples = Math.floor((win.end - win.start) * sRate);

          // Trim silence at head and tail of segment
          let actStart = seg.startS;
          let actEnd = seg.endS;
          while (actStart < actEnd && Math.abs(channelData[actStart]) < thresh * 0.4) actStart++;
          while (actEnd > actStart && Math.abs(channelData[actEnd - 1]) < thresh * 0.4) actEnd--;

          const segLen = actEnd - actStart;
          if (segLen <= 0) continue;

          // If phrase exceeds slot, use SOLA time-stretching with pitch preservation
          let phraseData;
          if (segLen <= maxSamples) {
            phraseData = channelData.subarray(actStart, actEnd);
          } else {
            // SOLA pitch-preserving time compression
            const speedRatio = segLen / maxSamples;
            const winSize = Math.floor(sRate * 0.024);
            const synthHop = Math.floor(winSize / 2);
            const maxSearch = Math.floor(sRate * 0.014);
            const outArr = new Float32Array(maxSamples);
            const initLen = Math.min(winSize, maxSamples, segLen);
            for (let k = 0; k < initLen; k++) outArr[k] = channelData[actStart + k];
            let outPos = synthHop;

            while (outPos + winSize <= maxSamples) {
              const nominalIn = Math.floor(outPos * speedRatio);
              let bestOffset = Math.max(0, Math.min(segLen - winSize, nominalIn));
              let bestCorr = -Infinity;
              const searchMin = Math.max(0, nominalIn - maxSearch);
              const searchMax = Math.max(0, Math.min(segLen - winSize, nominalIn + maxSearch));

              for (let cand = searchMin; cand <= searchMax; cand += 2) {
                let corr = 0;
                for (let j = 0; j < synthHop; j += 4) {
                  corr += outArr[outPos - synthHop + j] * channelData[actStart + cand + j];
                }
                if (corr > bestCorr) {
                  bestCorr = corr;
                  bestOffset = cand;
                }
              }

              bestOffset = Math.max(0, Math.min(segLen - winSize, bestOffset));

              for (let j = 0; j < synthHop && outPos + j < maxSamples; j++) {
                const w = j / synthHop;
                outArr[outPos + j] = outArr[outPos + j] * (1 - w) + channelData[actStart + bestOffset + j] * w;
              }
              for (let j = synthHop; j < winSize && outPos + j < maxSamples; j++) {
                outArr[outPos + j] = channelData[actStart + bestOffset + j];
              }

              outPos += synthHop;
              if (bestOffset + winSize >= segLen) break;
            }
            phraseData = outArr;
          }

          const phraseBuffer = offline.createBuffer(1, phraseData.length, sRate);
          phraseBuffer.copyToChannel(phraseData, 0);

          const srcNode = offline.createBufferSource();
          srcNode.buffer = phraseBuffer;

          const gainNode = offline.createGain();
          const effectiveDur = phraseData.length / sRate;

          // Anti-click raised-cosine fades (15ms in, 25ms out)
          const fadeInSec = Math.min(0.015, effectiveDur * 0.1);
          const fadeOutSec = Math.min(0.025, effectiveDur * 0.15);
          gainNode.gain.setValueAtTime(0.001, win.start);
          gainNode.gain.linearRampToValueAtTime(1.0, win.start + fadeInSec);
          gainNode.gain.setValueAtTime(1.0, win.start + Math.max(fadeInSec + 0.01, effectiveDur - fadeOutSec));
          gainNode.gain.linearRampToValueAtTime(0.001, win.start + effectiveDur);

          srcNode.connect(gainNode);
          gainNode.connect(offline.destination);

          srcNode.start(win.start);
          srcNode.stop(win.start + effectiveDur + 0.01);
        }

        return offline.startRendering();
      })
      .then(rendered => {
        if (!rendered) return;
        const blob = audioBufferToWavBlob(rendered);
        const blobUrl = URL.createObjectURL(blob);
        const curTime = voiceAudio.currentTime;
        const wasPlaying = shouldBePlaying && !voiceAudio.paused;

        const onMeta = () => {
          voiceAudio.removeEventListener('loadedmetadata', onMeta);
          try {
            voiceAudio.currentTime = Math.min(32.0, curTime % 32.0);
          } catch (_) {}
          if (wasPlaying && shouldBePlaying) {
            voiceAudio.play().catch(() => {});
          }
        };

        voiceAudio.addEventListener('loadedmetadata', onMeta, { once: true });
        voiceAudio.src = blobUrl;
        voiceAudio.load();
        console.log('[Audio] Studio voiceover dynamically aligned to 32.0s GSAP timeline via Web Audio.');
      })
      .catch(err => {
        console.warn('[Audio] Automatic browser voiceover alignment skipped:', err.message);
      });
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


  // Pre-calculated phrase cues for fallback playback of raw 57.7s unaligned recording
  // (e.g. file:/// protocol in START_CANVAS.bat where browser CORS policy blocks fetch)
  const RAW_PHRASE_CUES = [
    { id: 's1', cueStart: 0.0,  cueEnd: 3.2,  cueDur: 3.2,  slotStart: 0.0,  slotEnd: 3.2 },
    { id: 's2', cueStart: 4.2,  cueEnd: 9.2,  cueDur: 5.0,  slotStart: 3.2,  slotEnd: 5.6 },
    { id: 's3', cueStart: 10.2, cueEnd: 15.6, cueDur: 5.4,  slotStart: 5.6,  slotEnd: 8.0 },
    { id: 's4', cueStart: 16.5, cueEnd: 21.2, cueDur: 4.7,  slotStart: 8.0,  slotEnd: 10.2 },
    { id: 's5', cueStart: 22.0, cueEnd: 27.0, cueDur: 5.0,  slotStart: 10.2, slotEnd: 13.8 },
    { id: 's6', cueStart: 27.8, cueEnd: 32.8, cueDur: 5.0,  slotStart: 13.8, slotEnd: 17.4 },
    { id: 's7', cueStart: 33.6, cueEnd: 38.6, cueDur: 5.0,  slotStart: 17.4, slotEnd: 21.0 },
    { id: 's8', cueStart: 39.5, cueEnd: 44.5, cueDur: 5.0,  slotStart: 21.0, slotEnd: 24.6 },
    { id: 's9', cueStart: 45.4, cueEnd: 49.8, cueDur: 4.4,  slotStart: 24.6, slotEnd: 28.2 },
    { id: 's10',cueStart: 50.8, cueEnd: 57.2, cueDur: 6.4,  slotStart: 28.2, slotEnd: 32.0 },
  ];

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
      if (!voiceAudio) initVoicePlayer();

      const playPromise = bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && (err.name === 'NotAllowedError' || (err.message && err.message.toLowerCase().includes('autoplay')))) {
            // Autoplay was blocked by browser policy. Do not log error.
            isAutoplayBlocked = true;
            setupAutoplayUnlock();
          }
        });
      }

      if (voiceAudio) {
        const voicePromise = voiceAudio.play();
        if (voicePromise !== undefined) {
          voicePromise.catch((err) => {
            if (err && (err.name === 'NotAllowedError' || (err.message && err.message.toLowerCase().includes('autoplay')))) {
              isAutoplayBlocked = true;
              setupAutoplayUnlock();
            }
          });
        }
      }

      startDuckingLoop();
    },

    /**
     * Pause background music and voiceover
     */
    pauseBGM() {
      shouldBePlaying = false;
      if (bgmAudio) bgmAudio.pause();
      if (voiceAudio) voiceAudio.pause();
      stopDuckingLoop();
    },

    /**
     * Rewind background music and voiceover to start and play
     */
    restartBGM() {
      const now = Date.now();
      // Guard against rapid duplicate triggers from multiple listeners (Space/KeyR + #btnR)
      if (now - lastRestartTime < 120) return;
      lastRestartTime = now;

      if (bgmAudio) {
        try {
          bgmAudio.currentTime = 0;
        } catch (_) {}
      }
      if (voiceAudio) {
        try {
          voiceAudio.currentTime = 0;
        } catch (_) {}
      }
      currentDuck = DUCK_FACTOR_SPEECH; // S1 starts immediately with speech
      this.playBGM();
    },

    /**
     * Synchronize BGM and voiceover playback position to timeline second
     * @param {number} sec - Current GSAP timeline position in seconds
     * @param {boolean} [force=false] - Force immediate seek without drift threshold/cooldown
     */
    syncToTime(sec, force = false) {
      if (typeof sec !== 'number' || isNaN(sec)) return;
      const now = Date.now();
      const targetTime = Math.max(0, Math.min(32.0, sec % 32.0));

      // Throttle seeking during continuous playback to eliminate audio stutter/jitter
      if (!force && now - lastSyncTime < 200) return;

      const HARD_SEEK_THRESHOLD = force ? 0.05 : 0.45;
      const RATE_NUDGE_MIN = 0.12;

      // 1. Sync BGM
      if (bgmAudio && !bgmAudio.seeking) {
        const bgmDur = (bgmAudio.duration && !isNaN(bgmAudio.duration) && bgmAudio.duration > 0) ? bgmAudio.duration : 32.0;
        const bgmTarget = targetTime % bgmDur;
        const isReady = typeof bgmAudio.readyState === 'undefined' || bgmAudio.readyState >= 2;
        if (isReady) {
          const diff = bgmAudio.currentTime - bgmTarget;
          const absDiff = Math.abs(diff);

          if (absDiff > HARD_SEEK_THRESHOLD) {
            try {
              bgmAudio.currentTime = bgmTarget;
              bgmAudio.playbackRate = 1.0;
              lastSyncTime = now;
            } catch (_) {}
          } else if (!force && absDiff > RATE_NUDGE_MIN) {
            try {
              const targetRate = diff < 0 ? 1.025 : 0.975;
              if (Math.abs(bgmAudio.playbackRate - targetRate) > 0.01) {
                bgmAudio.playbackRate = targetRate;
              }
            } catch (_) {}
          } else if (bgmAudio.playbackRate !== 1.0) {
            try {
              bgmAudio.playbackRate = 1.0;
            } catch (_) {}
          }
        }
      }

      // 2. Sync Voiceover
      if (voiceAudio && !voiceAudio.seeking) {
        const isReady = typeof voiceAudio.readyState === 'undefined' || voiceAudio.readyState >= 2;
        if (isReady) {
          const isMasterAligned = !voiceAudio.duration || isNaN(voiceAudio.duration) || Math.abs(voiceAudio.duration - 32.0) <= 1.5;

          let voiceTarget = targetTime;
          let naturalSpeed = 1.0;

          if (!isMasterAligned && voiceAudio.duration > 33.0) {
            // Unaligned raw recording fallback (e.g. file:/// in START_CANVAS.bat)
            const cue = RAW_PHRASE_CUES.find(c => targetTime >= c.slotStart && targetTime < c.slotEnd) || RAW_PHRASE_CUES[0];
            const dt = targetTime - cue.slotStart;
            const slotDur = cue.slotEnd - cue.slotStart;
            const speechDur = Math.max(0.1, slotDur - 0.35); // 350ms breathing window

            if (dt < speechDur) {
              voiceTarget = cue.cueStart + (dt / speechDur) * cue.cueDur;
              naturalSpeed = Math.min(1.25, cue.cueDur / speechDur);
            } else {
              voiceTarget = cue.cueEnd;
              naturalSpeed = 1.0;
            }
          }

          const diff = voiceAudio.currentTime - voiceTarget;
          const absDiff = Math.abs(diff);

          if (absDiff > HARD_SEEK_THRESHOLD) {
            try {
              voiceAudio.currentTime = voiceTarget;
              voiceAudio.playbackRate = naturalSpeed;
              lastSyncTime = now;
            } catch (_) {}
          } else if (!force && absDiff > RATE_NUDGE_MIN) {
            try {
              const nudge = diff < 0 ? 1.025 : 0.975;
              const targetRate = naturalSpeed * nudge;
              if (Math.abs(voiceAudio.playbackRate - targetRate) > 0.01) {
                voiceAudio.playbackRate = targetRate;
              }
            } catch (_) {}
          } else if (Math.abs(voiceAudio.playbackRate - naturalSpeed) > 0.01) {
            try {
              voiceAudio.playbackRate = naturalSpeed;
            } catch (_) {}
          }
        }
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
      if (typeof val !== 'number' || isNaN(val)) return;
      masterVolume = Math.max(0, Math.min(1, val));
      if (bgmAudio) bgmAudio.volume = isMuted ? 0 : masterVolume * bgmVolume * currentDuck;
      if (voiceAudio) voiceAudio.volume = isMuted ? 0 : masterVolume * voiceVolume;
    },
    setBgmVolume(val) {
      if (typeof val !== 'number' || isNaN(val)) return;
      bgmVolume = Math.max(0, Math.min(1, val));
      if (bgmAudio) bgmAudio.volume = isMuted ? 0 : masterVolume * bgmVolume * currentDuck;
    },
    setVoiceVolume(val) {
      if (typeof val !== 'number' || isNaN(val)) return;
      voiceVolume = Math.max(0, Math.min(1, val));
      if (voiceAudio) voiceAudio.volume = isMuted ? 0 : masterVolume * voiceVolume;
    },
    setSfxVolume(val) {
      if (typeof val !== 'number' || isNaN(val)) return;
      sfxVolume = Math.max(0, Math.min(1, val));
    },

    /**
     * Mute / Unmute controls
     */
    mute() {
      isMuted = true;
      if (bgmAudio) {
        bgmAudio.muted = true;
        bgmAudio.volume = 0;
      }
      if (voiceAudio) {
        voiceAudio.muted = true;
        voiceAudio.volume = 0;
      }
    },
    unmute() {
      isMuted = false;
      if (bgmAudio) {
        bgmAudio.muted = false;
        bgmAudio.volume = Math.max(0, Math.min(1, masterVolume * bgmVolume * currentDuck));
      }
      if (voiceAudio) {
        voiceAudio.muted = false;
        voiceAudio.volume = Math.max(0, Math.min(1, masterVolume * voiceVolume));
      }
    },
    toggleMute() {
      const now = Date.now();
      // Guard against rapid duplicate keystrokes or dual listeners (motion.js + audio.js)
      if (now - lastMuteToggleTime < 150) return isMuted;
      lastMuteToggleTime = now;

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
        voiceVolume,
        sfxVolume,
        duckFactor: currentDuck,
        isSpeaking: isVoiceSpeaking(),
        shouldBePlaying,
        isAutoplayBlocked,
        isProceduralBgmActive,
        currentTime: bgmAudio ? bgmAudio.currentTime : 0,
        voiceTime: voiceAudio ? voiceAudio.currentTime : 0,
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
        if (!window._tutorSpaceMotionLoaded) {
          TutorSpaceAudio.restartBGM();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (window._tutorSpaceMotionLoaded) return;
      if (e.code === 'Space' || e.code === 'KeyR') {
        TutorSpaceAudio.restartBGM();
      }
      if (e.code === 'KeyM') {
        TutorSpaceAudio.toggleMute();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && shouldBePlaying) {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (bgmAudio && bgmAudio.paused) {
          bgmAudio.play().catch(() => {});
        }
        if (voiceAudio && voiceAudio.paused) {
          voiceAudio.play().catch(() => {});
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDOMIntegration);
  } else {
    setupDOMIntegration();
  }
})(window);
