import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { TtsUniversal, TtsProviders, TtsParamsUniversal, AudioOutputFormatUniversal } from 'cloud-text-to-speech';

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Setup cache file path
const CACHE_DIR = path.resolve('_cache');
const CACHE_PATH = path.join(CACHE_DIR, `voicesCache-${process.env.PROVIDER}-${process.env.MICROSOFT_REGION}.json`);

// Ensure the cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}


// Initialize TTS provider
TtsUniversal.init({
  provider: TtsProviders.microsoft,
  microsoftParams: { subscriptionKey: process.env.MICROSOFT_SUBSCRIPTION_KEY, region: process.env.MICROSOFT_REGION },
});

(async () => {
  // Get voices
  const voicesResponse = await TtsUniversal.getVoices();
  const voices = voicesResponse.voices;

  // Write to Cache
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ provider: 'microsoft', voicesResponse }, null, 2));

  // Pick English Voices
  const englishVoices = voices.filter((voice) => voice.locale.code.startsWith('en-'));

  // Define the output directory
  const providerName = process.env.PROVIDER;
  const outputDir = path.join('samples', providerName);

  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Loop through each English voice
  for (const voice of englishVoices) {
    // Create subfolder with voice.locale.code
    const localeDir = path.join(outputDir, voice.locale.code);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    // Generate filename based on voice.code
    const filename = `${voice.code}.mp3`;
    const filePath = path.join(localeDir, filename);

    // Check if file already exists. If it does, skip this file.
    if (fs.existsSync(filePath)) {
      console.log(`File ${filename} already exists. Skipping...`);
      continue;
    }

    // Generate Audio for a text
    const text = process.env.PHRASE_TEXT;
    if (!text.length > 1) throw 'PHRASE_TEXT not defined in .env'

    const ttsParams = new TtsParamsUniversal({
      voice: voice,
      audioFormat: AudioOutputFormatUniversal.mp3_64k,
      text: text,
      // rate: 'slow', //optional
      pitch: 'default', //optional
    });

    const ttsResponse = await TtsUniversal.convertTts(ttsParams);

    // Write audio bytes to file
    fs.writeFileSync(filePath, ttsResponse.audio, 'base64');

    console.log(`Audio generated for ${voice.name}. Filename: ${filename}`);

    // Wait for keypress before going on next iteration of loop
    await waitForKeypress();
  }

  console.log("All tasks completed.");
})();

function waitForKeypress() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Press any key to continue...', () => {
      rl.close();
      resolve();
    });
  });
}
