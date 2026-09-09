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
