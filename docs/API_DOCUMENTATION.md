# Backend API Specification (REST Contract)

### Episodes & Ingestion
- `POST /api/episodes` — Upload media file or submit YouTube URL.
- `GET /api/episodes` — Retrieve all user episodes with metadata.
- `GET /api/episodes/:id` — Retrieve episode details, chapters, and summary.

### Analysis & Repurposing Pipeline
- `POST /api/transcription` — Trigger speech-to-text with timestamps and diarization.
- `POST /api/analyze` — Synthesize executive summary, topics, and key takeaways.
- `POST /api/moments` — Extract and rank top 12 high-conviction moments.
- `POST /api/repurpose` — Generate platform-adapted drafts for specified platforms.

### Content Assets & Editorial Gate
- `GET /api/content/:episodeId` — Retrieve all platform drafts for an episode.
- `PATCH /api/content/:id` — Update draft text, tone, or approval status (`draft`, `needs_review`, `approved`, `rejected`).
- `DELETE /api/content/:id` — Remove an asset draft.

### Contextual Assistant & History
- `POST /api/chat` — Submit query with active episode context ID.
- `GET /api/chat/history` — Retrieve chat history categorized by timeframe (`today`, `yesterday`, `previous_7_days`).
- `POST /api/chat/conversations` — Initialize a new conversation thread.
- `PATCH /api/chat/conversations/:id` — Rename conversation title.
- `DELETE /api/chat/conversations/:id` — Delete conversation thread.

### Preferences & Profile
- `GET /api/profile` / `PATCH /api/profile` — User profile details.
- `GET /api/preferences` / `PATCH /api/preferences` — AI tone, length, and notification directives.
