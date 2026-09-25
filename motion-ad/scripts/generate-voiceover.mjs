import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const VOICE = process.env.VOICE_NAME || 'Fenrir'; // Energetic, confident commercial male voice
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

/**
 * 10 Scenes aligned with GSAP 3 timeline (motion-ad/js/motion.js):
 * S1: 0.0s — 3.2s (slot 3.2s)
 * S2: 3.2s — 5.6s (slot 2.4s)
 * S3: 5.6s — 8.0s (slot 2.4s)
 * S4: 8.0s — 10.2s (slot 2.2s)
 * S5: 10.2s — 13.8s (slot 3.6s)
 * S6: 13.8s — 17.4s (slot 3.6s)
 * S7: 17.4s — 21.0s (slot 3.6s)
 * S8: 21.0s — 24.6s (slot 3.6s)
 * S9: 24.6s — 28.2s (slot 3.6s)
 * S10: 28.2s — 32.0s (slot 3.8s)
 */
const SCENES = [
  {
    id: 's1',
    name: 'Intro',
    startSec: 0.0,
    slotSec: 3.2,
    maxVoiceSec: 2.8,
    text: "TutorSpace — repetitorlar uchun Telegram boshqaruv tizimi.",
    prompt: "Speak in natural, enthusiastic Uzbek with commercial announcer energy for an Instagram Reels ad. Articulate 'oʻ', 'gʻ', 'q', 'x', and 'h' correctly: TutorSpace — repetitorlar uchun Telegram boshqaruv tizimi."
  },
  {
    id: 's2',
    name: 'Muammo 1 (Davomat)',
    startSec: 3.2,
    slotSec: 2.4,
    maxVoiceSec: 2.1,
    text: "Davomatni hali ham daftarda tekshiryapsizmi? Har darsda vaqt yo'qotish va chalkashliklar.",
    prompt: "Speak with questioning commercial inflection, fast and brisk pace (under 2 seconds): Davomatni daftarda tekshiryapsizmi? Vaqt yo'qotish va chalkashliklar!"
  },
  {
    id: 's3',
    name: 'Muammo 2 (Excel)',
    startSec: 5.6,
    slotSec: 2.4,
    maxVoiceSec: 2.1,
    text: "To'lovlarni Excel-da hisoblashdan charchadingizmi? Qarzdorlar esdan chiqadi, kim to'lagani noma'lum.",
    prompt: "Speak with relatable pain-point inflection, punchy and brisk (under 2 seconds): To'lovlarni Excelda hisoblashdan charchadingizmi? Qarzdorlar esdan chiqadi!"
  },
  {
    id: 's4',
    name: 'Bridge (TutorSpace)',
    startSec: 8.0,
    slotSec: 2.2,
    maxVoiceSec: 1.9,
    text: "TutorSpace ni sinab ko'ring! Barcha boshqaruv Telegram ichida — avtomatlashgan va qulay.",
    prompt: "Speak with inspiring, uplifting commercial energy (under 1.9 seconds): TutorSpace ni sinab ko'ring! Barcha boshqaruv Telegram ichida — tez va qulay."
  },
  {
    id: 's5',
    name: 'Guruhlar (F1)',
    startSec: 10.2,
    slotSec: 3.6,
    maxVoiceSec: 3.1,
    text: "O'quvchini bir klikda guruhga qo'shing. Havola yuboring — o'quvchi bazaga avto tushadi.",
    prompt: "Confident, feature-explaining commercial tone: O'quvchini bir klikda guruhga qo'shing. Havola yuboring — o'quvchi bazaga avto tushadi."
  },
  {
    id: 's6',
    name: 'Davomat (F2)',
    startSec: 13.8,
    slotSec: 3.6,
    maxVoiceSec: 3.1,
    text: "Bir bosishda davomat, ota-onaga avtoxabar. Kelmaganlar haqida darhol xabar boradi.",
    prompt: "Dynamic, clear Uzbek articulation: Bir bosishda davomat, ota-onaga avtoxabar. Kelmaganlar haqida darhol xabar boradi."
  },
  {
    id: 's7',
    name: 'Moliya (F3)',
    startSec: 17.4,
    slotSec: 3.6,
    maxVoiceSec: 3.1,
    text: "To'lovlar to'liq nazoratda, qarzdorlarga eslatma. Tushum va qarzlar real vaqtda.",
    prompt: "Reassuring, authoritative financial management tone: To'lovlar to'liq nazoratda, qarzdorlarga bitta tugma bilan eslatma yuboring. Tushum va qarzlar real vaqtda."
  },
  {
    id: 's8',
    name: 'Ota-ona (F4)',
    startSec: 21.0,
    slotSec: 3.6,
    maxVoiceSec: 3.1,
    text: "Ota-onalar o'zlari hamma narsani ko'radi. Davomat, baholar, to'lovlar — hammasi shaffof.",
    prompt: "Warm, transparent, convincing tone: Ota-onalar o'zlari hamma narsani ko'radi. Davomat, baholar, to'lovlar — hammasi shaffof."
  },
  {
    id: 's9',
    name: 'Jadval (F5)',
    startSec: 24.6,
    slotSec: 3.6,
    maxVoiceSec: 3.1,
    text: "Jadval va vazifalar yagona tizimda. Hammasini Telegram ichida boshqaring.",
    prompt: "Modern, organized, confident tone: Jadval va vazifalar yagona tizimda. Hammasini Telegram ichida boshqaring."
  },
  {
    id: 's10',
    name: 'Outro CTA',
    startSec: 28.2,
    slotSec: 3.8,
    maxVoiceSec: 3.3,
    text: "Bugunoq boshlang! Birinchi o'ttiz kun bepul. Izohlarda plyus qoldiring — TutorSpace bot!",
    prompt: "Strong call-to-action, exciting finale: Bugunoq boshlang! Birinchi o'ttiz kun bepul. Izohlarda plyus qoldiring — TutorSpace bot!"
  }
];

function createWavHeader(dataLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

// Apply linear fade-in and fade-out to prevent clicks and clipping
function applyFades(pcmBuffer, sampleRate, fadeInMs = 15, fadeOutMs = 30) {
  const numSamples = pcmBuffer.length / 2;
  const fadeInSamples = Math.min(numSamples / 2, Math.floor((fadeInMs / 1000) * sampleRate));
  const fadeOutSamples = Math.min(numSamples / 2, Math.floor((fadeOutMs / 1000) * sampleRate));

  for (let i = 0; i < fadeInSamples; i++) {
    const val = pcmBuffer.readInt16LE(i * 2);
    const scaled = Math.round(val * (i / fadeInSamples));
    pcmBuffer.writeInt16LE(scaled, i * 2);
  }

  for (let i = 0; i < fadeOutSamples; i++) {
    const idx = numSamples - 1 - i;
    const val = pcmBuffer.readInt16LE(idx * 2);
    const scaled = Math.round(val * (i / fadeOutSamples));
    pcmBuffer.writeInt16LE(scaled, idx * 2);
  }
}

async function generatePhraseAudio(promptText, voice = VOICE) {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    }
  };

  const resp = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await resp.json();
  if (json.error) {
    throw new Error(`Gemini TTS API Error: ${json.error.message}`);
  }

  const part = json.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error(`No audio data in Gemini response: ${JSON.stringify(json)}`);
  }

  return Buffer.from(part.inlineData.data, 'base64');
}

function extractPcmData(rawBuffer) {
  if (rawBuffer && rawBuffer.length >= 12 && rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    let offset = 12;
    while (offset + 8 <= rawBuffer.length) {
      const chunkId = rawBuffer.toString('ascii', offset, offset + 4);
      const chunkSize = rawBuffer.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        const dataOffset = offset + 8;
        const dataEnd = Math.min(rawBuffer.length, dataOffset + chunkSize);
        return rawBuffer.subarray(dataOffset, dataEnd);
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
    return rawBuffer.subarray(44);
  }
  return rawBuffer;
}

async function main() {
  console.log('======================================================================');
  console.log(`🎙️  TUTORSPACE 32-SECOND STUDIO VOICEOVER GENERATOR`);
  console.log(`    Model: ${MODEL} | Voice: ${VOICE} (Uzbek Male Commercial)`);
  console.log('======================================================================\n');

  if (!API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY environment variable is not set.');
    console.warn('   To generate or refresh audio from Gemini API, run:');
    console.warn('   $env:GEMINI_API_KEY="your_api_key"; node scripts/generate-voiceover.mjs\n');
  }

  const sampleRate = 24000;
  const bytesPerSample = 2; // 16-bit mono
  const totalDurationSec = 32.0;
  const totalSamples = Math.floor(totalDurationSec * sampleRate);
  const masterBuffer = Buffer.alloc(totalSamples * bytesPerSample); // 0-filled silence
  let synthesizedCount = 0;

  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    console.log(`[${i + 1}/${SCENES.length}] Synthesizing ${sc.id.toUpperCase()} (${sc.name}, t=${sc.startSec}s, slot=${sc.slotSec}s)...`);
    
    let rawAudio = null;
    if (API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          rawAudio = await generatePhraseAudio(sc.prompt, VOICE);
          break;
        } catch (err) {
          console.warn(`  Attempt ${attempt} failed: ${err.message}. Retrying in 2.5s...`);
          await new Promise(r => setTimeout(r, 2500));
        }
      }
    }

    if (!rawAudio) {
      console.warn(`  Skipping live API call for ${sc.id} (no API key or API unreachable).`);
      continue;
    }

    synthesizedCount++;
    const pcm = extractPcmData(rawAudio);

    // Limit maximum duration to maxVoiceSec to ensure clean silence before next scene
    const maxAllowedBytes = Math.floor(sc.maxVoiceSec * sampleRate) * bytesPerSample;
    const sliceLen = Math.min(pcm.length, maxAllowedBytes);
    const sceneBuffer = Buffer.alloc(sliceLen);
    pcm.copy(sceneBuffer, 0, 0, sliceLen);

    // Apply anti-click fades
    applyFades(sceneBuffer, sampleRate, 15, 30);

    const startByte = Math.floor(sc.startSec * sampleRate) * bytesPerSample;
    sceneBuffer.copy(masterBuffer, startByte, 0, sceneBuffer.length);

    const durSec = (sceneBuffer.length / (sampleRate * bytesPerSample)).toFixed(2);
    console.log(`  ✓ Positioned ${sc.id} at ${sc.startSec}s (Duration: ${durSec}s / Slot: ${sc.slotSec}s)\n`);

    // Rate-limit pause
    await new Promise(r => setTimeout(r, 1000));
  }

  if (synthesizedCount === 0) {
    console.warn('\n⚠️  No audio phrases were synthesized (GEMINI_API_KEY unset or API unreachable).');
    console.warn('   Existing assets/voiceover.wav was preserved intact to prevent silent audio overwrite.\n');
    return;
  }

  const wavHeader = createWavHeader(masterBuffer.length, sampleRate, 1, 16);
  const finalWav = Buffer.concat([wavHeader, masterBuffer]);

  const outDir = path.join(projectRoot, 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'voiceover.wav');
  fs.writeFileSync(outFile, finalWav);

  console.log('----------------------------------------------------------------------');
  console.log(`🎉 SUCCESS! Master voiceover created: ${outFile}`);
  console.log(`   Total Duration : ${totalDurationSec.toFixed(1)}s (10 scenes in lockstep)`);
  console.log(`   File Size      : ${(finalWav.length / (1024 * 1024)).toFixed(2)} MB (${finalWav.length} bytes)`);
  console.log('----------------------------------------------------------------------\n');
}

main().catch(err => {
  console.error('Fatal Generator Error:', err);
  process.exit(1);
});
