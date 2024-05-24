import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve('_cache');
const CACHE_PATH = path.join(CACHE_DIR, `voicesCache-${process.env.PROVIDER}-${process.env.MICROSOFT_REGION}.json`);

// Ensure the cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Function to extract the required values and save to a new JSON file
async function extractVoiceDataFromCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    console.error(`Cache file not found at ${CACHE_PATH}`);
    return;
  }

  const cacheContent = fs.readFileSync(CACHE_PATH, 'utf-8');
  const cacheJson = JSON.parse(cacheContent);

  if (!cacheJson.voicesResponse || !cacheJson.voicesResponse.voices) {
    console.error('Invalid cache file format');
    return;
  }

  const extractedVoices = cacheJson.voicesResponse.voices.map(voice => ({
    voicecode: voice.code,
    voicename: voice.name,
    voicegender: voice.gender,
    localeCode: voice.locale.code,
    localeName: voice.locale.name,
    localeCountryName: voice.locale.countryName,
    regions: [process.env.MICROSOFT_REGION]
  }));

  const OUTPUT_DIR = path.resolve('samples');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputFilePath = path.join(OUTPUT_DIR, `voiceMetadata.json`);

  let existingVoices = [];
  if (fs.existsSync(outputFilePath)) {
    const existingContent = fs.readFileSync(outputFilePath, 'utf-8');
    const existingJson = JSON.parse(existingContent);
    existingVoices = existingJson.voices || [];
  }

  const existingVoiceMap = new Map(existingVoices.map(voice => [voice.voicecode, voice]));
  const newVoices = [];

  extractedVoices.forEach(newVoice => {
    if (existingVoiceMap.has(newVoice.voicecode)) {
      const existingVoice = existingVoiceMap.get(newVoice.voicecode);
      if (!existingVoice.regions.includes(process.env.MICROSOFT_REGION)) {
        existingVoice.regions.push(process.env.MICROSOFT_REGION);
      }
    } else {
      newVoices.push(newVoice);
    }
  });

  const mergedVoices = [...existingVoices, ...newVoices];
  const outputJson = {
    provider: 'microsoft',
    voices: mergedVoices
  };

  fs.writeFileSync(outputFilePath, JSON.stringify(outputJson, null, 2));

  console.log(`Extracted voice data saved to ${outputFilePath}`);
}

extractVoiceDataFromCache();
