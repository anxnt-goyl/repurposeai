import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from './aiService';

import { GoogleGenAI } from '@google/genai';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = { generateContent: mockGenerateContent };
    }
  };
});

describe('aiService API Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-mock-key';
  });

  it('PASS - Successful generation without retries', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ summary: 'Success summary' })
    });

    const res = await aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']);
    expect(res.summary).toBe('Success summary');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('PASS - Handles 429 Rate Limit with exponential backoff and succeeds', async () => {
    const error429 = new Error('Quota exceeded');
    (error429 as any).status = 429;

    mockGenerateContent
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        text: JSON.stringify({ summary: 'Recovered from 429' })
      });

    const start = Date.now();
    const res = await aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']);
    const elapsed = Date.now() - start;

    expect(res.summary).toBe('Recovered from 429');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    // First backoff is around 2000ms (+/- jitter)
    expect(elapsed).toBeGreaterThanOrEqual(1500);
  }, 10000);

  it('PASS - Handles 503 UNAVAILABLE with exponential backoff and succeeds', async () => {
    const error503 = new Error('This model is currently experiencing high demand.');
    (error503 as any).status = 'UNAVAILABLE';

    mockGenerateContent
      .mockRejectedValueOnce(error503)
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce({
        text: JSON.stringify({ summary: 'Recovered from 503' })
      });

    const start = Date.now();
    const res = await aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']);
    const elapsed = Date.now() - start;

    expect(res.summary).toBe('Recovered from 503');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    // Backoff 1 (~2000ms) + Backoff 2 (~4000ms) = ~6000ms
    expect(elapsed).toBeGreaterThanOrEqual(4500);
  }, 15000);

  it('PASS - Exhausts retries and returns clear error', async () => {
    const error503 = new Error('UNAVAILABLE');

    // Fails all 4 times (1 initial + 3 retries)
    mockGenerateContent.mockRejectedValue(error503);

    await expect(aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']))
      .rejects.toThrow(/Gemini AI is temporarily experiencing high server demand|503/);

    expect(mockGenerateContent).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 30000);

  it('PASS - Fails immediately on invalid API key (400/403) without retrying', async () => {
    const authError = new Error('API key not valid. Please pass a valid API key.');
    (authError as any).status = 'INVALID_ARGUMENT';

    mockGenerateContent.mockRejectedValueOnce(authError);

    await expect(aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']))
      .rejects.toThrow(/Invalid Gemini API key/);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('PASS - Daily quota exhaustion fails immediately without wasteful retries', async () => {
    const dailyQuotaError = new Error("Quota exceeded for quota metric 'Generate Content API requests per day'");
    (dailyQuotaError as any).status = 'RESOURCE_EXHAUSTED';

    mockGenerateContent.mockRejectedValue(dailyQuotaError);

    await expect(aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']))
      .rejects.toThrow(/Gemini AI free daily request quota has been reached/);

    // Verified: Called only 1 time, NO looping or retrying when daily quota is exhausted!
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('PASS - Handles malformed JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'Not valid JSON' });

    await expect(aiService.analyzeEpisodeTranscript('Title', 'Transcript', ['Host']))
      .rejects.toThrow(/Unexpected token|JSON/);
  });

  it('PASS - generateAllPlatformAssets rejects without substituting fake templates when Gemini fails', async () => {
    const error503 = new Error('UNAVAILABLE');
    (error503 as any).status = 503;
    mockGenerateContent.mockRejectedValue(error503);

    const fakeEp = {
      id: 'ep-test',
      userId: 'usr-1',
      title: 'Ep 1',
      sourceType: 'video' as const,
      duration: '10:00',
      durationSeconds: 600,
      fileSize: '10MB',
      status: 'Processing' as const,
      summary: 'Summary text',
      mainTopics: ['Tech'],
      speakers: ['Host'],
      tone: 'conversational',
      keyTakeaways: ['Lesson 1'],
      chapters: [],
      dateProcessed: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(aiService.generateAllPlatformAssets(fakeEp))
      .rejects.toThrow(/Gemini AI is temporarily experiencing high server demand|503/);
  }, 30000);

  it('PASS - generateAllPlatformAssets rejects when model output misses platforms', async () => {
    // Returns only linkedin, missing x, instagram, etc.
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        linkedin: { title: 'LI Title', content: 'This is a sufficiently long LinkedIn post with lots of insights and lessons.' },
      })
    });

    const fakeEp = {
      id: 'ep-test',
      userId: 'usr-1',
      title: 'Ep 1',
      sourceType: 'video' as const,
      duration: '10:00',
      durationSeconds: 600,
      fileSize: '10MB',
      status: 'Processing' as const,
      summary: 'Summary text',
      mainTopics: ['Tech'],
      speakers: ['Host'],
      tone: 'conversational',
      keyTakeaways: ['Lesson 1'],
      chapters: [],
      dateProcessed: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(aiService.generateAllPlatformAssets(fakeEp))
      .rejects.toThrow(/missing or empty output for x/);
  });

  it('PASS - generatePlatformAsset rejects when output is empty', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ title: 'Title', content: 'Short' })
    });

    const fakeEp = {
      id: 'ep-test',
      userId: 'usr-1',
      title: 'Ep 1',
      sourceType: 'video' as const,
      duration: '10:00',
      durationSeconds: 600,
      fileSize: '10MB',
      status: 'Processing' as const,
      summary: 'Summary text',
      mainTopics: ['Tech'],
      speakers: ['Host'],
      tone: 'conversational',
      keyTakeaways: ['Lesson 1'],
      chapters: [],
      dateProcessed: 'Today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(aiService.generatePlatformAsset(fakeEp, 'linkedin'))
      .rejects.toThrow('AI generated empty or insufficient content for linkedin.');
  });
});
