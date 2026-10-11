import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript';

export interface YouTubeTranscriptItem {
  timestamp: string;
  timestampSeconds: number;
  text: string;
}

export interface YouTubeResult {
  title: string;
  duration: string;
  durationSeconds: number;
  transcriptText: string;
  segments: YouTubeTranscriptItem[];
}

const SHORTS_PATTERN = /youtube\.com\/shorts\/([^"&?\/\s]{11})/i;
const STANDARD_PATTERN =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m1 = trimmed.match(SHORTS_PATTERN);
  if (m1) return m1[1];
  const m2 = trimmed.match(STANDARD_PATTERN);
  if (m2) return m2[1];
  return null;
}

export function getCanonicalYouTubeUrl(urlOrId: string): string | null {
  const id = extractYouTubeVideoId(urlOrId);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

function msToTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function classifyError(err: unknown, videoId: string): Error {
  if (err instanceof YoutubeTranscriptTooManyRequestError) {
    return new Error(
      'YouTube is rate-limiting this server. Please try again in a few minutes.'
    );
  }
  if (err instanceof YoutubeTranscriptVideoUnavailableError) {
    return new Error(
      `The video is unavailable or private (${videoId}). Ensure the video is publicly accessible.`
    );
  }
  if (err instanceof YoutubeTranscriptDisabledError) {
    return new Error(
      `Captions are disabled on this video (${videoId}). Upload the audio/video file directly to transcribe it.`
    );
  }
  if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return new Error(
      `No English captions available for this video (${videoId}). Try another language or upload the file directly.`
    );
  }
  if (err instanceof YoutubeTranscriptNotAvailableError) {
    return new Error(
      `No captions found for this video (${videoId}). Upload the audio/video file directly to transcribe it.`
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.toLowerCase().includes('impossible to retrieve')) {
    return new Error(
      'Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/'
    );
  }
  return new Error(`YouTube transcript extraction failed: ${message}`);
}

async function fetchVideoMetadata(
  videoId: string
): Promise<{ title: string; durationSeconds: number }> {
  // 1. First try YouTube oEmbed API (fast, reliable, official endpoint)
  try {
    const oembedController = new AbortController();
    const oembedTimer = setTimeout(() => oembedController.abort(), 6000);
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepurposeAI/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: oembedController.signal,
      }
    );
    clearTimeout(oembedTimer);
    if (oembedRes.ok) {
      const oembedData: any = await oembedRes.json();
      if (oembedData && typeof oembedData.title === 'string' && oembedData.title.trim()) {
        const cleanTitle = oembedData.title.trim();
        return { title: cleanTitle, durationSeconds: 0 };
      }
    }
  } catch (oembedErr: any) {
    console.warn(`[YOUTUBE] oEmbed metadata lookup warning for ${videoId}:`, oembedErr.message);
  }

  // 2. Fallback to HTML scrape
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    if (!res.ok) return { title: 'Untitled YouTube Project', durationSeconds: 0 };
    const html = await res.text();

    let title = 'Untitled YouTube Project';
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else {
      const simpleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (simpleMatch && simpleMatch[1]) {
        title = simpleMatch[1].replace(/ - YouTube$/i, '').trim();
      }
    }

    let durationSeconds = 0;
    const durMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (durMatch) durationSeconds = parseInt(durMatch[1], 10);

    return { title: title || 'Untitled YouTube Project', durationSeconds };
  } catch {
    return { title: 'Untitled YouTube Project', durationSeconds: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export const youtubeService = {
  isValidUrl(url: string): boolean {
    return !!extractYouTubeVideoId(url);
  },

  async getTranscript(youtubeUrl: string): Promise<YouTubeResult> {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error(
        'Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/'
      );
    }

    let rawItems: Awaited<ReturnType<typeof YoutubeTranscript.fetchTranscript>>;
    try {
      rawItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    } catch (firstErr) {
      if (firstErr instanceof YoutubeTranscriptNotAvailableLanguageError) {
        try {
          rawItems = await YoutubeTranscript.fetchTranscript(videoId);
        } catch (fallbackErr) {
          throw classifyError(fallbackErr, videoId);
        }
      } else {
        throw classifyError(firstErr, videoId);
      }
    }

    if (!rawItems || rawItems.length === 0) {
      throw new Error(
        `No transcript content returned for video ${videoId}. The video may have empty captions.`
      );
    }

    const segments: YouTubeTranscriptItem[] = rawItems
      .map((item) => ({
        timestamp: msToTimestamp(item.offset),
        timestampSeconds: Math.floor(item.offset / 1000),
        text: item.text.replace(/\n/g, ' ').trim(),
      }))
      .filter((s) => s.text.length > 0);

    if (segments.length === 0) {
      throw new Error(
        `Captions for video ${videoId} contained no readable text. Upload the audio/video file directly for transcription.`
      );
    }

    const transcriptText = segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n');

    const lastItem = rawItems[rawItems.length - 1];
    const estimatedDurationSec =
      Math.floor((lastItem.offset + (lastItem.duration ?? 0)) / 1000) ||
      segments[segments.length - 1].timestampSeconds + 10;

    const { title, durationSeconds: fetchedDuration } = await fetchVideoMetadata(videoId);
    const finalDurationSeconds = fetchedDuration > 0 ? fetchedDuration : estimatedDurationSec;

    const durMin = Math.floor(finalDurationSeconds / 60);
    const durSec = finalDurationSeconds % 60;
    const duration = `${durMin.toString().padStart(2, '0')}:${durSec.toString().padStart(2, '0')}`;

    return {
      title,
      duration,
      durationSeconds: finalDurationSeconds,
      transcriptText,
      segments,
    };
  },
};
