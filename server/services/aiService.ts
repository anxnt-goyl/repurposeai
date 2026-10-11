import { GoogleGenAI } from '@google/genai';
import { DBEpisode, DBMoment, DBContentAsset, DBTranscriptSegment } from '../db/types';

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Parses retry delay from error if specified by Gemini RPC (e.g., "retryDelay": "3s" or "Please retry in 3.78s")
 */
export function extractRetryDelayMs(error: any): number {
  try {
    const errorStr = typeof error === 'string' ? error : JSON.stringify(error) + (error?.message || '');
    const matchSeconds = errorStr.match(/retry in\s+([\d.]+)s/i) || errorStr.match(/retryDelay"?:\s*"([\d.]+)s/i);
    if (matchSeconds && matchSeconds[1]) {
      const sec = parseFloat(matchSeconds[1]);
      if (!isNaN(sec) && sec > 0) {
        // If the service requests a delay over 60 seconds (e.g. daily quota window of 28,800s),
        // do not block execution with useless sleep loops.
        if (sec > 60) return 0;
        return Math.min(10000, Math.ceil(sec * 1000) + 500); // add 500ms safety cushion
      }
    }
  } catch {
    // fallback
  }
  return 3800; // default 3.8s for Gemini 5 RPM tier
}

/**
 * Distinguishes daily cumulative quota exhaustion from transient burst rate-limits.
 * Never loop-retry daily exhausted quota.
 */
export function isDailyQuotaExhausted(error: any): boolean {
  if (!error) return false;
  const str = String(error.message || '') + ' ' + JSON.stringify(error);
  if (
    str.includes('GenerateRequestsPerDay') ||
    str.includes('requests per day') ||
    str.includes('requests per day per project') ||
    str.includes('daily limit reached')
  ) {
    return true;
  }
  // Check if error contains an unusually long retryDelay (> 60s, e.g., 28799s)
  try {
    const match = str.match(/retryDelay"?:\s*"([\d.]+)s/i) || str.match(/retry in\s+([\d.]+)s/i);
    if (match && match[1]) {
      const sec = parseFloat(match[1]);
      if (!isNaN(sec) && sec > 60) return true;
    }
  } catch {}
  return false;
}

/**
 * Returns true only for transient errors that can succeed upon bounded retry:
 * - 503 UNAVAILABLE / high demand
 * - 429 short burst rate limits (RPM)
 * - Network timeouts / connection resets
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;
  // If daily quota is exhausted, it is permanent for today — do NOT retry
  if (isDailyQuotaExhausted(error)) return false;

  const str = String(error.message || '') + String(error.status || '') + ' ' + JSON.stringify(error);
  return (
    str.includes('503') ||
    str.includes('UNAVAILABLE') ||
    str.includes('high demand') ||
    str.includes('overloaded') ||
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('rate-limits') ||
    str.includes('Rate limit') ||
    str.includes('ETIMEDOUT') ||
    str.includes('ECONNRESET') ||
    str.includes('fetch failed') ||
    str.includes('UND_ERR_CONNECT_TIMEOUT')
  );
}

/**
 * Formats Gemini/RPC error into a human-readable, actionable message instead of raw JSON dumps
 */
export function formatAIErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred during AI content generation.';

  if (isDailyQuotaExhausted(error)) {
    return 'Gemini AI free daily request quota has been reached. Please wait for the daily quota window to reset or upgrade your Google AI Studio plan.';
  }

  const str = String(error.message || '') + ' ' + JSON.stringify(error);

  if (str.includes('503') || str.includes('UNAVAILABLE') || str.includes('high demand') || str.includes('overloaded')) {
    return 'Gemini AI is temporarily experiencing high server demand (503 Service Unavailable). Please click Retry to resume processing.';
  }

  if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED') || str.includes('rate-limits') || str.includes('Rate limit')) {
    return 'Gemini AI request rate limit reached (requests per minute). Please wait a moment and click Retry.';
  }

  if (str.includes('ETIMEDOUT') || str.includes('ECONNRESET') || str.includes('fetch failed') || str.includes('UND_ERR_CONNECT_TIMEOUT')) {
    return 'Connection to Gemini AI timed out. Please check your network connection and click Retry.';
  }

  if (str.includes('API_KEY_INVALID') || str.includes('API key not valid') || str.includes('401') || str.includes('403')) {
    return 'Invalid Gemini API key. Please verify GEMINI_API_KEY in your environment configuration.';
  }

  if (str.includes('not found') || str.includes('404')) {
    return 'The configured Gemini AI model is currently unavailable on this API endpoint.';
  }

  // Strip error prefix if present
  const baseMsg = typeof error === 'string' ? error : error.message || 'AI content generation failed.';
  return baseMsg.replace(/^Error:\s*/i, '').trim();
}

/**
 * Executes a Gemini operation with bounded exponential backoff and jitter for transient errors only
 */
async function callWithTransientRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('AI generation is not configured. GEMINI_API_KEY is missing.');
  }

  let attempt = 0;
  while (true) {
    try {
      return await operation(ai);
    } catch (err: any) {
      attempt++;

      // Immediately fail without retrying if daily quota is exhausted
      if (isDailyQuotaExhausted(err)) {
        console.warn('[AI] Daily quota exhausted. Fast-failing without wasteful retry loops.');
        throw new Error(formatAIErrorMessage(err));
      }

      // Retry only transient 429/503/timeout errors
      if (attempt <= maxRetries && isTransientError(err)) {
        let delayMs = extractRetryDelayMs(err);
        // Exponential backoff if delay isn't explicitly set by header
        if (delayMs === 3800 || delayMs === 0) {
          delayMs = Math.min(10000, 2000 * Math.pow(2, attempt - 1));
        }
        // Add jitter (±20%)
        const jitter = delayMs * 0.2 * (Math.random() * 2 - 1);
        delayMs = Math.floor(delayMs + jitter);

        console.warn(`[AI] Transient error (${err.status || '429/503'}) encountered. Backing off for ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw new Error(formatAIErrorMessage(err));
    }
  }
}

export interface EpisodeAnalysisResult {
  summary: string;
  mainTopics: string[];
  speakers: string[];
  tone: string;
  keyTakeaways: string[];
  chapters: Array<{ timestamp: string; title: string; description: string }>;
  moments: Array<{
    timestamp: string;
    title: string;
    quote: string;
    type: 'Hook' | 'Quote' | 'Insight' | 'Takeaway' | 'Story' | 'Controversial';
    score: number;
    whyItMatters: string;
    potentialPlatforms: Array<'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes'>;
  }>;
  transcriptSegments?: Array<{
    timestamp: string;
    speaker: string;
    text: string;
  }>;
}

export type PlatformType = 'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes';

/**
 * Editorial fallback generator when Gemini quota is exhausted or AI is offline.
 * Produces distinctive, publication-ready copy adhering to platform-native conventions.
 */
export function generateEditorialFallback(
  episode: DBEpisode,
  platform: PlatformType,
  moment?: DBMoment,
  toneModifier: 'standard' | 'concise' | 'punchy' = 'standard',
  userPreferences?: { tone?: string; contentLength?: string }
): { title: string; content: string; wordCount: number; readingTimeMinutes: number } {
  const quote = moment?.quote || (episode.keyTakeaways && episode.keyTakeaways[0]) || episode.summary;
  const quoteTitle = moment?.title || 'Core Principle';
  const takeaways = episode.keyTakeaways?.length ? episode.keyTakeaways : ['Focus on high-leverage workflows.'];
  const chapters = episode.chapters?.length ? episode.chapters : [{ timestamp: '00:00', title: 'Introduction' }];

  let title = '';
  let content = '';

  if (platform === 'linkedin') {
    title = `${episode.title}: The 3 Strategic Shifts`;
    if (toneModifier === 'punchy') {
      content = `Most creators produce 10x more noise when they should be extracting 10x more leverage.

"${quote}"

Here are the 3 non-negotiable shifts from ${episode.title}:

1. ${takeaways[0] || 'Quality beats raw output every time.'}
2. ${takeaways[1] || 'Context retention is your distribution moat.'}
3. ${takeaways[2] || 'Ruthless curation turns one recording into a media engine.'}

The bottleneck is no longer synthesis. It is editorial taste.

Which of these three shifts are you implementing this quarter?`;
    } else if (toneModifier === 'concise') {
      content = `Key takeaway from "${episode.title}":

"${quote}"

The framework:
• ${takeaways[0] || 'Prioritize leverage over volume.'}
• ${takeaways[1] || 'Platform-native framing over lazy syndication.'}
• ${takeaways[2] || 'Human-in-the-loop review ensures tone fidelity.'}

Read and share your thoughts below.`;
    } else {
      content = `In our latest deep dive on "${episode.title}", one insight stood out above everything else:

"${quote}"

Too many founders and creators treat content creation as a treadmill: produce, publish, repeat, burnout.

Instead, the highest leverage operators apply an editorial multiplication engine:

1. Anchor with conviction:
${takeaways[0] || 'Start with a high-resonance core thesis.'}

2. Translate, do not copy:
${takeaways[1] || 'Each platform requires distinct psychological pacing and formatting.'}

3. Build compounding systems:
${takeaways[2] || 'Your archives should generate recurring value rather than collecting digital dust.'}

How is your team rethinking media repurposing this year? Drop your thoughts in the comments.`;
    }
  } else if (platform === 'x') {
    title = `${episode.title} [Thread]`;
    if (toneModifier === 'punchy') {
      content = `1/4 "${quote}"

Here is what most builders get wrong about content distribution (and how to fix it):

2/4 ${takeaways[0] || 'Raw volume without curation is just spam. Elevate the signal.'}

3/4 ${takeaways[1] || 'Adapt the message to each surface. LinkedIn wants nuance; X demands brevity.'}

4/4 Full breakdown in "${episode.title}". Bookmark this thread if you found it useful.`;
    } else if (toneModifier === 'concise') {
      content = `1/3 "${quote}"

2/3 2 key rules from ${episode.title}:
• ${takeaways[0] || 'Leverage your existing recordings.'}
• ${takeaways[1] || 'Editorial curation is the real moat.'}

3/3 Full episode notes linked below.`;
    } else {
      content = `1/5 The greatest bottleneck in creative output is not creation. It is extraction.

"${quote}"

From our conversation in "${episode.title}":

2/5 Shift #1: ${takeaways[0] || 'Focus on high-leverage workflows over endless production.'}

3/5 Shift #2: ${takeaways[1] || 'Repurposing without voice calibration destroys trust.'}

4/5 Shift #3: ${takeaways[2] || 'Editors-in-chief will dominate prompt-and-paste creators.'}

5/5 Repost the first tweet if you agree. Full recording and show notes in bio.`;
    }
  } else if (platform === 'instagram') {
    title = `${episode.title} Carousel & Caption`;
    content = `[CAROUSEL SLIDES]

Slide 1: [Hook] "${quote}"
Slide 2: [The Problem] Creating more content isn't the answer. Extracting more leverage is.
Slide 3: [Shift 1] ${takeaways[0] || 'Curation over noise.'}
Slide 4: [Shift 2] ${takeaways[1] || 'Calibrate to the platform idiom.'}
Slide 5: [Action] Save this post and listen to "${episode.title}".

[CAPTION]
"${quote}"

In our latest episode, we broke down the exact framework for turning one recorded asset into an entire distribution engine.

Swipe through for the 3 core principles. 

Which slide resonated most with you? Drop a comment below or tap the link in bio for the complete recording!`;
  } else if (platform === 'blog') {
    title = `The Content Multiplication Moat: Lessons from ${episode.title}`;
    content = `# The Content Multiplication Moat: Lessons from ${episode.title}

## Executive Summary
${episode.summary}

> "${quote}"
> — *${episode.speakers?.[0] || 'Editorial Host'}*, *${episode.title}*

---

## 1. The Core Tension
In high-growth media operations, the impulse is almost always to produce more: record more hours, launch more podcasts, publish more posts. Yet this approach inevitably leads to audience fatigue and creator burnout.

As explored in this session, the real competitive moat lies in **content multiplication**—the disciplined extraction of high-conviction insights tailored to distinct distribution channels.

## 2. Key Frameworks & Strategic Pillars

### Pillar A: ${takeaways[0] || 'Leverage Over Volume'}
Rather than treating a single recording as an ephemeral event, view it as an asset library. Every episode contains core hooks, counterintuitive premises, and tactical playbooks.

### Pillar B: ${takeaways[1] || 'Platform-Native Translation'}
Direct cross-posting fails because each platform possesses its own reader psychology. What functions as a thoughtful opening paragraph on LinkedIn feels bloated on X. Editorial translation preserves the thesis while respecting the medium.

### Pillar C: ${takeaways[2] || 'Editorial Taste as the Bottleneck'}
Automation can assist transcription and drafts, but the final editorial judgment remains the true differentiator.

## 3. Key Chapters & Timeline
${chapters.map((c) => `- **${c.timestamp}**: ${c.title}`).join('\n')}

## 4. Conclusion & Action Items
Review your past 3 episodes. Extract the single highest-resonance quote and draft 3 native variations. The leverage is already in your archives.`;
  } else if (platform === 'newsletter') {
    title = `Issue #48: Why More Content Isn't Working (${episode.title})`;
    content = `Hey friends,

Earlier this week, during a recording of "${episode.title}", a single remark stopped me in my tracks:

"${quote}"

Think about how much time you spent recording, producing, and polishing your last project. Now ask yourself: how much of that wisdom actually made it into the hands of people who needed it?

Most creators publish once, tweet twice, and move on. That is leaving 90% of your value on the table.

Here are the 3 big ideas we unpacked:

1. ${takeaways[0] || 'Your archive is an underutilized goldmine.'}
2. ${takeaways[1] || 'Format to the platform, don’t just copy-paste.'}
3. ${takeaways[2] || 'Taste is the only defensible barrier against AI slop.'}

Hit reply and let me know: what is the single best piece of advice you’ve recorded that hasn’t gotten the reach it deserves?

Best,
Editorial Team`;
  } else if (platform === 'show_notes') {
    title = `Official Show Notes: ${episode.title}`;
    content = `# ${episode.title}

**Duration**: ${episode.duration || '45 mins'} | **Format**: ${episode.sourceType || 'Audio/Video'}
**Speakers**: ${episode.speakers?.join(', ') || 'Host & Guests'}

---

## Overview
${episode.summary}

## Key Quotes & Highlights
> "${quote}"
— *Timestamp: ${moment?.timestamp || '02:40'}*

## Key Takeaways
${takeaways.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

## Chapter Timestamps
${chapters.map((c: any) => `• [${c.timestamp}] ${c.title}${c.description ? ` - ${c.description}` : ''}`).join('\n')}

## Links & Resources
• Full video release and transcript on RepurposeAI
• Connect with the speakers in the community discussion`;
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 180));

  return {
    title,
    content,
    wordCount: words,
    readingTimeMinutes: readingTime,
  };
}

export const aiService = {
  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return !!key && key !== 'MY_GEMINI_API_KEY';
  },

  /**
   * Analyzes episode transcript to produce summary, chapters, topics, and moments with rate limit retry
   */
  async analyzeEpisodeTranscript(
    title: string,
    transcriptText: string,
    providedSpeakers?: string[]
  ): Promise<EpisodeAnalysisResult> {
    const prompt = `You are an elite editorial content director and media strategist.
Analyze the following media transcript for an episode titled "${title}".

TRANSCRIPT:
${transcriptText.slice(0, 30000)}

${providedSpeakers && providedSpeakers.length > 0 ? `Speakers known: ${providedSpeakers.join(', ')}` : ''}

Generate a comprehensive, structured analysis in strict JSON format with the following keys:
{
  "summary": "Concise, compelling 2-3 sentence executive overview of what was discussed, core tension, and resolution.",
  "mainTopics": ["3-6 high-level keyword topic tags"],
  "speakers": ["List of identified speaker names"],
  "tone": "Descriptive phrase characterizing the conversational style (e.g., 'Analytical, tactical, contrarian')",
  "keyTakeaways": ["3-5 punchy, high-conviction bullet point takeaways that provide immense value"],
  "chapters": [
    {
      "timestamp": "MM:SS",
      "title": "Clear thematic section title",
      "description": "1 sentence describing the topic discussed in this chapter"
    }
  ],
  "moments": [
    {
      "timestamp": "MM:SS",
      "title": "Punchy headline for this moment",
      "quote": "Exact or near-verbatim high-impact quotation from the transcript",
      "type": "Hook",
      "score": 92,
      "whyItMatters": "Why this moment hooks listeners or drives engagement",
      "potentialPlatforms": ["linkedin", "x", "instagram", "blog", "newsletter", "show_notes"]
    }
  ]
}

Provide at least 4-8 extracted moments and 3-6 chapters with realistic timestamps starting at 00:00.
Return ONLY valid JSON. No markdown code blocks, no preamble.`;

    try {
      const response = await callWithTransientRetry(async (ai) => {
        return ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText) as EpisodeAnalysisResult;

      return {
        summary: parsed.summary || `Strategic discussion and insights from "${title}".`,
        mainTopics: Array.isArray(parsed.mainTopics) && parsed.mainTopics.length > 0 ? parsed.mainTopics : ['Strategy', 'Media', 'Execution'],
        speakers: Array.isArray(parsed.speakers) && parsed.speakers.length > 0 ? parsed.speakers : (providedSpeakers || ['Host', 'Guest']),
        tone: parsed.tone || 'Conversational, analytical, forward-looking',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0 ? parsed.keyTakeaways : ['Focus on high-leverage workflows.'],
        chapters: Array.isArray(parsed.chapters) && parsed.chapters.length > 0 ? parsed.chapters : [{ timestamp: '00:00', title: 'Introduction', description: 'Overview and core premises.' }],
        moments: Array.isArray(parsed.moments) ? parsed.moments : [],
      };
    } catch (err: any) {
      const userMessage = formatAIErrorMessage(err);
      console.error('[AI] analyzeEpisodeTranscript error:', userMessage);
      throw new Error(userMessage);
    }
  },

  /**
   * Generates ALL platform assets in a SINGLE multi-platform prompt.
   * Drastically reduces Gemini RPM from 6 calls down to 1 call, preventing 429 quota exhaustion.
   */
  async generateAllPlatformAssets(
    episode: DBEpisode,
    moment?: DBMoment,
    userPreferences?: { tone?: string; contentLength?: string }
  ): Promise<Record<PlatformType, { title: string; content: string; wordCount: number; readingTimeMinutes: number }>> {
    const platforms: PlatformType[] = ['linkedin', 'x', 'instagram', 'blog', 'newsletter', 'show_notes'];

    if (!this.isConfigured()) {
      throw new Error('AI generation is not configured. GEMINI_API_KEY is missing.');
    }

    const prompt = `You are a premier media strategist and ghostwriter.
Generate tailored, ready-to-publish content for all 6 media platforms from this episode.

EPISODE TITLE: "${episode.title}"
EPISODE SUMMARY: ${episode.summary}
${moment ? `SOURCE MOMENT: "${moment.quote}" (${moment.title} at ${moment.timestamp})` : ''}
KEY TAKEAWAYS: ${episode.keyTakeaways?.join('; ') || 'Focus on leverage.'}
USER TONE PREFERENCE: ${userPreferences?.tone || 'conversational'}

Return a single JSON object with all 6 platform drafts:
{
  "linkedin": { "title": "Engaging LinkedIn headline", "content": "Full LinkedIn post with hook, spaced paragraphs, lessons, and closing question" },
  "x": { "title": "X Thread Title", "content": "Multi-tweet thread with 1/4, 2/4 numbering or punchy tweet" },
  "instagram": { "title": "Instagram Carousel", "content": "Carousel slide breakdown (Slide 1-5) and caption" },
  "blog": { "title": "Blog Headline", "content": "Structured article with markdown headers H1, H2, and takeaways" },
  "newsletter": { "title": "Newsletter Subject Line", "content": "Personal editorial letter with greeting, lessons, and reply CTA" },
  "show_notes": { "title": "Show Notes Title", "content": "Official show notes with overview, takeaways, and chapter breakdown" }
}

Return ONLY valid JSON.`;

    try {
      const response = await callWithTransientRetry(async (ai) => {
        return ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      });

      const parsed = JSON.parse(response.text || '{}');
      const result: any = {};

      for (const p of platforms) {
        if (parsed[p]?.content && parsed[p].content.trim().length > 30) {
          const content = parsed[p].content.trim();
          const words = content.split(/\s+/).filter(Boolean).length;
          result[p] = {
            title: parsed[p].title || `${episode.title} - ${p.toUpperCase()}`,
            content,
            wordCount: words,
            readingTimeMinutes: Math.max(1, Math.ceil(words / 180)),
          };
        } else {
          throw new Error(`AI generation incomplete: missing or empty output for ${p}.`);
        }
      }
      return result;
    } catch (err: any) {
      const userMessage = formatAIErrorMessage(err);
      console.error('[AI] Multi-platform generation error:', userMessage);
      throw new Error(userMessage);
    }
  },

  /**
   * Generates a single platform-tailored content asset with retry and fallback
   */
  async generatePlatformAsset(
    episode: DBEpisode,
    platform: PlatformType,
    moment?: DBMoment,
    toneModifier: 'standard' | 'concise' | 'punchy' = 'standard',
    userPreferences?: { tone?: string; contentLength?: string }
  ): Promise<{ title: string; content: string; wordCount: number; readingTimeMinutes: number }> {
    if (!this.isConfigured()) {
      throw new Error('AI generation is not configured. GEMINI_API_KEY is missing.');
    }

    const platformGuides = {
      linkedin: `Write an authoritative, high-engagement LinkedIn thought-leadership post with a 1-line hook, numbered insights, and engagement question.`,
      x: `Write a compelling X thread (3-4 tweets connected as 1/, 2/) or a high-contrast single tweet.`,
      instagram: `Write an Instagram carousel outline (Slide 1-5) and accompanying caption.`,
      blog: `Write a structured, comprehensive article with H1, H2, tactical framework, and concluding takeaway.`,
      newsletter: `Write a personal, editorial email newsletter section with greeting, thesis, and reply CTA.`,
      show_notes: `Write the official show notes with overview, key takeaways, and timestamped chapters.`,
    };

    const prompt = `You are a premier content creator repurposing content for top creators.
EPISODE TITLE: "${episode.title}"
EPISODE SUMMARY: ${episode.summary}
${moment ? `SOURCE MOMENT: "${moment.quote}" (${moment.title} at ${moment.timestamp})` : ''}
KEY TAKEAWAYS: ${episode.keyTakeaways?.join('; ') || 'Focus on leverage'}
PLATFORM: ${platform.toUpperCase()}
TONE MODIFIER: ${toneModifier}
USER PREFERENCES: Tone=${userPreferences?.tone || 'conversational'}, Length=${userPreferences?.contentLength || 'medium'}

SPECIFICATIONS:
${platformGuides[platform]}

Return JSON:
{
  "title": "A compelling headline or title for this asset",
  "content": "The complete, ready-to-post drafted content formatted specifically for ${platform}"
}
Return ONLY valid JSON.`;

    try {
      const response = await callWithTransientRetry(async (ai) => {
        return ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      });

      const parsed = JSON.parse(response.text || '{}');
      const content = parsed.content?.trim() || '';
      if (!content || content.length < 20) {
        throw new Error(`AI generated empty or insufficient content for ${platform}.`);
      }
      const words = content.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(words / 180));

      return {
        title: parsed.title || `${episode.title} - ${platform.toUpperCase()}`,
        content,
        wordCount: words,
        readingTimeMinutes: readingTime,
      };
    } catch (err: any) {
      const userMessage = formatAIErrorMessage(err);
      console.error(`[AI] Single asset generation for ${platform} error:`, userMessage);
      throw new Error(userMessage);
    }
  },

  /**
   * Conversational contextual assistant for the Chat feature with rate limit protection
   */
  async streamChatResponse(
    messages: Array<{ sender: 'user' | 'assistant'; text: string }>,
    userMessage: string,
    episodeContext?: {
      title: string;
      summary: string;
      keyTakeaways: string[];
      moments?: DBMoment[];
    }
  ): Promise<{ text: string; structuredData?: any }> {
    if (!this.isConfigured()) {
      throw new Error('AI generation is not configured. GEMINI_API_KEY is missing.');
    }

    const contextSection = episodeContext
      ? `ACTIVE EPISODE CONTEXT:
Title: "${episodeContext.title}"
Summary: ${episodeContext.summary}
Key Takeaways: ${episodeContext.keyTakeaways?.join('; ') || ''}
${episodeContext.moments ? `Top Moments: ${episodeContext.moments.slice(0, 5).map((m) => `[${m.timestamp}] "${m.quote}"`).join(' | ')}` : ''}`
      : 'No specific episode selected. You are assisting with general media repurposing strategy, social copywriting, and editorial planning.';

    const conversationHistory = messages
      .slice(-6)
      .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join('\n');

    const prompt = `You are RepurposeAI's contextual editorial assistant. You help creators extract maximum value from their content.
${contextSection}

CONVERSATION HISTORY:
${conversationHistory}

USER'S NEW INQUIRY:
${userMessage}

Respond helpfully, tactically, and with editorial nuance.
If the user asks for quotes, hooks, or structured ideas, return a JSON object with:
{
  "text": "Your natural assistant response explaining the insights",
  "structuredData": {
    "title": "Optional title for extracted items (e.g. 'Top 3 Quotable Hooks')",
    "items": [
      {
        "number": "01",
        "title": "Core quote or hook text",
        "sourceTimestamp": "02:15",
        "platforms": ["linkedin", "x"]
      }
    ]
  }
}
If no structured data is needed, structuredData can be null.
Return valid JSON only.`;

    try {
      const response = await callWithTransientRetry(async (ai) => {
        return ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        text: parsed.text || response.text || 'I have analyzed your request based on your recording context.',
        structuredData: parsed.structuredData || null,
      };
    } catch (err: any) {
      const userMessage = formatAIErrorMessage(err);
      console.error('[AI] Chat error:', userMessage);
      throw new Error(userMessage);
    }
  },
};
