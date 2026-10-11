import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from '../routes/authRoutes';
import episodeRoutes from '../routes/episodeRoutes';
import { db, connectMongoDB } from '../db/store';
import fs from 'fs';
import path from 'path';

async function testUploadE2E() {
  console.log('=== Starting End-to-End Media Upload Pipeline Test ===');
  await connectMongoDB();

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/episodes', episodeRoutes);

  const server = app.listen(0);
  const port = (server.address() as any).port as number;

  try {
    // 1. Create authenticated user
    const userEmail = `upload-test-${Date.now()}@example.com`;
    const regRes = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Upload Tester', email: userEmail, password: 'Password123!' }),
    });
    const regData = await regRes.json();
    const token = regData.data.token;
    const userId = regData.data.user.id;
    console.log('✓ Registered test user:', userEmail);

    // 2. Generate a valid PCM WAV file (16-bit, 8000Hz, 2 seconds)
    const sampleRate = 8000;
    const numSamples = sampleRate * 2;
    const wavBuffer = Buffer.alloc(44 + numSamples * 2);
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + numSamples * 2, 4);
    wavBuffer.write('WAVE', 8);
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20); // PCM
    wavBuffer.writeUInt16LE(1, 22); // Mono
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * 2, 28);
    wavBuffer.writeUInt16LE(2, 32);
    wavBuffer.writeUInt16LE(16, 34);
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(numSamples * 2, 40);

    // Fill with a simple gentle sine wave tone (440Hz A tone) so it's a real audible waveform
    for (let i = 0; i < numSamples; i++) {
      const val = Math.floor(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 10000);
      wavBuffer.writeInt16LE(val, 44 + i * 2);
    }

    const testFilename = 'founder-interview-snippet.wav';
    console.log(`✓ Generated valid WAV audio file: ${testFilename} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);

    // 3. Post to /api/episodes via FormData with mediaFile and realistic spoken dialogue
    const formData = new FormData();
    formData.append('mediaFile', new Blob([wavBuffer], { type: 'audio/wav' }), testFilename);
    formData.append('sourceType', 'audio');
    formData.append('title', 'Founder Systems and Leverage Session');
    formData.append('customTranscript', `[00:00] Alice: Welcome to the session. Today we are discussing building scalable media systems without sacrificing editorial taste.
[00:45] Bob: The primary shift is recognizing that repurposing is an editorial curation exercise, not a brute-force automation task. You need human taste in the loop.
[01:30] Alice: Exactly. When you extract core strategic shifts from one conversation, you can create native content for LinkedIn, Twitter, and email newsletters.`);
    formData.append('duration', '02:15');

    console.log('Sending upload request to POST /api/episodes...');
    const uploadRes = await fetch(`http://127.0.0.1:${port}/api/episodes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const uploadData: any = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(`Upload failed HTTP ${uploadRes.status}: ${JSON.stringify(uploadData)}`);
    }

    const createdEp = uploadData.data;
    console.log('✓ PASS: POST /api/episodes created episode successfully:', {
      id: createdEp.id,
      title: createdEp.title,
      sourceType: createdEp.sourceType,
      sourceFilename: createdEp.sourceFilename,
      momentsCount: createdEp.moments?.length,
      assetsCount: createdEp.assets?.length,
    });

    if (createdEp.title !== 'Founder Systems and Leverage Session') {
      throw new Error(`Expected custom title to be preserved, got: ${createdEp.title}`);
    }
    if (createdEp.sourceFilename !== testFilename) {
      throw new Error(`Expected sourceFilename to be ${testFilename}, got: ${createdEp.sourceFilename}`);
    }
    if (!createdEp.assets || createdEp.assets.length === 0) {
      throw new Error('Expected platform assets to be generated');
    }

    // 4. Verify MongoDB persistence by fetching via GET /api/episodes/:id
    const getRes = await fetch(`http://127.0.0.1:${port}/api/episodes/${createdEp.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData: any = await getRes.json();
    if (!getRes.ok || getData.data.id !== createdEp.id) {
      throw new Error('Failed to retrieve persisted episode from MongoDB');
    }
    console.log('✓ PASS: Retrieved episode from MongoDB Atlas via GET /api/episodes/:id');

    // 5. Test PDF export of the newly uploaded episode
    const pdfRes = await fetch(`http://127.0.0.1:${port}/api/episodes/${createdEp.id}/export/pdf?category=all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pdfRes.ok) {
      throw new Error(`PDF export failed for uploaded episode: HTTP ${pdfRes.status}`);
    }
    const pdfArrayBuffer = await pdfRes.arrayBuffer();
    const pdfBuf = Buffer.from(pdfArrayBuffer);
    if (!pdfBuf.toString('utf-8', 0, 5).startsWith('%PDF')) {
      throw new Error('Exported PDF does not have valid PDF header');
    }
    console.log(`✓ PASS: Generated real downloadable PDF for uploaded episode (${pdfBuf.length} bytes)`);

    // 6. Clean up test episode
    await db.episodes.delete(createdEp.id);
    await db.moments.deleteMany({ episodeId: createdEp.id });
    await db.assets.deleteMany({ episodeId: createdEp.id });
    await db.transcripts.deleteMany({ episodeId: createdEp.id });
    console.log('✓ Cleaned up test episode');

    console.log('\n=== END-TO-END UPLOAD TEST PASSED COMPLETELY! ===\n');
  } catch (err: any) {
    console.error('❌ E2E Upload Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

testUploadE2E();
