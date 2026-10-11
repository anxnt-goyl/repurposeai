export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBEpisode {
  id: string;
  userId: string;
  title: string;
  sourceType: 'video' | 'audio' | 'youtube';
  sourceFilename?: string;
  sourceUrl?: string;
  duration: string;
  durationSeconds: number;
  fileSize: string;
  status: 'Draft' | 'Processing' | 'Ready for Review' | 'Completed';
  summary: string;
  mainTopics: string[];
  speakers: string[];
  tone: string;
  keyTakeaways: string[];
  chapters: Array<{ timestamp: string; title: string; description: string }>;
  dateProcessed: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBTranscriptSegment {
  id: string;
  episodeId: string;
  userId: string;
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  text: string;
  momentId?: string;
  momentType?: string;
  createdAt: string;
}

export interface DBMoment {
  id: string;
  episodeId: string;
  userId: string;
  index: number;
  timestamp: string;
  timestampSeconds: number;
  title: string;
  quote: string;
  type: 'Hook' | 'Quote' | 'Insight' | 'Takeaway' | 'Story' | 'Controversial';
  score: number;
  whyItMatters: string;
  potentialPlatforms: Array<'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes'>;
  createdAt: string;
}

export interface DBContentAsset {
  id: string;
  episodeId: string;
  userId: string;
  momentId?: string;
  platform: 'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes';
  title: string;
  content: string;
  status: 'draft' | 'needs_review' | 'approved' | 'rejected';
  lastEdited: string;
  wordCount: number;
  readingTimeMinutes: number;
  sourceContext?: {
    timestamp: string;
    quote: string;
    momentType: string;
    tone: string;
    audience: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DBChatConversation {
  id: string;
  userId: string;
  episodeId?: string;
  title: string;
  category: 'today' | 'yesterday' | 'previous_7_days';
  createdAt: string;
  updatedAt: string;
}

export interface DBChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  structuredData?: {
    title?: string;
    items?: Array<{
      number?: string;
      title?: string;
      sourceTimestamp?: string;
      platforms?: string[];
      bullets?: string[];
    }>;
  };
  createdAt: string;
}

export interface DBUserPreferences {
  id: string;
  userId: string;
  tone: string;
  contentLength: string;
  creativity: number;
  notifications: {
    processingComplete: boolean;
    contentGenerationComplete: boolean;
    exportComplete: boolean;
  };
  updatedAt: string;
}
