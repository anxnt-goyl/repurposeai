import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import episodeRoutes from '../routes/episodeRoutes.js';
import contentRoutes from '../routes/contentRoutes.js';
import { db, connectMongoDB } from '../db/store.js';
import dotenv from 'dotenv';
dotenv.config();

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
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
}

async function main() {
  await connectMongoDB();
  const app = express();
  app.use(express.json({ limit: '100mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/episodes', episodeRoutes);
  app.use('/api/content', contentRoutes);

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      s.headersTimeout = 300_000;
      s.requestTimeout = 300_000;
      resolve(s);
    });
  });

  console.log('--- Register and Sign In ---');
  const email = `workflow-${Date.now()}@example.com`;
  const pw = 'StrongPass123';
  const signup = await req(server, 'POST', '/api/auth/signup', { name: 'Workflow', email, password: pw });
  if (signup.status !== 201) throw new Error('Signup failed: ' + JSON.stringify(signup.body));
  const token = signup.body.data.token;
  console.log('PASS  Register and Sign In');

  console.log('--- Submit YouTube URL ---');
  const epRes = await req(server, 'POST', '/api/episodes', {
    sourceType: 'youtube',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }, token);
  if (epRes.status !== 201) throw new Error('Episode creation failed: ' + JSON.stringify(epRes.body));
  console.log('PASS  Submit YouTube URL, extract transcript, run Gemini');

  const epId = epRes.body.data.id;
  const assets = epRes.body.data.assets;
  if (!assets || assets.length === 0) throw new Error('No assets generated');
  console.log('PASS  Generate content via Gemini');

  console.log('--- Edit and Approve ---');
  const assetToEdit = assets[0];
  const updateRes = await req(server, 'PATCH', `/api/content/${assetToEdit.id}`, { content: 'Edited content', status: 'approved' }, token);
  if (updateRes.status !== 200) throw new Error('Asset update failed: ' + JSON.stringify(updateRes.body));
  console.log('PASS  Edit and Approve');

  console.log('--- Verify Persistence ---');
  const getEp = await req(server, 'GET', `/api/episodes/${epId}`, undefined, token);
  if (getEp.status !== 200 || getEp.body.data.title !== epRes.body.data.title) throw new Error('Persistence check failed');
  console.log('PASS  Persistence Check');

  // Clean up
  await db.episodes.delete(epId);
  server.close();
  console.log('ALL WORKFLOW TESTS PASSED');
  process.exit(0);
}

main().catch(err => {
  console.error('FAIL Workflow:', err);
  process.exit(1);
});
