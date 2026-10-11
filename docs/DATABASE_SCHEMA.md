# Database Schema Specification

*(Targeted for MongoDB / Document Stores)*

### 1. User
```typescript
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  role: string;
  createdAt: Date;
}
```

### 2. Episode
```typescript
interface Episode {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  sourceType: 'video' | 'audio' | 'youtube';
  sourceUrl?: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  status: 'Draft' | 'Processing' | 'Ready for Review' | 'Completed';
  summary: string;
  mainTopics: string[];
  speakers: string[];
  tone: string;
  keyTakeaways: string[];
  chapters: Array<{ timestamp: string; title: string; description: string }>;
  createdAt: Date;
}
```

### 3. TranscriptSegment
```typescript
interface TranscriptSegment {
  _id: ObjectId;
  episodeId: ObjectId;
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  text: string;
  momentId?: ObjectId;
}
```

### 4. Moment
```typescript
interface Moment {
  _id: ObjectId;
  episodeId: ObjectId;
  index: number;
  timestamp: string;
  timestampSeconds: number;
  title: string;
  quote: string;
  type: 'Hook' | 'Quote' | 'Insight' | 'Takeaway' | 'Story' | 'Controversial';
  score: number;
  whyItMatters: string;
  potentialPlatforms: string[];
}
```

### 5. ContentAsset
```typescript
interface ContentAsset {
  _id: ObjectId;
  episodeId: ObjectId;
  momentId?: ObjectId;
  platform: 'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes';
  title: string;
  content: string;
  status: 'draft' | 'needs_review' | 'approved' | 'rejected';
  wordCount: number;
  readingTimeMinutes: number;
  sourceContext?: {
    timestamp: string;
    quote: string;
    momentType: string;
    tone: string;
    audience: string;
  };
  updatedAt: Date;
}
```

### 6. ChatConversation *(Represents Session History / "Memory")*
```typescript
interface ChatConversation {
  _id: ObjectId;
  userId: ObjectId;
  episodeId: ObjectId;
  title: string;
  category: 'today' | 'yesterday' | 'previous_7_days';
  createdAt: Date;
  updatedAt: Date;
}
```

### 7. ChatMessage
```typescript
interface ChatMessage {
  _id: ObjectId;
  conversationId: ObjectId;
  sender: 'user' | 'assistant';
  text: string;
  structuredData?: Record<string, any>;
  createdAt: Date;
}
```

### 8. UserPreferences
```typescript
interface UserPreferences {
  userId: ObjectId;
  tone: 'professional' | 'conversational' | 'educational' | 'storytelling';
  contentLength: 'short' | 'medium' | 'long';
  creativity: number;
  notifications: {
    processingComplete: boolean;
    contentGenerationComplete: boolean;
    exportComplete: boolean;
  };
}
```

*Note: In accordance with Section 68 of the master specification, there is NO separate Memory collection. History is cleanly modeled via `ChatConversation` and `ChatMessage`.*
