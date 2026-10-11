import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Testing Gemini API Key length:', apiKey.length);

async function testModels() {
  const ai = new GoogleGenAI({ apiKey });
  
  // Test listing models or generating with candidate models
  const candidates = [
    process.env.AI_MODEL || 'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  for (const model of candidates) {
    try {
      console.log(`\nTesting model: ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: 'Say hello in 3 words.',
      });
      console.log(`✓ SUCCESS with ${model}:`, res.text?.trim());
    } catch (err: any) {
      console.log(`✗ FAILED with ${model}: [${err.status || err.code || 'ERR'}]`, err.message);
    }
  }
}

testModels().catch(console.error);
