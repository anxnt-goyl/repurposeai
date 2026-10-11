export type ThemeMode = 'obsidian' | 'paper';

export type PlatformType =
  | 'linkedin'
  | 'x'
  | 'instagram'
  | 'blog'
  | 'newsletter'
  | 'show_notes';

export type AssetStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';

export type MomentType =
  | 'Hook'
  | 'Quote'
  | 'Insight'
  | 'Takeaway'
  | 'Story'
  | 'Controversial';

export interface Moment {
  id: string;
  index: number;
  timestamp: string; // e.g. "02:41"
  timestampSeconds: number;
  title: string;
  quote: string;
  type: MomentType;
  score: number; // e.g. 94
  whyItMatters: string;
  potentialPlatforms: PlatformType[];
}

export interface ContentAsset {
  id: string;
  momentId?: string;
  episodeId: string;
  platform: PlatformType;
  title: string;
  content: string;
  status: AssetStatus;
  lastEdited: string;
  wordCount: number;
  readingTimeMinutes: number;
  sourceContext?: {
    timestamp: string;
    quote: string;
    momentType: MomentType;
    tone: string;
    audience: string;
  };
  metadata?: {
    subject?: string;
    previewText?: string;
    hashtags?: string[];
    chapters?: Array<{ timestamp: string; title: string }>;
  };
}

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  text: string;
  momentId?: string;
  momentType?: MomentType;
}

export interface Chapter {
  timestamp: string;
  title: string;
  description: string;
}

export interface Episode {
  id: string;
  title: string;
  sourceType: 'video' | 'audio' | 'youtube';
  sourceFilename?: string;
  sourceUrl?: string;
  duration: string; // e.g. "48:32"
  durationSeconds: number;
  dateProcessed: string;
  status: 'Ready for Review' | 'Processing' | 'Completed' | 'Draft';
  fileSize?: string;
  summary: string;
  mainTopics: string[];
  speakers: string[];
  tone: string;
  keyTakeaways: string[];
  chapters: Chapter[];
  moments: Moment[];
  assets: ContentAsset[];
  transcript: TranscriptSegment[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  structuredData?: {
    title?: string;
    items?: Array<{
      number: string;
      title: string;
      description?: string;
      sourceTimestamp?: string;
      platforms?: PlatformType[];
    }>;
    suggestedAction?: {
      label: string;
      platform?: PlatformType;
      content?: string;
    };
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  episodeId?: string;
  createdAt: string;
  updatedAt: string;
  category: 'today' | 'yesterday' | 'previous_7_days';
  messages: ChatMessage[];
}

export interface UserPreferences {
  tone: 'professional' | 'conversational' | 'educational' | 'storytelling';
  contentLength: 'short' | 'medium' | 'long';
  creativity: number; // 0 to 100
  notifications: {
    processingComplete: boolean;
    contentGenerationComplete: boolean;
    exportComplete: boolean;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}
