# AI Pipeline Architecture

The RepurposeAI pipeline is composed of four decoupled stages:

```
[Audio/Video Stream]
        │
        ▼ (Stage 1: Ingestion & Acoustic Alignment)
[Whisper Diarized Transcript]
        │
        ▼ (Stage 2: Contextual Thesis Extraction)
[Semantic Summary & Key Takeaways]
        │
        ▼ (Stage 3: Moment Scoring & Categorization)
[12 Curated Moments with Platform Affinity]
        │
        ▼ (Stage 4: Multi-Dialect Synthesis)
┌───────────────┬───────────────┬────────────────┬──────────────┐
▼               ▼               ▼                ▼              ▼
LinkedIn        X Thread        Instagram        Blog Post      Newsletter
(Thought Lead)  (Paced Thread)  (Carousel/Quote) (Long Essay)   (Letter)
```

## Stage 1: Acoustic Ingestion & Alignment
- High-resolution transcription preserving natural speaker turns and word-level timestamps.
- Diarization assigns quotes to individual speakers (Host vs Guest).

## Stage 2: Contextual Thesis Extraction
- Before extracting soundbites, the model extracts the holistic narrative arc to avoid misquoting or producing out-of-context snippets.

## Stage 3: Moment Scoring & Filtering
- Scans for 6 moment archetypes: Hooks, Quotes, Insights, Takeaways, Stories, and Controversies.
- Computes an editorial impact score (0–100) based on novelty, controversy, and actionable clarity.

## Stage 4: Platform Adaptation
- Generates platform drafts using explicit system prompts for each channel's expected psychological tempo and formatting norms.
