# RepurposeAI Features Specification

### 1. Ingestion & Pre-flight
- Video / Audio file drag & drop (MP4, MOV, MP3, WAV, M4A up to 2GB).
- YouTube video URL parsing with automated caption/transcript fallback.
- Instant "Load Showcase" trigger for one-click reviewer evaluation.

### 2. Analytical Intelligence
- Speaker Diarization: Speaker identification with micro-timestamps.
- Semantic Moment Detection: 12 moments classified by type (Hook, Quote, Insight, Takeaway, Story, Controversial) with impact scores (0–100).
- Cross-platform viability tagging (LinkedIn, X, Instagram, Blog, Newsletter).

### 3. Platform-Aware Generation
- **LinkedIn:** Executive hook, structured whitespace, peer takeaway, discussion CTA.
- **X (Twitter):** Numbered threads (1/n) with punchy tempo and hook-first pacing.
- **Instagram:** Multi-slide carousel copy, quote cards, and formatted hashtags.
- **Blog:** Editorial long-form markdown article with quotes, headers, and conclusion.
- **Newsletter:** Intimate conversational letter with email subject line and preview text.
- **Show Notes:** Official podcast show-notes with timestamps, executive summary, and resource links.

### 4. Split Content Editor
- Left panel: Verbatim source quote, timestamp, detected tone, target audience.
- Right panel: Full live editor with autosave, word count, and reading time estimation.
- Rapid tone adaptation: `Standard`, `Make Concise`, `Make Punchy`.

### 5. Review & Export Gate
- Quality gate tracking approved, pending, and rejected assets.
- Batch approval and batch rejection controls.
- Client-side export to Markdown (`.md`), Plain Text (`.txt`), and JSON (`.json`).
