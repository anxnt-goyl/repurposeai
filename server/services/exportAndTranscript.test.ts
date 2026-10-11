import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from '../routes/authRoutes.js';
import episodeRoutes from '../routes/episodeRoutes.js';
import contentRoutes from '../routes/contentRoutes.js';
import { db, connectMongoDB } from '../db/store.js';

async function req(server: any, method: string, path: string, body?: any, token?: string) {
  const port = (server.address() as any).port as number;
  const url = `http://127.0.0.1:${port}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

// Pure export generator function mirroring the client-side ExportModal logic
export function generateExportContent(
  episode: any,
  category: 'all' | 'show_notes' | 'transcript' | 'social' | 'blog' | 'newsletter',
  format: 'md' | 'txt' | 'json'
): { content: string; isEmpty: boolean; emptyReason?: string } {
  const allAssets = Array.isArray(episode.assets) ? episode.assets : [];
  const transcript = Array.isArray(episode.transcript) ? episode.transcript : [];
  const keyTakeaways = Array.isArray(episode.keyTakeaways) ? episode.keyTakeaways : [];
  const chapters = Array.isArray(episode.chapters) ? episode.chapters : [];
  const moments = Array.isArray(episode.moments) ? episode.moments : [];
  const summary = episode.summary || '';

  // Exclude rejected assets
  const eligibleAssets = allAssets.filter((a: any) => a.status !== 'rejected');

  let scopedAssets = eligibleAssets;
  if (category === 'social') {
    scopedAssets = eligibleAssets.filter((a: any) => ['linkedin', 'x', 'instagram'].includes(a.platform));
  } else if (category === 'show_notes') {
    scopedAssets = eligibleAssets.filter((a: any) => a.platform === 'show_notes');
  } else if (category === 'blog') {
    scopedAssets = eligibleAssets.filter((a: any) => a.platform === 'blog');
  } else if (category === 'newsletter') {
    scopedAssets = eligibleAssets.filter((a: any) => a.platform === 'newsletter');
  } else if (category === 'transcript') {
    scopedAssets = [];
  }

  // Detect empty selections
  if (category === 'transcript' && transcript.length === 0) {
    return { content: '', isEmpty: true, emptyReason: 'No transcript segments available.' };
  }
  if (category === 'show_notes' && scopedAssets.length === 0) {
    return { content: '', isEmpty: true, emptyReason: 'No show notes available.' };
  }
  if (category === 'social' && scopedAssets.length === 0) {
    return { content: '', isEmpty: true, emptyReason: 'No social media posts available.' };
  }
  if (category === 'blog' && scopedAssets.length === 0) {
    return { content: '', isEmpty: true, emptyReason: 'No blog article available.' };
  }
  if (category === 'newsletter' && scopedAssets.length === 0) {
    return { content: '', isEmpty: true, emptyReason: 'No newsletter available.' };
  }
  if (category === 'all' && scopedAssets.length === 0 && transcript.length === 0 && !summary) {
    return { content: '', isEmpty: true, emptyReason: 'No content available.' };
  }

  if (format === 'json') {
    let exportObj: any;
    if (category === 'all') {
      exportObj = {
        title: episode.title,
        duration: episode.duration,
        summary,
        keyTakeaways,
        chapters,
        moments,
        assets: scopedAssets,
        transcript: transcript.length > 0 ? transcript : undefined,
      };
    } else if (category === 'transcript') {
      exportObj = {
        title: episode.title,
        duration: episode.duration,
        transcript,
      };
    } else {
      exportObj = {
        title: episode.title,
        category,
        assets: scopedAssets,
      };
    }
    return { content: JSON.stringify(exportObj, null, 2), isEmpty: false };
  }

  if (format === 'md') {
    const sections: string[] = [];
    if (category === 'all') {
      sections.push(`# ${episode.title}`);
      sections.push(`**Duration:** ${episode.duration || 'N/A'}`);
      if (summary) sections.push(`\n## Executive Summary\n${summary}`);
      if (keyTakeaways.length > 0) sections.push(`\n## Key Takeaways\n${keyTakeaways.map((t: string) => `- ${t}`).join('\n')}`);
      if (chapters.length > 0) sections.push(`\n## Chapters\n${chapters.map((c: any) => `- **${c.timestamp}** ${c.title}`).join('\n')}`);
      if (scopedAssets.length > 0) {
        sections.push(`\n---\n\n## Platform-Adapted Content Assets (${scopedAssets.length})`);
        scopedAssets.forEach((ast: any) => {
          sections.push(`\n### [${ast.platform.toUpperCase()}] ${ast.title}\n*Status: ${ast.status} · Word count: ${ast.wordCount}*\n\n${ast.content}\n`);
        });
      }
      if (transcript.length > 0) {
        sections.push(`\n---\n\n## Full Transcript`);
        transcript.forEach((t: any) => {
          sections.push(`[${t.timestamp}] ${t.speaker}:\n${t.text}\n`);
        });
      }
    } else if (category === 'transcript') {
      sections.push(`# ${episode.title} - Full Transcript\n`);
      transcript.forEach((t: any) => {
        sections.push(`[${t.timestamp}] ${t.speaker}:\n${t.text}\n`);
      });
    } else {
      sections.push(`# ${episode.title} - ${category.toUpperCase().replace('_', ' ')}\n`);
      scopedAssets.forEach((ast: any) => {
        sections.push(`## [${ast.platform.toUpperCase()}] ${ast.title}\n*Status: ${ast.status} · Word count: ${ast.wordCount}*\n\n${ast.content}\n`);
      });
    }
    return { content: sections.join('\n'), isEmpty: false };
  }

  // Plain text
  const sections: string[] = [];
  if (category === 'all') {
    sections.push(`${episode.title.toUpperCase()}`);
    sections.push(`Duration: ${episode.duration || 'N/A'}\n`);
    if (summary) sections.push(`EXECUTIVE SUMMARY\n${summary}\n`);
    if (keyTakeaways.length > 0) sections.push(`KEY TAKEAWAYS\n${keyTakeaways.map((t: string) => `• ${t}`).join('\n')}\n`);
    if (chapters.length > 0) sections.push(`CHAPTERS\n${chapters.map((c: any) => `[${c.timestamp}] ${c.title}`).join('\n')}\n`);
    if (scopedAssets.length > 0) {
      sections.push(`========================================\nCONTENT ASSETS (${scopedAssets.length})\n========================================\n`);
      scopedAssets.forEach((ast: any) => {
        sections.push(`[${ast.platform.toUpperCase()}] ${ast.title}\nStatus: ${ast.status}\n\n${ast.content}\n\n----------------------------------------\n`);
      });
    }
    if (transcript.length > 0) {
      sections.push(`========================================\nFULL TRANSCRIPT\n========================================\n`);
      transcript.forEach((t: any) => {
        sections.push(`[${t.timestamp}] ${t.speaker}:\n${t.text}\n`);
      });
    }
  } else if (category === 'transcript') {
    sections.push(`${episode.title.toUpperCase()} - FULL TRANSCRIPT\n`);
    transcript.forEach((t: any) => {
      sections.push(`[${t.timestamp}] ${t.speaker}:\n${t.text}\n`);
    });
  } else {
    sections.push(`${episode.title.toUpperCase()} - ${category.toUpperCase().replace('_', ' ')}\n`);
    scopedAssets.forEach((ast: any) => {
      sections.push(`[${ast.platform.toUpperCase()}] ${ast.title}\nStatus: ${ast.status}\n\n${ast.content}\n\n----------------------------------------\n`);
    });
  }
  return { content: sections.join('\n'), isEmpty: false };
}

async function runTests() {
  console.log('=== Starting RepurposeAI Verification Tests ===');
  await connectMongoDB();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/episodes', episodeRoutes);
  app.use('/api/content', contentRoutes);

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    // 1. Authenticate test user
    const testEmail = `test-bugs-${Date.now()}@example.com`;
    const signup = await req(server, 'POST', '/api/auth/signup', {
      name: 'Bug Tester',
      email: testEmail,
      password: 'StrongPassword123!',
    });
    if (signup.status !== 201) throw new Error('Signup failed: ' + JSON.stringify(signup.body));
    const token = signup.body.data.token;
    const userId = signup.body.data.user.id;
    console.log('✓ PASS: Registered test user');

    // 2. Fetch existing episode from MongoDB to test against real persisted data
    const existingEpisodes = await db.episodes.find({});
    console.log(`✓ Found ${existingEpisodes.length} existing episodes in MongoDB Atlas`);
    if (existingEpisodes.length === 0) {
      throw new Error('No existing episodes found in MongoDB Atlas to verify against.');
    }

    const testEpisode = existingEpisodes[0];
    const episodeId = testEpisode.id;
    console.log(`✓ Testing with real episode: "${testEpisode.title}" (${episodeId})`);

    // Verify transcript records in MongoDB
    const dbTranscripts = await db.transcripts.find({ episodeId });
    console.log(`✓ Real MongoDB transcripts count for episode: ${dbTranscripts.length}`);

    // Verify assets records in MongoDB
    const dbAssets = await db.assets.find({ episodeId });
    console.log(`✓ Real MongoDB assets count for episode: ${dbAssets.length}`);

    // Create an episode owned by this test user to test API endpoints
    const testEpDoc = {
      id: `ep-test-${Date.now()}`,
      userId,
      title: 'Verification Episode with Real Transcripts',
      sourceType: 'video' as const,
      duration: '05:30',
      durationSeconds: 330,
      fileSize: '15 MB',
      status: 'Ready for Review' as const,
      summary: 'A deep dive into distributed systems and real persistence.',
      mainTopics: ['Systems', 'Databases', 'Cloud'],
      speakers: ['Alice', 'Bob'],
      tone: 'Conversational',
      keyTakeaways: ['Always await DB writes', 'Validate collections safely'],
      chapters: [
        { timestamp: '00:00', title: 'Intro', description: 'Overview' },
        { timestamp: '02:30', title: 'Deep Dive', description: 'Technical analysis' },
      ],
      dateProcessed: 'Oct 9, 2026',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.episodes.create(testEpDoc);

    // Insert real transcripts for this episode
    const transcriptDocs = [
      {
        id: `ts-${testEpDoc.id}-1`,
        episodeId: testEpDoc.id,
        userId,
        timestamp: '00:00',
        timestampSeconds: 0,
        speaker: 'Alice',
        text: 'Welcome to the deep dive on real persistence architectures.',
        createdAt: new Date().toISOString(),
      },
      {
        id: `ts-${testEpDoc.id}-2`,
        episodeId: testEpDoc.id,
        userId,
        timestamp: '02:30',
        timestampSeconds: 150,
        speaker: 'Bob',
        text: 'In production systems, memory fallbacks cause catastrophic state drift.',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.transcripts.createMany(transcriptDocs);

    // Insert approved, needs_review, and rejected assets
    const assetDocs = [
      {
        id: `ast-${testEpDoc.id}-li`,
        episodeId: testEpDoc.id,
        userId,
        platform: 'linkedin' as const,
        title: 'LinkedIn: The 3 Core Architecture Lessons',
        content: 'Lesson 1: Always await DB writes.\nLesson 2: Safe collections.\n\nThoughts?',
        status: 'approved' as const,
        lastEdited: 'Just now',
        wordCount: 20,
        readingTimeMinutes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `ast-${testEpDoc.id}-x`,
        episodeId: testEpDoc.id,
        userId,
        platform: 'x' as const,
        title: 'X Thread on Real Storage',
        content: '1/3 Real storage is mandatory.\n2/3 Never use in-memory fallbacks.\n3/3 End.',
        status: 'needs_review' as const,
        lastEdited: 'Just now',
        wordCount: 15,
        readingTimeMinutes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `ast-${testEpDoc.id}-sn`,
        episodeId: testEpDoc.id,
        userId,
        platform: 'show_notes' as const,
        title: 'Show Notes: Episode Breakdown',
        content: 'Overview: Detailed notes and chapter timestamps.',
        status: 'approved' as const,
        lastEdited: 'Just now',
        wordCount: 8,
        readingTimeMinutes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `ast-${testEpDoc.id}-rej`,
        episodeId: testEpDoc.id,
        userId,
        platform: 'blog' as const,
        title: 'Rejected Blog Draft',
        content: 'This draft was substandard and marked rejected.',
        status: 'rejected' as const,
        lastEdited: 'Just now',
        wordCount: 8,
        readingTimeMinutes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await db.assets.createMany(assetDocs);

    // --- TEST 1: GET /api/episodes returns transcript ---
    console.log('\n--- Test 1: GET /api/episodes transcript population ---');
    const getAllRes = await req(server, 'GET', '/api/episodes', undefined, token);
    if (getAllRes.status !== 200) throw new Error('GET /api/episodes returned status ' + getAllRes.status);
    const epFound = getAllRes.body.data.find((e: any) => e.id === testEpDoc.id);
    if (!epFound) throw new Error('Episode not found in GET /api/episodes');
    if (!Array.isArray(epFound.transcript)) throw new Error('epFound.transcript is not an array!');
    if (epFound.transcript.length !== 2) throw new Error(`Expected 2 transcript segments, got ${epFound.transcript.length}`);
    if (epFound.transcript[0].speaker !== 'Alice') throw new Error(`Expected Alice, got ${epFound.transcript[0].speaker}`);
    if (epFound.transcript[0].timestamp !== '00:00') throw new Error(`Expected 00:00 timestamp, got ${epFound.transcript[0].timestamp}`);
    console.log('✓ PASS: GET /api/episodes successfully returns populated transcript segments with correct timestamps and speaker');

    // --- TEST 2: GET /api/episodes/:id returns transcript ---
    console.log('\n--- Test 2: GET /api/episodes/:id transcript population ---');
    const getOneRes = await req(server, 'GET', `/api/episodes/${testEpDoc.id}`, undefined, token);
    if (getOneRes.status !== 200) throw new Error('GET /api/episodes/:id returned status ' + getOneRes.status);
    if (!Array.isArray(getOneRes.body.data.transcript) || getOneRes.body.data.transcript.length !== 2) {
      throw new Error('GET /api/episodes/:id did not return correct transcript segments');
    }
    console.log('✓ PASS: GET /api/episodes/:id returns full transcript');

    // --- TEST 3: GET /api/episodes/:id/transcript endpoint ---
    console.log('\n--- Test 3: GET /api/episodes/:id/transcript dedicated route ---');
    const getTrRes = await req(server, 'GET', `/api/episodes/${testEpDoc.id}/transcript`, undefined, token);
    if (getTrRes.status !== 200) throw new Error('GET /api/episodes/:id/transcript returned ' + getTrRes.status);
    if (!Array.isArray(getTrRes.body.data) || getTrRes.body.data.length !== 2) {
      throw new Error('GET /api/episodes/:id/transcript did not return 2 segments');
    }
    console.log('✓ PASS: GET /api/episodes/:id/transcript returns transcript segments array');

    // --- TEST 4: Export Modal Formatting and Safety ---
    console.log('\n--- Test 4: Export Modal Formatting and Logic ---');

    // Test All Content across Markdown, Plain Text, and JSON
    for (const fmt of ['md', 'txt', 'json'] as const) {
      const exportRes = generateExportContent(epFound, 'all', fmt);
      if (exportRes.isEmpty) throw new Error(`All Content export for ${fmt} was marked empty!`);
      if (!exportRes.content || exportRes.content.length < 50) throw new Error(`All Content export for ${fmt} was too short!`);
      // Verify rejected asset is EXCLUDED
      if (exportRes.content.includes('Rejected Blog Draft')) {
        throw new Error(`CRITICAL: Rejected asset was NOT excluded in format ${fmt}!`);
      }
      // Verify transcript is INCLUDED
      if (!exportRes.content.includes('Alice') || !exportRes.content.includes('00:00')) {
        throw new Error(`CRITICAL: Transcript was missing from All Content export in format ${fmt}!`);
      }
      console.log(`✓ PASS: All Content export in ${fmt.toUpperCase()} format excludes rejected assets and includes transcript`);
    }

    // Test Show Notes scope
    for (const fmt of ['md', 'txt', 'json'] as const) {
      const snExport = generateExportContent(epFound, 'show_notes', fmt);
      if (snExport.isEmpty) throw new Error(`Show notes export for ${fmt} was marked empty!`);
      if (!snExport.content.includes('Show Notes: Episode Breakdown')) {
        throw new Error(`Show notes title missing from ${fmt} export`);
      }
      if (snExport.content.includes('LinkedIn: The 3 Core')) {
        throw new Error(`Show notes export included LinkedIn post!`);
      }
      console.log(`✓ PASS: Show Notes scope export in ${fmt.toUpperCase()} format isolates show notes`);
    }

    // Test Social scope
    for (const fmt of ['md', 'txt', 'json'] as const) {
      const socExport = generateExportContent(epFound, 'social', fmt);
      if (socExport.isEmpty) throw new Error(`Social export for ${fmt} was marked empty!`);
      if (!socExport.content.includes('LinkedIn: The 3 Core') || !socExport.content.includes('X Thread on Real Storage')) {
        throw new Error(`Social export missing LinkedIn or X asset in ${fmt}`);
      }
      console.log(`✓ PASS: Social scope export in ${fmt.toUpperCase()} format includes eligible social posts`);
    }

    // Test Transcript scope
    for (const fmt of ['md', 'txt', 'json'] as const) {
      const trExport = generateExportContent(epFound, 'transcript', fmt);
      if (trExport.isEmpty) throw new Error(`Transcript export for ${fmt} was marked empty!`);
      if (!trExport.content.includes('Alice') || !trExport.content.includes('In production systems')) {
        throw new Error(`Transcript export missing dialogue in ${fmt}`);
      }
      console.log(`✓ PASS: Transcript scope export in ${fmt.toUpperCase()} format formats transcript lines`);
    }

    // --- TEST 5: Empty Selections & Rejection Handling ---
    console.log('\n--- Test 5: Empty selection handling without crashing ---');

    // Blog draft was rejected; blog scope should be reported as empty!
    const blogExport = generateExportContent(epFound, 'blog', 'md');
    if (!blogExport.isEmpty) {
      throw new Error('Blog export was expected to be empty because the only blog asset was rejected!');
    }
    console.log(`✓ PASS: Empty scope (blog with only rejected asset) safely detected: "${blogExport.emptyReason}"`);

    // Newsletter was never generated; newsletter scope should be reported as empty!
    const newsExport = generateExportContent(epFound, 'newsletter', 'md');
    if (!newsExport.isEmpty) {
      throw new Error('Newsletter export was expected to be empty because no newsletter exists!');
    }
    console.log(`✓ PASS: Empty scope (newsletter missing) safely detected: "${newsExport.emptyReason}"`);

    // Episode with undefined transcript and undefined assets
    const bareEpisode = {
      id: 'bare-1',
      title: 'Bare Episode',
      duration: '01:00',
      summary: '',
      transcript: undefined,
      assets: undefined,
    };
    const bareExport = generateExportContent(bareEpisode, 'transcript', 'md');
    if (!bareExport.isEmpty) {
      throw new Error('Bare episode transcript export should be empty!');
    }
    console.log('✓ PASS: Undefined collections handled safely without crashing (TypeError avoided)');

    // --- Clean up test episode ---
    await db.episodes.delete(testEpDoc.id);
    await db.transcripts.deleteMany({ episodeId: testEpDoc.id });
    await db.assets.deleteMany({ episodeId: testEpDoc.id });
    await db.users.delete(userId);
    console.log('\n✓ Cleaned up test episode and test records');

    console.log('\n========================================');
    console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
