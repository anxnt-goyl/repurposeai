
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testModel(modelName: string) {
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Say hello',
    });
    console.log('[SUCCESS]', modelName, ':', res.text);
  } catch (err: any) {
    console.log('[ERROR]', modelName, ':', err.message);
  }
}

async function run() {
  await testModel('gemini-1.5-flash');
  await testModel('gemini-1.5-pro');
  await testModel('gemini-2.0-flash');
  await testModel('gemini-3.8-flash');
}
run();
