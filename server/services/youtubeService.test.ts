import { extractYouTubeVideoId, youtubeService } from './youtubeService.js';

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

function testVideoIdExtraction() {
  console.log('\n--- extractYouTubeVideoId ---');
  const cases: [string, string | null][] = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['', null],
    ['https://vimeo.com/123456', null],
    ['https://youtube.com/channel/UCxxx', null],
    ['not-a-url', null],
  ];
  for (const [input, expected] of cases) {
    const result = extractYouTubeVideoId(input);
    assert(
      `extractYouTubeVideoId(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`,
      result === expected,
      `got ${JSON.stringify(result)}`
    );
  }
}

function testIsValidUrl() {
  console.log('\n--- youtubeService.isValidUrl ---');
  assert('valid watch URL', youtubeService.isValidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  assert('valid youtu.be URL', youtubeService.isValidUrl('https://youtu.be/dQw4w9WgXcQ'));
  assert('valid shorts URL', youtubeService.isValidUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'));
  assert('valid embed URL', youtubeService.isValidUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'));
  assert('rejects empty string', !youtubeService.isValidUrl(''));
  assert('rejects vimeo URL', !youtubeService.isValidUrl('https://vimeo.com/123'));
  assert('rejects plain text', !youtubeService.isValidUrl('hello world'));
}

async function testLiveTranscript() {
  console.log('\n--- getTranscript (live network) ---');
  const PUBLIC_VIDEO_WITH_CAPTIONS = 'dQw4w9WgXcQ';

  try {
    const result = await youtubeService.getTranscript(
      `https://www.youtube.com/watch?v=${PUBLIC_VIDEO_WITH_CAPTIONS}`
    );
    assert('result is an object', typeof result === 'object' && result !== null);
    assert('title is a non-empty string', typeof result.title === 'string' && result.title.length > 0, result.title);
    assert('duration is MM:SS format', /^\d{2}:\d{2}$/.test(result.duration), result.duration);
    assert('durationSeconds > 0', result.durationSeconds > 0, String(result.durationSeconds));
    assert('transcriptText is non-empty', result.transcriptText.length > 100, `length=${result.transcriptText.length}`);
    assert('segments is non-empty array', Array.isArray(result.segments) && result.segments.length > 0, `count=${result.segments.length}`);
    if (result.segments.length > 0) {
      const seg = result.segments[0];
      assert('segment has timestamp', /^\d{2}:\d{2}$/.test(seg.timestamp), seg.timestamp);
      assert('segment has timestampSeconds >= 0', typeof seg.timestampSeconds === 'number' && seg.timestampSeconds >= 0);
      assert('segment has non-empty text', typeof seg.text === 'string' && seg.text.length > 0, seg.text);
    }
    console.log(`  Title: "${result.title}"`);
    console.log(`  Duration: ${result.duration} (${result.durationSeconds}s)`);
    console.log(`  Segments: ${result.segments.length}`);
    console.log(`  Transcript snippet: "${result.transcriptText.slice(0, 80)}..."`);
  } catch (err: any) {
    assert('getTranscript succeeded', false, err.message);
  }
}

async function testInvalidUrlError() {
  console.log('\n--- getTranscript error handling ---');
  try {
    await youtubeService.getTranscript('https://vimeo.com/123456');
    assert('throws on invalid URL', false, 'no error thrown');
  } catch (err: any) {
    assert('throws on invalid URL', true, err.message);
  }

  try {
    await youtubeService.getTranscript('');
    assert('throws on empty string', false, 'no error thrown');
  } catch (err: any) {
    assert('throws on empty string', true, err.message);
  }
}

async function main() {
  testVideoIdExtraction();
  testIsValidUrl();
  await testLiveTranscript();
  await testInvalidUrlError();

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
