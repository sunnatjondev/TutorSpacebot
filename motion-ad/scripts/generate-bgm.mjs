import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const targetFile = path.join(assetsDir, 'bg-music.mp3');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('[BGM Generator] Synthesizing 32-second genuine audio track...');

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

  // 2. Snare / Clap on Beats 1 and 3 (from bar 4)
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

  // 4. Bassline: Am -> F -> C -> G
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

// RIFF WAVE Container Packaging
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
buffer.writeUInt16LE(1, 20); // PCM format
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // 16 bits per sample
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

fs.writeFileSync(targetFile, buffer);
console.log(`[BGM Generator] Successfully generated: ${targetFile}`);
console.log(`[BGM Generator] Size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
