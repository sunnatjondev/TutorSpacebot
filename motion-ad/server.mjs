import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
  '.json': 'application/json; charset=utf-8',
};

// Automatic generation and synthesis of high-fidelity BGM on server start if needed
function ensureBgmFile() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const bgmFile = path.join(assetsDir, 'bg-music.mp3');
  try {
    if (fs.existsSync(bgmFile) && fs.statSync(bgmFile).size > 500000) {
      return;
    }

    const sampleRate = 44100;
    const duration = 32.0;
    const numChannels = 2;
    const numSamples = Math.floor(sampleRate * duration);
    const bpm = 120.0;
    const beatSec = 60.0 / bpm;

    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);
    const noise = new Float32Array(sampleRate);
    for (let i = 0; i < sampleRate; i++) noise[i] = Math.random() * 2 - 1;

    for (let b = 0; b < 64; b++) {
      const tStart = b * beatSec;
      const startSample = Math.floor(tStart * sampleRate);
      const bar = Math.floor(b / 4);
      const beatInBar = b % 4;

      // 1. Kick Drum
      if (b >= 8 || beatInBar === 0 || beatInBar === 2) {
        const kickDur = 0.12;
        const kickSamples = Math.floor(kickDur * sampleRate);
        for (let i = 0; i < kickSamples && startSample + i < numSamples; i++) {
          const frac = i / kickSamples;
          const freq = 140 * Math.exp(-frac * 3.5);
          const phase = 2 * Math.PI * freq * (i / sampleRate);
          const amp = 0.65 * (1 - frac);
          const val = Math.sin(phase) * amp;
          left[startSample + i] += val;
          right[startSample + i] += val;
        }
      }

      // 2. Snare / Clap on Beats 1 and 3
      if (b >= 16 && (beatInBar === 1 || beatInBar === 3)) {
        const snareDur = 0.15;
        const snareSamples = Math.floor(snareDur * sampleRate);
        for (let i = 0; i < snareSamples && startSample + i < numSamples; i++) {
          const frac = i / snareSamples;
          const n = noise[i % sampleRate];
          const tone = Math.sin(2 * Math.PI * 180 * (i / sampleRate));
          const val = (n * 0.7 + tone * 0.3) * 0.35 * Math.exp(-frac * 8);
          left[startSample + i] += val * 0.9;
          right[startSample + i] += val * 1.1;
        }
      }

      // 3. Hi-Hats on 8th notes
      for (let sub = 0; sub < 2; sub++) {
        const hatStart = Math.floor((tStart + sub * (beatSec / 2)) * sampleRate);
        const hatDur = sub === 1 ? 0.07 : 0.04;
        const hatSamples = Math.floor(hatDur * sampleRate);
        for (let i = 0; i < hatSamples && hatStart + i < numSamples; i++) {
          const frac = i / hatSamples;
          const val = noise[i % sampleRate] * (sub === 1 ? 0.15 : 0.09) * Math.exp(-frac * 12);
          left[hatStart + i] += val * 1.1;
          right[hatStart + i] += val * 0.9;
        }
      }

      // 4. Bassline
      const bassRoots = [55.0, 43.65, 65.4, 49.0];
      const rootFreq = bassRoots[Math.floor(bar / 4) % 4];
      if (b >= 8) {
        const bassDur = beatSec * 0.85;
        const bassSamples = Math.floor(bassDur * sampleRate);
        for (let i = 0; i < bassSamples && startSample + i < numSamples; i++) {
          const frac = i / bassSamples;
          const phase = 2 * Math.PI * rootFreq * (i / sampleRate);
          const val = (Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.3) * 0.30 * Math.exp(-frac * 3.2);
          left[startSample + i] += val;
          right[startSample + i] += val;
        }
      }

      // 5. Arpeggio / Chords
      const scale = [440.0, 523.25, 587.33, 659.25, 783.99];
      const arpFreq = scale[(b * 3) % scale.length];
      const arpDur = 0.22;
      const arpSamples = Math.floor(arpDur * sampleRate);
      for (let i = 0; i < arpSamples && startSample + i < numSamples; i++) {
        const frac = i / arpSamples;
        const phase = 2 * Math.PI * arpFreq * (i / sampleRate);
        const val = Math.sin(phase) * 0.12 * Math.exp(-frac * 5.0);
        left[startSample + i] += val * (b % 2 === 0 ? 1.2 : 0.8);
        right[startSample + i] += val * (b % 2 === 0 ? 0.8 : 1.2);
      }
    }

    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const totalSize = 44 + dataSize;
    const buffer = Buffer.alloc(totalSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(totalSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // 16 bits
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const l = Math.max(-1, Math.min(1, left[i]));
      const r = Math.max(-1, Math.min(1, right[i]));
      buffer.writeInt16LE(l < 0 ? l * 0x8000 : l * 0x7FFF, offset);
      buffer.writeInt16LE(r < 0 ? r * 0x8000 : r * 0x7FFF, offset + 2);
      offset += 4;
    }

    fs.writeFileSync(bgmFile, buffer);
    console.log(`[Audio] Synthesized background music: ${bgmFile} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (err) {
    console.warn('[Audio] Could not pre-generate audio buffer:', err.message);
  }
}

// Check and generate BGM asset on launch
ensureBgmFile();

// Automatic verification and synthesis of 32-second synchronized studio voiceover
// Automatic verification and synthesis of 32-second synchronized studio voiceover
function ensureVoiceoverFile() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const voiceFile = path.join(assetsDir, 'voiceover.wav');
  try {
    if (!fs.existsSync(voiceFile) || fs.statSync(voiceFile).size < 1000) {
      return;
    }

    const existing = fs.readFileSync(voiceFile);
    if (existing.length < 44 || existing.subarray(0, 4).toString('ascii') !== 'RIFF') return;

    // Robust chunk-based WAV parser (handles arbitrary headers and metadata chunks)
    let fmtChunk = null;
    let dataOffset = 44;
    let dataLength = existing.length - 44;
    let parseOffset = 12;

    while (parseOffset + 8 <= existing.length) {
      const chunkId = existing.toString('ascii', parseOffset, parseOffset + 4);
      const chunkSize = existing.readUInt32LE(parseOffset + 4);
      if (chunkId === 'fmt ') {
        fmtChunk = {
          audioFormat: existing.readUInt16LE(parseOffset + 8),
          numChannels: existing.readUInt16LE(parseOffset + 10),
          sampleRate: existing.readUInt32LE(parseOffset + 12),
          byteRate: existing.readUInt32LE(parseOffset + 16),
          blockAlign: existing.readUInt16LE(parseOffset + 20),
          bitsPerSample: existing.readUInt16LE(parseOffset + 22),
        };
      } else if (chunkId === 'data') {
        dataOffset = parseOffset + 8;
        dataLength = Math.min(chunkSize, existing.length - dataOffset);
        break;
      }
      parseOffset += 8 + chunkSize + (chunkSize % 2);
    }

    const sampleRate = fmtChunk ? fmtChunk.sampleRate : 24000;
    const numChannels = fmtChunk ? fmtChunk.numChannels : 1;
    const bitsPerSample = fmtChunk ? fmtChunk.bitsPerSample : 16;
    const bytesPerSample = (bitsPerSample / 8) * numChannels;
    const duration = dataLength / (sampleRate * bytesPerSample);

    // If already master-aligned to ~32.0s (+/- 0.5s), keep intact
    if (Math.abs(duration - 32.0) < 0.5) {
      console.log(`[Audio] Validated 32.0s voiceover track: ${voiceFile} (${(existing.length / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }

    console.log(`[Audio] Aligning raw voiceover recording (${duration.toFixed(1)}s) to 32.0s GSAP timeline slots...`);
    const targetDuration = 32.0;
    const totalSamples = Math.floor(targetDuration * sampleRate);
    const masterPcm = Buffer.alloc(totalSamples * 2); // 16-bit mono target

    // 10 Scene visual timeline slots matching GSAP 3 timeline:
    const sceneSlots = [
      { id: 's1', start: 0.0, maxDur: 2.8 },   // S1: Intro (0.0 — 3.2s)
      { id: 's2', start: 3.2, maxDur: 2.2 },   // S2: Muammo 1 (3.2 — 5.6s)
      { id: 's3', start: 5.6, maxDur: 2.2 },   // S3: Muammo 2 (5.6 — 8.0s)
      { id: 's4', start: 8.0, maxDur: 2.0 },   // S4: Bridge (8.0 — 10.2s)
      { id: 's5', start: 10.2, maxDur: 3.2 },  // S5: Guruhlar (10.2 — 13.8s)
      { id: 's6', start: 13.8, maxDur: 3.2 },  // S6: Davomat (13.8 — 17.4s)
      { id: 's7', start: 17.4, maxDur: 3.2 },  // S7: Moliya (17.4 — 21.0s)
      { id: 's8', start: 21.0, maxDur: 3.2 },  // S8: Ota-ona (21.0 — 24.6s)
      { id: 's9', start: 24.6, maxDur: 3.2 },  // S9: Jadval (24.6 — 28.2s)
      { id: 's10', start: 28.2, maxDur: 3.4 }, // S10: Outro (28.2 — 32.0s)
    ];

    // Extract mono 16-bit source samples
    const rawData = existing.subarray(dataOffset, dataOffset + dataLength);
    const totalRawSamples = Math.floor(dataLength / bytesPerSample);
    const srcSamples = new Int16Array(totalRawSamples);

    for (let i = 0; i < totalRawSamples; i++) {
      if (numChannels === 1) {
        srcSamples[i] = rawData.readInt16LE(i * 2);
      } else {
        // Average stereo to mono
        const l = rawData.readInt16LE(i * 4);
        const r = rawData.readInt16LE(i * 4 + 2);
        srcSamples[i] = Math.round((l + r) / 2);
      }
    }

    // Short-time energy calculation in 10ms windows for speech activity detection
    const frameSize = Math.floor(sampleRate * 0.010); // 10ms frame
    const numFrames = Math.floor(totalRawSamples / frameSize);
    const energies = new Float32Array(numFrames);

    for (let f = 0; f < numFrames; f++) {
      let sum = 0;
      const base = f * frameSize;
      for (let i = 0; i < frameSize; i++) {
        const val = Math.abs(srcSamples[base + i]);
        sum += val;
      }
      energies[f] = sum / frameSize;
    }

    // Adaptive speech threshold
    const sorted = energies.slice().sort();
    const noiseFloor = sorted[Math.floor(sorted.length * 0.15)] || 50;
    const speechThreshold = Math.max(300, noiseFloor * 2.8);

    // Group frames into speech blocks separated by >= 350ms of silence
    const rawSegments = [];
    let inSpeech = false;
    let segStartFrame = 0;
    const minSilenceFrames = Math.floor(0.35 / 0.010); // 350ms

    for (let f = 0; f < numFrames; f++) {
      const active = energies[f] > speechThreshold;
      if (!inSpeech && active) {
        inSpeech = true;
        segStartFrame = Math.max(0, f - 2); // 20ms lead-in
      } else if (inSpeech && !active) {
        let silentUntil = f;
        while (silentUntil < numFrames && energies[silentUntil] <= speechThreshold) {
          silentUntil++;
        }
        if (silentUntil - f >= minSilenceFrames || silentUntil >= numFrames) {
          inSpeech = false;
          const startSample = segStartFrame * frameSize;
          const endSample = Math.min(totalRawSamples, (f + 2) * frameSize);
          if (endSample - startSample > sampleRate * 0.3) {
            rawSegments.push({ startSample, endSample });
          }
          f = silentUntil - 1;
        }
      }
    }
    if (inSpeech) {
      rawSegments.push({
        startSample: segStartFrame * frameSize,
        endSample: totalRawSamples,
      });
    }

    // Merge or split to achieve exactly 10 distinct scene segments
    let segments = rawSegments.slice();

    // If too many segments detected (e.g. from micro-pauses within a sentence), merge the closest pairs
    while (segments.length > 10) {
      let minGap = Infinity;
      let minIdx = 0;
      for (let i = 0; i < segments.length - 1; i++) {
        const gap = segments[i + 1].startSample - segments[i].endSample;
        if (gap < minGap) {
          minGap = gap;
          minIdx = i;
        }
      }
      segments[minIdx].endSample = segments[minIdx + 1].endSample;
      segments.splice(minIdx + 1, 1);
    }

    // If fewer than 10 segments (e.g. sentences merged), split longest segment at lowest energy valley
    while (segments.length < 10) {
      let maxLen = 0;
      let maxIdx = 0;
      for (let i = 0; i < segments.length; i++) {
        const len = segments[i].endSample - segments[i].startSample;
        if (len > maxLen) {
          maxLen = len;
          maxIdx = i;
        }
      }
      const seg = segments[maxIdx];
      const startF = Math.floor(seg.startSample / frameSize);
      const endF = Math.floor(seg.endSample / frameSize);
      const midStartF = startF + Math.floor((endF - startF) * 0.35);
      const midEndF = startF + Math.floor((endF - startF) * 0.65);

      let lowestE = Infinity;
      let splitF = Math.floor((startF + endF) / 2);
      for (let f = midStartF; f <= midEndF; f++) {
        if (energies[f] < lowestE) {
          lowestE = energies[f];
          splitF = f;
        }
      }
      const splitSample = Math.max(seg.startSample + frameSize * 4, Math.min(seg.endSample - frameSize * 4, splitF * frameSize));
      const segA = { startSample: seg.startSample, endSample: splitSample };
      const segB = { startSample: splitSample, endSample: seg.endSample };
      segments.splice(maxIdx, 1, segA, segB);
    }

    // True SOLA (Synchronized Overlap-Add) time-scaling helper
    // Uses normalized cross-correlation peak search to align pitch periods, preventing comb filtering or phase artifacts
    function solaTimeScale(src, startS, endS, maxAllowedSamples, sRate) {
      const inputLen = endS - startS;
      if (inputLen <= maxAllowedSamples || maxAllowedSamples <= 0) {
        return src.subarray(startS, Math.min(endS, startS + maxAllowedSamples));
      }

      const speedRatio = inputLen / maxAllowedSamples;
      const winSize = Math.floor(sRate * 0.024); // 24ms window
      const synthHop = Math.floor(winSize / 2);  // 12ms hop
      const maxSearch = Math.floor(sRate * 0.014); // +/- 14ms pitch search window

      if (winSize >= maxAllowedSamples || winSize >= inputLen) {
        return src.subarray(startS, startS + maxAllowedSamples);
      }

      const out = new Int16Array(maxAllowedSamples);
      let outPos = 0;

      // Copy initial window
      const initialCopy = Math.min(winSize, maxAllowedSamples, inputLen);
      for (let i = 0; i < initialCopy; i++) {
        out[i] = src[startS + i];
      }
      outPos += synthHop;

      while (outPos + winSize <= maxAllowedSamples) {
        const nominalIn = Math.floor(outPos * speedRatio);
        let bestOffset = Math.max(0, Math.min(inputLen - winSize, nominalIn));
        let bestCorr = -Infinity;

        // Find pitch period alignment via cross-correlation
        const searchMin = Math.max(0, nominalIn - maxSearch);
        const searchMax = Math.max(0, Math.min(inputLen - winSize, nominalIn + maxSearch));

        for (let candidate = searchMin; candidate <= searchMax; candidate += 2) {
          let corr = 0;
          for (let j = 0; j < synthHop; j += 4) {
            corr += out[outPos - synthHop + j] * src[startS + candidate + j];
          }
          if (corr > bestCorr) {
            bestCorr = corr;
            bestOffset = candidate;
          }
        }

        bestOffset = Math.max(0, Math.min(inputLen - winSize, bestOffset));

        // Overlap-add with exact linear crossfade in hop region, direct copy in extension
        for (let i = 0; i < synthHop && outPos + i < maxAllowedSamples; i++) {
          const w = i / synthHop;
          const prev = out[outPos + i];
          const curr = src[startS + bestOffset + i];
          out[outPos + i] = Math.round(prev * (1 - w) + curr * w);
        }
        for (let i = synthHop; i < winSize && outPos + i < maxAllowedSamples; i++) {
          out[outPos + i] = src[startS + bestOffset + i];
        }

        outPos += synthHop;
        if (bestOffset + winSize >= inputLen) break;
      }

      return out;
    }

    // Place each of the 10 phrases into its precise visual timeline slot
    for (let s = 0; s < 10; s++) {
      const slot = sceneSlots[s];
      const seg = segments[s];
      const maxSamples = Math.floor(slot.maxDur * sampleRate);
      const destByteOffset = Math.floor(slot.start * sampleRate) * 2;

      // Trim internal silence at head and tail of segment
      let actStart = seg.startSample;
      let actEnd = seg.endSample;
      while (actStart < actEnd && Math.abs(srcSamples[actStart]) < speechThreshold * 0.4) actStart++;
      while (actEnd > actStart && Math.abs(srcSamples[actEnd - 1]) < speechThreshold * 0.4) actEnd--;

      const phraseSamples = solaTimeScale(srcSamples, actStart, actEnd, maxSamples, sampleRate);
      const pLen = phraseSamples.length;

      // Anti-click raised-cosine fade-in (15ms) and fade-out (25ms)
      const fadeInSamples = Math.floor(0.015 * sampleRate);
      const fadeOutSamples = Math.floor(0.025 * sampleRate);

      for (let i = 0; i < pLen; i++) {
        let sample = phraseSamples[i];
        if (i < fadeInSamples) {
          const w = 0.5 * (1 - Math.cos((Math.PI * i) / fadeInSamples));
          sample = Math.round(sample * w);
        }
        if (i > pLen - fadeOutSamples) {
          const rem = pLen - i;
          const w = 0.5 * (1 - Math.cos((Math.PI * rem) / fadeOutSamples));
          sample = Math.round(sample * w);
        }

        const outOffset = destByteOffset + i * 2;
        if (outOffset + 1 < masterPcm.length) {
          masterPcm.writeInt16LE(sample, outOffset);
        }
      }
    }

    // Standard 44-byte RIFF/WAVE header
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * 2; // 16-bit mono
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + masterPcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // Mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(2, 32);  // Block align
    header.writeUInt16LE(16, 34); // Bits per sample
    header.write('data', 36);
    header.writeUInt32LE(masterPcm.length, 40);

    const alignedWav = Buffer.concat([header, masterPcm]);
    fs.writeFileSync(voiceFile, alignedWav);
    console.log(`[Audio] Mastered 32.0s synchronized voiceover: ${voiceFile} (${(alignedWav.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (err) {
    console.warn('[Audio] Could not master voiceover file:', err.message);
  }
}

// Check and align voiceover asset on launch
ensureVoiceoverFile();

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404 File Not Found</h1>');
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    // HTTP 206 Partial Content support for audio streaming and scrubbing
    if (range) {
      const matches = range.match(/bytes=(\d*)-(\d*)/);
      if (!matches) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': 'text/plain; charset=utf-8',
        });
        return res.end('416 Requested Range Not Satisfiable');
      }

      let start = matches[1] ? parseInt(matches[1], 10) : NaN;
      let end = matches[2] ? parseInt(matches[2], 10) : NaN;

      if (isNaN(start) && isNaN(end)) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': 'text/plain; charset=utf-8',
        });
        return res.end('416 Requested Range Not Satisfiable');
      }

      if (isNaN(start)) {
        // Suffix byte range: bytes=-500 (last 500 bytes)
        start = Math.max(0, fileSize - end);
        end = fileSize - 1;
      } else if (isNaN(end)) {
        // Prefix byte range: bytes=500- (from 500 to EOF)
        end = fileSize - 1;
      }

      // Boundary validation: start must be <= end and within [0, fileSize - 1]
      if (start > end || start < 0 || start >= fileSize || end >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': 'text/plain; charset=utf-8',
        });
        return res.end('416 Requested Range Not Satisfiable');
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', (err) => {
        console.warn(`[Server] Stream error on range request: ${err.message}`);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        console.warn(`[Server] Stream error on file request: ${err.message}`);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      stream.pipe(res);
    }
  });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name in interfaces) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses.length > 0 ? addresses[0] : '127.0.0.1';
}

const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n===========================================================');
  console.log('📱 TUTORSPACE MOTION CANVAS IS LIVE FOR PHONE & OBS!');
  console.log('===========================================================\n');
  console.log(`1. Local browser:     http://localhost:${PORT}`);
  console.log(`2. Mobile on Wi-Fi:   http://${localIP}:${PORT}\n`);
  console.log(`3. OBS Browser Source: 1080x1920 @ 60 FPS with Audio`);
  console.log('===========================================================\n');
});
