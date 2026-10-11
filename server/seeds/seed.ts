import { db } from '../db/store';
import { DBEpisode, DBMoment, DBContentAsset, DBTranscriptSegment } from '../db/types';
import { hashPassword } from '../auth/authMiddleware';

export async function seedDefaultUsers(): Promise<void> {
  const defaultUsers = [
    {
      id: 'usr-anant-goyal',
      name: 'Anant Goyal',
      email: 'goyalanant4991@gmail.com',
      role: 'Creator & Founder',
    },
    {
      id: 'usr-demo-creator',
      name: 'Demo Creator',
      email: 'demo@repurpose.ai',
      role: 'Creator & Founder',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await db.users.findOne({ email: u.email });
    if (!existing) {
      const newUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: hashPassword('password123'),
        role: u.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.users.create(newUser);

      await db.preferences.create({
        id: `pref-${newUser.id}`,
        userId: newUser.id,
        tone: 'conversational',
        contentLength: 'medium',
        creativity: 65,
        notifications: {
          processingComplete: true,
          contentGenerationComplete: true,
          exportComplete: true,
        },
        updatedAt: new Date().toISOString(),
      });

      await seedUserEpisode(newUser.id);
      console.log(`[SEED] Initialized default user account: ${u.email}`);
    }
  }
}

export async function seedUserEpisode(userId: string): Promise<{ episodeId: string }> {
  // Check if user already has an episode with this seed title
  const existing = await db.episodes.findOne({ userId, title: 'The Future of AI Agents' });
  if (existing) {
    return { episodeId: existing.id };
  }

  const epId = `ep-seed-${Date.now()}`;
  const seedEpisode: DBEpisode = {
    id: epId,
    userId,
    title: 'The Future of AI Agents',
    sourceType: 'video',
    sourceFilename: 'The Future of AI Agents.mp4',
    duration: '48:32',
    durationSeconds: 2912,
    fileSize: '142 MB',
    dateProcessed: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Ready for Review',
    summary:
      'An in-depth exploration of how autonomous agent architectures are transitioning from research prototypes to real-world creator workflows. Elena Vance and Anant Goyal discuss why the bottleneck in creative output is no longer raw synthesis, but editorial judgment, context retention, and multi-surface distribution.',
    mainTopics: ['AI Agents', 'Automation', 'Future of Work', 'Content Creation', 'Startups'],
    speakers: ['Anant Goyal (Host)', 'Dr. Elena Vance (AI Research Lead)'],
    tone: 'Conversational, analytical, pragmatic, forward-looking',
    keyTakeaways: [
      'The bottleneck in creative output has shifted from content creation to content multiplication and editorial curation.',
      'True agent utility requires persistent context and platform awareness rather than generic one-shot summarization.',
      'Creators who operate as editor-in-chief of their AI systems will outpace those who simply prompt and paste.',
      'Multi-modal repurposing preserves voice fidelity across distinct channel idioms.',
    ],
    chapters: [
      { timestamp: '00:00', title: 'Introduction & State of Agents in 2026', description: 'The shift from chat interfaces to background execution engines.' },
      { timestamp: '02:41', title: 'The Content Multiplication Fallacy', description: 'Why more raw output fails without systemic repurposing.' },
      { timestamp: '11:20', title: 'Autonomous Context & Semantic Memory', description: 'How systems retain host perspective without hallucinating.' },
      { timestamp: '22:11', title: 'Platform-Aware Adaptation vs Plain Copying', description: 'The distinct psychological expectations of LinkedIn, X, and Newsletters.' },
      { timestamp: '36:12', title: 'Human-in-the-Loop as a Competitive Moat', description: 'Why the approval step defines editorial excellence.' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.episodes.create(seedEpisode);

  // Seed Moments
  const seedMoments: DBMoment[] = [
    {
      id: `m-${epId}-01`,
      episodeId: epId,
      userId,
      index: 1,
      timestamp: '02:41',
      timestampSeconds: 161,
      title: 'The Production Trap',
      quote: 'The biggest mistake creators make is producing more content instead of extracting more value from what they already have.',
      type: 'Insight',
      score: 94,
      whyItMatters: 'Directly challenges creator hustle culture with high-leverage mathematical reality.',
      potentialPlatforms: ['linkedin', 'x', 'instagram'],
      createdAt: new Date().toISOString(),
    },
    {
      id: `m-${epId}-02`,
      episodeId: epId,
      userId,
      index: 2,
      timestamp: '06:15',
      timestampSeconds: 375,
      title: 'Chatbot vs Operating Agent',
      quote: 'A chatbot waits for you to tell it what to do every step. An agent understands the mission and delivers finished candidates ready for approval.',
      type: 'Hook',
      score: 91,
      whyItMatters: 'Clarifies the critical architectural difference between reactive chat and proactive tooling.',
      potentialPlatforms: ['x', 'linkedin'],
      createdAt: new Date().toISOString(),
    },
    {
      id: `m-${epId}-03`,
      episodeId: epId,
      userId,
      index: 3,
      timestamp: '22:11',
      timestampSeconds: 1331,
      title: 'Platform Dialects',
      quote: 'Copy-pasting the same text to LinkedIn and X is like speaking French in Tokyo. Each platform has its own vocabulary and attention span.',
      type: 'Controversial',
      score: 95,
      whyItMatters: 'Visual, high-retention mental model on content adaptation.',
      potentialPlatforms: ['linkedin', 'x'],
      createdAt: new Date().toISOString(),
    },
  ];

  for (const m of seedMoments) {
    await db.moments.create(m);
  }

  // Seed Transcripts
  const seedSegments: DBTranscriptSegment[] = [
    {
      id: `ts-${epId}-01`,
      episodeId: epId,
      userId,
      timestamp: '00:00',
      timestampSeconds: 0,
      speaker: 'Anant Goyal',
      text: 'Welcome to the podcast. Today we are joined by Dr. Elena Vance to discuss the real architecture behind autonomous AI agents.',
      createdAt: new Date().toISOString(),
    },
    {
      id: `ts-${epId}-02`,
      episodeId: epId,
      userId,
      timestamp: '02:41',
      timestampSeconds: 161,
      speaker: 'Dr. Elena Vance',
      text: 'The biggest mistake creators make is producing more content instead of extracting more value from what they already have.',
      momentId: `m-${epId}-01`,
      createdAt: new Date().toISOString(),
    },
    {
      id: `ts-${epId}-03`,
      episodeId: epId,
      userId,
      timestamp: '06:15',
      timestampSeconds: 375,
      speaker: 'Dr. Elena Vance',
      text: 'A chatbot waits for you to tell it what to do every step. An agent understands the mission and delivers finished candidates ready for approval.',
      momentId: `m-${epId}-02`,
      createdAt: new Date().toISOString(),
    },
    {
      id: `ts-${epId}-04`,
      episodeId: epId,
      userId,
      timestamp: '22:11',
      timestampSeconds: 1331,
      speaker: 'Anant Goyal',
      text: 'Copy-pasting the same text to LinkedIn and X is like speaking French in Tokyo. Each platform has its own vocabulary and attention span.',
      momentId: `m-${epId}-03`,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const s of seedSegments) {
    await db.transcripts.create(s);
  }

  // Seed Content Assets
  const seedAssets: DBContentAsset[] = [
    {
      id: `ast-${epId}-li-01`,
      episodeId: epId,
      userId,
      momentId: `m-${epId}-01`,
      platform: 'linkedin',
      title: 'The Content Multiplication Fallacy',
      content: `The biggest mistake creators make isn't publishing too rarely.\n\nIt's producing more content instead of extracting more value from what they already have.\n\nHere is the trap most founders fall into:\n1. Spend 5 hours preparing and recording a 45-minute episode.\n2. Hit publish.\n3. Share one generic link.\n4. Watch the post disappear.\n\nHigh-leverage media teams treat every conversation as an unmined quarry:\n→ 1 episode yields 12 distinct moments.\n→ 5 platform-native LinkedIn breakdowns.\n→ 3 punchy X threads.\n→ 1 comprehensive newsletter.\n\nStop creating 5x more. Start multiplying what you already built.`,
      status: 'approved',
      lastEdited: 'Just now',
      wordCount: 125,
      readingTimeMinutes: 1,
      sourceContext: {
        timestamp: '02:41',
        quote: 'The biggest mistake creators make is producing more content instead of extracting more value from what they already have.',
        momentType: 'Insight',
        tone: 'Thought-leadership, analytical',
        audience: 'Founders, Creators, Directors',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `ast-${epId}-x-01`,
      episodeId: epId,
      userId,
      momentId: `m-${epId}-02`,
      platform: 'x',
      title: 'Chatbot vs Operating Agent (Thread)',
      content: `1/4 A chatbot waits for you to tell it what to do every step.\n\nAn agent understands the mission and delivers finished candidates ready for approval.\n\n2/4 Stop prompting from scratch each morning. Build systems that ingest raw recordings and output channel-adapted drafts.\n\n3/4 Human-in-the-loop is the moat. AI drafts, human curates.\n\n4/4 Full episode breakdown linked below.`,
      status: 'approved',
      lastEdited: 'Just now',
      wordCount: 65,
      readingTimeMinutes: 1,
      sourceContext: {
        timestamp: '06:15',
        quote: 'A chatbot waits for you to tell it what to do every step.',
        momentType: 'Hook',
        tone: 'Punchy',
        audience: 'Builders',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `ast-${epId}-sn-01`,
      episodeId: epId,
      userId,
      platform: 'show_notes',
      title: 'Official Show Notes: The Future of AI Agents',
      content: `Episode: The Future of AI Agents\nDuration: 48:32 · Host: Anant Goyal · Guest: Dr. Elena Vance\n\nSummary:\nHow autonomous agent architectures are transitioning from research prototypes to creator workflows.\n\nChapters:\n00:00 - Introduction & State of Agents in 2026\n02:41 - The Content Multiplication Fallacy\n11:20 - Autonomous Context & Semantic Memory\n22:11 - Platform-Aware Adaptation vs Plain Copying\n36:12 - Human-in-the-Loop as a Competitive Moat`,
      status: 'approved',
      lastEdited: 'Just now',
      wordCount: 88,
      readingTimeMinutes: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const a of seedAssets) {
    await db.assets.create(a);
  }

  return { episodeId: epId };
}
