import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export interface TranscriptionSegment {
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  text: string;
}

export interface TranscriptionResult {
  transcriptText: string;
  segments: TranscriptionSegment[];
}

export const transcriptionService = {
  isConfigured(): boolean {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    return !!((openaiKey && openaiKey !== 'MY_OPENAI_API_KEY') || (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'));
  },

  async transcribeFile(
    filePath: string,
    originalFilename: string
  ): Promise<TranscriptionResult> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Media file not found at path: ${filePath}`);
    }

    // 1. Try OpenAI Whisper if configured
    if (openaiKey && openaiKey !== 'MY_OPENAI_API_KEY') {
      try {
        console.log(`[TRANSCRIPTION] Calling OpenAI Whisper API for: ${originalFilename}...`);
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append('file', blob, originalFilename);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI Whisper error HTTP ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        const segments: TranscriptionSegment[] = [];

        if (Array.isArray(data.segments) && data.segments.length > 0) {
          for (let i = 0; i < data.segments.length; i++) {
            const seg = data.segments[i];
            const startSec = Math.floor(seg.start || 0);
            const mm = Math.floor(startSec / 60).toString().padStart(2, '0');
            const ss = (startSec % 60).toString().padStart(2, '0');
            segments.push({
              timestamp: `${mm}:${ss}`,
              timestampSeconds: startSec,
              speaker: seg.speaker || `Speaker 1`,
              text: (seg.text || '').trim(),
            });
          }
        }

        const transcriptText = data.text || segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n');
        return {
          transcriptText,
          segments: segments.length > 0 ? segments : [{
            timestamp: '00:00',
            timestampSeconds: 0,
            speaker: 'Speaker 1',
            text: transcriptText,
          }],
        };
      } catch (whisperErr: any) {
        console.warn('[TRANSCRIPTION] OpenAI Whisper failed:', whisperErr.message);
        if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
          throw new Error(`Transcription failed: ${whisperErr.message}`);
        }
      }
    }

    // 2. Try Gemini Audio Transcription if configured
    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        console.log(`[TRANSCRIPTION] Calling Gemini transcription for: ${originalFilename}...`);
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(originalFilename).toLowerCase();
        let mimeType = 'audio/mp3';
        if (ext === '.wav') mimeType = 'audio/wav';
        else if (ext === '.m4a' || ext === '.aac') mimeType = 'audio/m4a';
        else if (ext === '.mp3') mimeType = 'audio/mp3';
        else if (ext === '.ogg') mimeType = 'audio/ogg';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        else if (ext === '.webm') mimeType = 'video/webm';
        else if (ext === '.mov') mimeType = 'video/quicktime';

        const base64Data = fileBuffer.toString('base64');
        const prompt = `Transcribe the entire spoken audio accurately.
Return a strict JSON array of timestamped segments:
[
  { "timestamp": "MM:SS", "speaker": "Speaker 1", "text": "spoken words" }
]
Provide full verbatim transcription with timestamps. Return ONLY JSON array.`;

        const model = process.env.AI_MODEL || 'gemini-3.8-flash';
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        let rawText = (response.text || '').trim();
        if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        let parsed: any = [];
        try {
          parsed = JSON.parse(rawText);
          if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.segments)) parsed = parsed.segments;
            else if (Array.isArray(parsed.transcript)) parsed = parsed.transcript;
          }
        } catch {
          const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { parsed = []; }
          }
        }

        const segments: TranscriptionSegment[] = [];

        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((item: any, idx: number) => {
            const ts = item.timestamp || '00:00';
            const parts = ts.split(':');
            const sec = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) : idx * 30;
            const textContent = (item.text || '').trim();
            if (textContent.length > 0) {
              segments.push({
                timestamp: ts,
                timestampSeconds: sec,
                speaker: item.speaker || `Speaker ${idx % 2 + 1}`,
                text: textContent,
              });
            }
          });
        }

        // If no segments were parsed as JSON array but raw text has content
        if (segments.length === 0 && rawText.length > 10) {
          segments.push({
            timestamp: '00:00',
            timestampSeconds: 0,
            speaker: 'Speaker 1',
            text: rawText,
          });
        }

        const transcriptText = segments.map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n');
        return {
          transcriptText,
          segments,
        };
      } catch (geminiErr: any) {
        console.error('[TRANSCRIPTION] Gemini transcription error:', geminiErr);
        throw new Error(`Audio transcription failed: ${geminiErr.message || 'Error processing audio file'}`);
      }
    }

    throw new Error(
      'No transcription service is configured. Please provide OPENAI_API_KEY or GEMINI_API_KEY in the server environment variables, or enter a custom transcript.'
    );
  },
};
