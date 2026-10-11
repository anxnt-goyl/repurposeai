/**
 * Integration tests for auth routes, episode ownership, and API error handling.
 * Runs against a live in-process Express server using the same store as production.
 */
import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import episodeRoutes from '../routes/episodeRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import { db, connectMongoDB } from '../db/store.js';
import dotenv from 'dotenv';
dotenv.config();

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`${PASS}  ${label}`);
    passed++;
  } else {
    console.log(`${FAIL}  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function req(
  server: any,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
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
  // Build a minimal express app identical to production routing
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/episodes', episodeRoutes);
  app.use('/api', userRoutes);

  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const emailA = `test-a-${randomSuffix}@example.com`;
  const emailB = `test-b-${randomSuffix}@example.com`;
  const password = 'TestPass123';

  console.log('\n--- Signup ---');

  // Signup A
  const signupA = await req(server, 'POST', '/api/auth/signup', { name: 'User A', email: emailA, password });
  assert('signup A returns 201', signupA.status === 201, `got ${signupA.status}`);
  assert('signup A returns token', typeof signupA.body?.data?.token === 'string');
  const tokenA = signupA.body?.data?.token as string;

  // Signup B
  const signupB = await req(server, 'POST', '/api/auth/signup', { name: 'User B', email: emailB, password });
  assert('signup B returns 201', signupB.status === 201, `got ${signupB.status}`);
  const tokenB = signupB.body?.data?.token as string;

  // Duplicate signup must return 409, NOT overwrite existing account
  const signupDup = await req(server, 'POST', '/api/auth/signup', { name: 'User A Dup', email: emailA, password });
  assert('duplicate signup returns 409', signupDup.status === 409, `got ${signupDup.status}: ${JSON.stringify(signupDup.body)}`);

  // Weak password
  const signupWeak = await req(server, 'POST', '/api/auth/signup', { name: 'Weak', email: `weak-${randomSuffix}@test.com`, password: 'abc' });
  assert('weak password signup returns 400', signupWeak.status === 400, `got ${signupWeak.status}`);

  console.log('\n--- Login ---');

  const loginA = await req(server, 'POST', '/api/auth/login', { email: emailA, password });
  assert('login A returns 200', loginA.status === 200, `got ${loginA.status}`);
  assert('login A returns token', typeof loginA.body?.data?.token === 'string');

  const loginBadPw = await req(server, 'POST', '/api/auth/login', { email: emailA, password: 'wrongpass' });
  assert('wrong password returns 401', loginBadPw.status === 401, `got ${loginBadPw.status}`);

  const loginNoEmail = await req(server, 'POST', '/api/auth/login', { email: '', password });
  assert('empty email returns 400', loginNoEmail.status === 400, `got ${loginNoEmail.status}`);

  const loginUnknown = await req(server, 'POST', '/api/auth/login', { email: `nobody-${randomSuffix}@x.com`, password });
  assert('unknown email returns 401', loginUnknown.status === 401, `got ${loginUnknown.status}`);

  console.log('\n--- Protected routes ---');

  const meNoToken = await req(server, 'GET', '/api/auth/me');
  assert('/me without token returns 401', meNoToken.status === 401, `got ${meNoToken.status}`);

  const meA = await req(server, 'GET', '/api/auth/me', undefined, tokenA);
  assert('/me with valid token returns 200', meA.status === 200, `got ${meA.status}`);
  assert('/me returns correct email', meA.body?.data?.user?.email === emailA, meA.body?.data?.user?.email);

  const meInvalid = await req(server, 'GET', '/api/auth/me', undefined, 'Bearer invalid.token.here');
  assert('invalid token returns 401', meInvalid.status === 401, `got ${meInvalid.status}`);

  console.log('\n--- Authorization isolation ---');

  // Create a fake episode for user A directly in db
  const epId = `ep-test-${Date.now()}`;
  await db.episodes.create({
    id: epId,
    userId: signupA.body.data.user.id,
    title: 'Test Episode A',
    sourceType: 'youtube',
    duration: '10:00',
    durationSeconds: 600,
    fileSize: 'test',
    status: 'Ready for Review',
    summary: 'test summary',
    mainTopics: [],
    speakers: [],
    tone: 'neutral',
    keyTakeaways: [],
    chapters: [],
    dateProcessed: 'today',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // User A can read their own episode
  const epA = await req(server, 'GET', `/api/episodes/${epId}`, undefined, tokenA);
  assert('user A can read own episode', epA.status === 200, `got ${epA.status}`);

  // User B cannot read user A's episode
  const epBSteal = await req(server, 'GET', `/api/episodes/${epId}`, undefined, tokenB);
  assert('user B cannot read user A episode (returns 404)', epBSteal.status === 404, `got ${epBSteal.status}`);

  // User B cannot delete user A's episode
  const epBDel = await req(server, 'DELETE', `/api/episodes/${epId}`, undefined, tokenB);
  assert('user B cannot delete user A episode (returns 404)', epBDel.status === 404, `got ${epBDel.status}`);

  // Clean up
  await db.episodes.delete(epId);

  console.log('\n--- Stats / Preferences ---');

  const statsA = await req(server, 'GET', '/api/stats', undefined, tokenA);
  assert('stats returns 200 with real data', statsA.status === 200, `got ${statsA.status}`);
  assert('stats has totalEpisodes field', typeof statsA.body?.data?.totalEpisodes === 'number');

  const prefsA = await req(server, 'GET', '/api/preferences', undefined, tokenA);
  assert('preferences returns 200', prefsA.status === 200, `got ${prefsA.status}`);
  assert('preferences has tone field', typeof prefsA.body?.data?.tone === 'string');

  const patchPrefs = await req(server, 'PATCH', '/api/preferences', { tone: 'professional' }, tokenA);
  assert('PATCH preferences returns 200', patchPrefs.status === 200, `got ${patchPrefs.status}`);
  assert('PATCH preferences updates tone', patchPrefs.body?.data?.tone === 'professional', patchPrefs.body?.data?.tone);

  server.close();

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
