import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash-preview-tts';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

function createWavHeader(dataLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

const fullScript = `TutorSpace — repetitorlar uchun Telegram boshqaruv tizimi.

Davomatni hali ham daftarda tekshiryapsizmi? Har darsda vaqt yo'qotish va chalkashliklar...

To'lovlarni Excel-da hisoblashdan charchadingizmi? Qarzdorlar esdan chiqadi, kim to'lagani noma'lum...

TutorSpace ni sinab ko'ring! Barcha boshqaruv Telegram ichida — avtomatlashgan va qulay.

O'quvchini bir klikda guruhga qo'shing. Havola yuboring — o'quvchi bazaga avto tushadi.

Bir bosishda davomat, ota-onaga avtoxabar. Kelmaganlar haqida darhol xabar boradi.

To'lovlar to'liq nazoratda, qarzdorlarga esa bitta tugma bilan eslatma yuboring.

Ota-onalar o'zlari hamma narsani ko'radi. Davomat, baholar, to'lovlar — hammasi shaffof.

Jadval va vazifalar yagona tizimda. Hammasini Telegram ichida boshqaring.

Bugunoq boshlang! Birinchi o'ttiz kun bepul. Izohlarda plyus qoldiring — TutorSpace bot!`;

async function run() {
  console.log('Waiting 25 seconds for rate limit bucket reset...');
  await new Promise(r => setTimeout(r, 25000));

  console.log('Sending single-request full voiceover generation to Gemini 2.5 TTS...');

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Speak the following promotional voiceover in Uzbek with confident, engaging tone, clear pronunciation and natural pauses between sections:\n\n${fullScript}`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Puck"
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
    console.error('API Error:', JSON.stringify(json.error, null, 2));
    process.exit(1);
  }

  const part = json.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    console.error('No audio in response:', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
  const sampleRate = 24000;
  const durationSec = (pcmBuffer.length / (sampleRate * 2)).toFixed(2);
  console.log(`Received PCM audio: ${pcmBuffer.length} bytes (Duration: ~${durationSec}s)`);

  const wavHeader = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
  const wavFile = Buffer.concat([wavHeader, pcmBuffer]);

  const outPath = path.resolve('motion-ad/assets/voiceover.wav');
  fs.writeFileSync(outPath, wavFile);
  console.log(`SUCCESS! Saved voiceover to: ${outPath} (${(wavFile.length / 1024).toFixed(1)} KB)`);
}

run().catch(console.error);
