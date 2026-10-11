import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from '../routes/authRoutes';
import episodeRoutes from '../routes/episodeRoutes';
import { db, connectMongoDB } from '../db/store';
import { extractYouTubeVideoId, getCanonicalYouTubeUrl, youtubeService } from './youtubeService';
import { generateEpisodePdf } from './pdfService';
import fs from 'fs';
import path from 'path';

// Helper to make HTTP requests against a local test server
async function testRequest(
  server: any,
  method: string,
  path: string,
  body?: any,
  token?: string,
  isMultipart = false
) {
  const port = (server.address() as any).port as number;
  const url = `http://127.0.0.1:${port}${path}`;
  const headers: Record<string, string> = {};
  if (!isMultipart && body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: isMultipart ? body : body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, headers: res.headers, body: json };
  } else if (contentType.includes('application/pdf') || contentType.includes('application/zip')) {
    const arrayBuffer = await res.arrayBuffer();
    return { status: res.status, headers: res.headers, buffer: Buffer.from(arrayBuffer) };
  } else {
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  }
}

async function runFeatureAudit() {
  console.log('====================================================');
  console.log('   RepurposeAI Production Feature Audit Test Suite   ');
  console.log('====================================================\n');

  await connectMongoDB();

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/episodes', episodeRoutes);

  const server = app.listen(0);

  try {
    // 1. Create two separate test users for ownership checks
    const user1Email = `audit-u1-${Date.now()}@example.com`;
    const user2Email = `audit-u2-${Date.now()}@example.com`;

    const reg1 = await testRequest(server, 'POST', '/api/auth/signup', {
      name: 'Auditor One',
      email: user1Email,
      password: 'Password123!',
    });
    const token1 = reg1.body?.data?.token;

    const reg2 = await testRequest(server, 'POST', '/api/auth/signup', {
      name: 'Auditor Two',
      email: user2Email,
      password: 'Password123!',
    });
    const token2 = reg2.body?.data?.token;

    if (!token1 || !token2) throw new Error('Failed to register audit test users');
    console.log('✓ PASS: User authentication & isolation setup');

    // ----------------------------------------------------
    // TEST SECTION A: YouTube Title & Canonical Video Links
    // ----------------------------------------------------
    console.log('\n--- Section A: YouTube Metadata & Link Normalization ---');

    // Test different YouTube URL formats
    const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const youtuBeUrl = 'https://youtu.be/dQw4w9WgXcQ?si=test1234';
    const shortsUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
    const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

    const id1 = extractYouTubeVideoId(watchUrl);
    const id2 = extractYouTubeVideoId(youtuBeUrl);
    const id3 = extractYouTubeVideoId(shortsUrl);
    const id4 = extractYouTubeVideoId(embedUrl);

    if (id1 !== 'dQw4w9WgXcQ' || id2 !== 'dQw4w9WgXcQ' || id3 !== 'dQw4w9WgXcQ' || id4 !== 'dQw4w9WgXcQ') {
      throw new Error(`Video ID extraction failed: ${id1}, ${id2}, ${id3}, ${id4}`);
    }
    console.log('✓ PASS: All YouTube URL formats correctly resolve to video ID "dQw4w9WgXcQ"');

    const canonicalLink = getCanonicalYouTubeUrl(youtuBeUrl);
    if (canonicalLink !== 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
      throw new Error(`Canonical URL mismatch: ${canonicalLink}`);
    }
    console.log(`✓ PASS: Canonical YouTube URL derived: ${canonicalLink}`);

    // Verify oEmbed metadata retrieval (real title, no generic placeholder)
    const ytTranscriptResult = await youtubeService.getTranscript(shortsUrl);
    if (!ytTranscriptResult.title || ytTranscriptResult.title === 'YouTube Video' || ytTranscriptResult.title === 'YouTube Video Production') {
      throw new Error(`Retrieved generic or empty title: "${ytTranscriptResult.title}"`);
    }
    console.log(`✓ PASS: Real YouTube title extracted via oEmbed: "${ytTranscriptResult.title}"`);

    // ----------------------------------------------------
    // TEST SECTION B: Upload Endpoint Validations (Multer)
    // ----------------------------------------------------
    console.log('\n--- Section B: Upload File Validations ---');

    // B1: Empty file (0 bytes) should be rejected
    const emptyForm = new FormData();
    emptyForm.append('mediaFile', new Blob([new Uint8Array(0)], { type: 'audio/wav' }), 'empty.wav');
    emptyForm.append('sourceType', 'audio');

    const emptyRes = await testRequest(server, 'POST', '/api/episodes', emptyForm, token1, true);
    if (emptyRes.status !== 400 || !emptyRes.body?.error?.message?.includes('empty')) {
      throw new Error(`Expected 400 for empty file, got: ${emptyRes.status} ${JSON.stringify(emptyRes.body)}`);
    }
    console.log(`✓ PASS: 0-byte media file rejected: "${emptyRes.body.error.message}"`);

    // B2: Unsupported extension (.txt or .exe) should be rejected
    const badExtForm = new FormData();
    badExtForm.append('mediaFile', new Blob([Buffer.from('invalid')], { type: 'application/x-msdownload' }), 'malware.exe');
    badExtForm.append('sourceType', 'video');

    const badExtRes = await testRequest(server, 'POST', '/api/episodes', badExtForm, token1, true);
    if (badExtRes.status !== 400 || !badExtRes.body?.error?.message?.includes('Invalid file format')) {
      throw new Error(`Expected 400 for bad extension, got: ${badExtRes.status} ${JSON.stringify(badExtRes.body)}`);
    }
    console.log(`✓ PASS: Unsupported file format rejected: "${badExtRes.body.error.message}"`);

    // ----------------------------------------------------
    // TEST SECTION C: PDF Generation (Node & Endpoint)
    // ----------------------------------------------------
    console.log('\n--- Section C: PDF Generation & Export Endpoint ---');

    // Use an existing real episode from MongoDB or create a sample episode
    const episodes = await db.episodes.find({});
    let targetEpisode = episodes[0];

    if (!targetEpisode) {
      throw new Error('No episode found in database to test PDF export');
    }

    const targetAssets = await db.assets.find({ episodeId: targetEpisode.id });
    const targetTranscripts = await db.transcripts.find({ episodeId: targetEpisode.id });

    // Test direct PDF buffer generation via pdfService
    const pdfBytes = generateEpisodePdf(targetEpisode, targetAssets, targetTranscripts, 'all');
    if (!pdfBytes || pdfBytes.length < 500) {
      throw new Error(`PDF generation yielded empty or too small buffer (${pdfBytes.length} bytes)`);
    }

    // Verify PDF header %PDF-1.
    const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    if (!pdfHeader.startsWith('%PDF')) {
      throw new Error(`Generated file is not a valid PDF! Header: ${pdfHeader}`);
    }
    console.log(`✓ PASS: generateEpisodePdf produced valid binary PDF (${pdfBytes.length} bytes, header: ${pdfHeader})`);

    // Test HTTP GET /api/episodes/:id/export/pdf endpoint
    const pdfHttpRes = await testRequest(server, 'GET', `/api/episodes/${targetEpisode.id}/export/pdf?category=all`, undefined, token1);
    
    // Note: token1 is user1. If targetEpisode belongs to another user, verify 404/ownership
    if (targetEpisode.userId !== reg1.body?.data?.user?.id) {
      if (pdfHttpRes.status !== 404) {
        throw new Error(`Cross-user access violation! User 1 accessed User 2's episode with status: ${pdfHttpRes.status}`);
      }
      console.log('✓ PASS: Cross-user access check prevented unauthorized PDF download (404)');

      // Create a test episode for User 1 to verify authenticated PDF download
      const user1Ep = {
        id: `ep-audit-${Date.now()}`,
        userId: reg1.body.data.user.id,
        title: 'Strategic Leverage in Production AI Systems',
        sourceType: 'youtube' as const,
        sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '24:15',
        durationSeconds: 1455,
        status: 'Ready for Review' as const,
        summary: 'A deep-dive discussion on high-leverage content engineering workflows.',
        keyTakeaways: ['Leverage over volume.', 'Audience context retention.'],
        chapters: [{ timestamp: '00:00', title: 'Intro', description: 'Session kickoff' }],
        speakers: ['Anant Goyal', 'Elena Vance'],
        mainTopics: ['Content Engineering', 'Systems'],
        fileSize: '45 MB',
        tone: 'Authoritative and practical',
        dateProcessed: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.episodes.create(user1Ep);
      await db.assets.create({
        id: `ast-audit-${Date.now()}`,
        episodeId: user1Ep.id,
        userId: user1Ep.userId,
        platform: 'linkedin',
        title: 'Strategic Shifts in Content Systems',
        content: 'Here is the comprehensive LinkedIn breakdown for creators.',
        status: 'approved',
        lastEdited: 'Just now',
        wordCount: 120,
        readingTimeMinutes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const user1PdfRes = await testRequest(server, 'GET', `/api/episodes/${user1Ep.id}/export/pdf?category=all`, undefined, token1);
      if (user1PdfRes.status !== 200) {
        throw new Error(`PDF endpoint failed for owner: HTTP ${user1PdfRes.status}`);
      }
      if (!user1PdfRes.buffer || !user1PdfRes.buffer.toString('utf-8', 0, 5).startsWith('%PDF')) {
        throw new Error('Downloaded PDF stream is invalid');
      }
      const disposition = user1PdfRes.headers.get('content-disposition') || '';
      if (!disposition.includes('.pdf') || !disposition.includes('strategic-leverage')) {
        throw new Error(`Expected sanitized filename in Content-Disposition header, got: ${disposition}`);
      }
      console.log(`✓ PASS: GET /api/episodes/:id/export/pdf returned 200 OK (${user1PdfRes.buffer.length} bytes, Disposition: "${disposition}")`);

      // Test ZIP export endpoint
      const user1ZipRes = await testRequest(server, 'GET', `/api/episodes/${user1Ep.id}/export/zip?category=all&approvedOnly=true`, undefined, token1);
      if (user1ZipRes.status !== 200) {
        throw new Error(`ZIP endpoint failed: HTTP ${user1ZipRes.status}`);
      }
      // ZIP files start with PK (0x50 0x4B)
      if (!user1ZipRes.buffer || user1ZipRes.buffer[0] !== 0x50 || user1ZipRes.buffer[1] !== 0x4b) {
        throw new Error('Downloaded ZIP stream does not have PK magic bytes');
      }
      const zipDisposition = user1ZipRes.headers.get('content-disposition') || '';
      console.log(`✓ PASS: GET /api/episodes/:id/export/zip returned 200 OK (${user1ZipRes.buffer.length} bytes, PK header verified, Disposition: "${zipDisposition}")`);

      // Clean up audit test episode
      await db.episodes.delete(user1Ep.id);
      await db.assets.deleteMany({ episodeId: user1Ep.id });
    } else {
      if (pdfHttpRes.status === 200 && pdfHttpRes.buffer) {
        console.log(`✓ PASS: GET /api/episodes/:id/export/pdf returned 200 OK (${pdfHttpRes.buffer.length} bytes)`);
      }
    }

    // ----------------------------------------------------
    // TEST SECTION D: Project Renaming & Persistence
    // ----------------------------------------------------
    console.log('\n--- Section D: Title Rename & Persistence ---');
    const renameTestEp = {
      id: `ep-rename-${Date.now()}`,
      userId: reg1.body.data.user.id,
      title: 'Initial Filename Title',
      sourceType: 'audio' as const,
      sourceFilename: 'interview-recording-may.wav',
      duration: '15:00',
      durationSeconds: 900,
      status: 'Ready for Review' as const,
      summary: 'Testing rename flow.',
      keyTakeaways: ['Test point'],
      chapters: [],
      speakers: ['Host'],
      mainTopics: ['Productivity'],
      fileSize: '12 MB',
      tone: 'Conversational',
      dateProcessed: new Date().toLocaleDateString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.episodes.create(renameTestEp);

    const patchRes = await testRequest(server, 'PATCH', `/api/episodes/${renameTestEp.id}`, {
      title: 'Polished Production Masterclass Title',
    }, token1);

    if (patchRes.status !== 200 || patchRes.body?.data?.title !== 'Polished Production Masterclass Title') {
      throw new Error(`PATCH title failed: ${JSON.stringify(patchRes.body)}`);
    }

    // Verify in database
    const refreshed = await db.episodes.findById(renameTestEp.id);
    if (refreshed?.title !== 'Polished Production Masterclass Title') {
      throw new Error(`Persistence verification failed: expected updated title, got "${refreshed?.title}"`);
    }
    console.log('✓ PASS: Episode title successfully updated and persisted in MongoDB');

    // Clean up rename test episode
    await db.episodes.delete(renameTestEp.id);

    console.log('\n====================================================');
    console.log('   ALL AUDIT TEST SUITES PASSED WITH ZERO ERRORS!    ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ AUDIT FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runFeatureAudit();
