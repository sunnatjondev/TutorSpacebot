import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-3.8-flash-tts';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const SCENES = [
  {
    id: 's1',
    startSec: 0.0,
    text: "TutorSpace — repetitorlar uchun Telegram boshqaruv tizimi."
  },
  {
    id: 's2',
    startSec: 3.2,
    text: "Davomatni hali ham daftarda tekshiryapsizmi? Har darsda vaqt yo'qotish va chalkashliklar."
  },
  {
    id: 's3',
    startSec: 5.6,
    text: "To'lovlarni Excel-da hisoblashdan charchadingizmi? Qarzdorlar esdan chiqadi, kim to'lagani noma'lum."
  },
  {
    id: 's4',
    startSec: 8.0,
    text: "TutorSpace ni sinab ko'ring! Barcha boshqaruv Telegram ichida — avtomatlashgan va qulay."
  },
  {
    id: 's5',
    startSec: 10.2,
    text: "O'quvchini bir klikda guruhga qo'shing. Havola yuboring — o'quvchi bazaga avto tushadi."
  },
  {
    id: 's6',
    startSec: 13.8,
    text: "Bir bosishda davomat, ota-onaga avtoxabar. Kelmaganlar haqida darhol xabar boradi."
  },
  {
    id: 's7',
    startSec: 17.4,
    text: "To'lovlar nazorati va qarzdorlarga eslatma. Tushum va qarzlar real vaqtda."
  },
  {
    id: 's8',
    startSec: 21.0,
    text: "Ota-onalar o'zlari hamma narsani ko'radi. Davomat, baholar, to'lovlar — hammasi shaffof."
  },
  {
    id: 's9',
    startSec: 24.6,
    text: "Jadval va vazifalar yagona tizimda. Hammasini Telegram ichida boshqaring."
  },
  {
    id: 's10',
    startSec: 28.2,
    text: "Bugunoq boshlang! Birinchi o'ttiz kun bepul. Izohlarda plyus qoldiring — TutorSpace bot!"
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

async function generatePhraseAudio(text, voice = 'Puck') {
  const payload = {
    contents: [{ parts: [{ text: text }] }],
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
    throw new Error(`Gemini API Error: ${json.error.message}`);
  }

  const part = json.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error(`No audio data returned: ${JSON.stringify(json)}`);
  }

  return Buffer.from(part.inlineData.data, 'base64');
}

async function main() {
  console.log('--- Generating TutorSpace 32-second Voiceover with Gemini 2.5 TTS ---');
  
  const sampleRate = 24000;
  const bytesPerSample = 2; // 16-bit mono
  const totalDurationSec = 32.0;
  const totalSamples = Math.ceil(totalDurationSec * sampleRate);
  const masterBuffer = Buffer.alloc(totalSamples * bytesPerSample); // initialized to 0 (silence)

  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    console.log(`[${i + 1}/${SCENES.length}] Generating for ${sc.id} (t=${sc.startSec}s): "${sc.text}"`);
    
    // retry with exponential backoff if needed
    let pcm = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pcm = await generatePhraseAudio(sc.text, 'Puck');
        break;
      } catch (err) {
        console.warn(`  Attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!pcm) {
      console.error(`Failed to generate phrase for ${sc.id}`);
      continue;
    }

    const startByte = Math.floor(sc.startSec * sampleRate) * bytesPerSample;
    const maxCopyLen = Math.min(pcm.length, masterBuffer.length - startByte);
    pcm.copy(masterBuffer, startByte, 0, maxCopyLen);
    console.log(`  -> Synthesized ${pcm.length} bytes (~${(pcm.length / (sampleRate * bytesPerSample)).toFixed(1)}s audio). Placed at byte ${startByte}.`);

    // slight pause to respect rate limits
    await new Promise(r => setTimeout(r, 800));
  }

  const wavHeader = createWavHeader(masterBuffer.length, sampleRate, 1, 16);
  const finalWav = Buffer.concat([wavHeader, masterBuffer]);

  const outDir = path.resolve('motion-ad/assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'voiceover.wav');
  fs.writeFileSync(outFile, finalWav);

  console.log('--------------------------------------------------');
  console.log(`SUCCESS! Saved master voiceover to: ${outFile}`);
  console.log(`Total file size: ${(finalWav.length / (1024 * 1024)).toFixed(2)} MB (Duration: ${totalDurationSec}s)`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
