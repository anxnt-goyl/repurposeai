# RepurposeAI — Production Deployment Guide

This guide covers deployment procedures for deploying RepurposeAI to production environments (Render, AWS, Railway, Vercel, or custom Docker/Node.js hosting).

---

## Architecture Overview

```
Client (Vite React SPA / Vercel)
         ↓ HTTPS / Bearer Token
Backend (Node.js Express / Render / Cloud Run)
         ↓
    ┌────┴──────────────────────────┐
    ▼                               ▼
Database (MongoDB Atlas)      AI Services
  - Users                      - Google Gemini (Content Engine)
  - Episodes                   - OpenAI Whisper (Audio Diarization)
  - Transcripts                - YouTube Captions API
  - Moments
  - Content Assets
  - Chat & History
```

---

## 1. Database Setup (MongoDB Atlas)

1. Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (or your host's egress IPs) to the IP Access List.
3. Under **Database Access**, create a user with `readWriteAnyDatabase` permissions.
4. Retrieve your connection string URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/repurposeai?retryWrites=true&w=majority
   ```
5. Set `MONGODB_URI` in your production environment variables.
6. The application automatically establishes indexes for:
   - `users.email` (unique)
   - `episodes.userId`, `episodes.createdAt`
   - `transcripts.episodeId`, `transcripts.timestampSeconds`
   - `moments.episodeId`, `moments.score`
   - `assets.episodeId`, `assets.userId`
   - `chats.userId`, `messages.conversationId`

---

## 2. AI Content Engine Setup (Google Gemini)

1. Obtain an API key from [Google AI Studio](https://aistudio.google.com).
2. Set `GEMINI_API_KEY` in your environment variables.
3. RepurposeAI utilizes `gemini-3.8-flash` for:
   - Structured transcript analysis and executive summaries
   - High-resonance moment extraction (Hooks, Quotes, Insights, Takeaways)
   - Multi-platform asset generation (LinkedIn, X, Instagram, Blog, Newsletter, Show Notes)
   - Contextual chat assistant

---

## 3. Media Transcription Setup (OpenAI Whisper)

1. Obtain an API key from [OpenAI Platform](https://platform.openai.com).
2. Set `OPENAI_API_KEY` in your environment variables.
3. RepurposeAI automatically directs uploaded audio and video recordings (MP4, MP3, WAV, M4A, MOV) through the Whisper engine for accurate, timestamped phonetic transcription.
4. If `OPENAI_API_KEY` is not provided, the platform uses Gemini audio transcription or user-provided transcripts.

---

## 4. YouTube Ingestion Setup

1. YouTube URL processing extracts real closed captions directly from YouTube video streams.
2. Ensure videos selected for transcription have public closed captions or transcripts available.
3. If private captions or restricted videos are ingested, the system returns a clear error prompt advising the user to upload the media file directly.

---

## 5. Environment Variables Reference

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Listening HTTP port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB Atlas Connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/repurposeai` |
| `JWT_SECRET` | Secret key for JWT session signing | High-entropy string (32+ chars) |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `OPENAI_API_KEY` | OpenAI Whisper API key | `sk-...` |
| `CLIENT_URL` | Allowed CORS origin | `https://your-app.vercel.app` (or `*`) |
| `VITE_API_BASE_URL`| Frontend API client URL | Empty string for single-host deployments |

---

## 6. Backend Deployment (Render / AWS / Railway)

### Using Single-Container Full-Stack Mode (Recommended)
The repository is structured to run as a unified full-stack application where Express serves both API routes and built client assets.

1. **Build Command**:
   ```bash
   npm install && npm run build
   ```
2. **Start Command**:
   ```bash
   npm start
   ```
3. **Health Check Path**:
   ```
   /api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "database": "mongodb_atlas",
     "environment": "production",
     "aiConfigured": true
   }
   ```

---

## 7. Frontend Deployment (Vercel Separation Option)

If hosting the Vite client on Vercel separately from the backend:
1. Import repository into Vercel.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com`
5. On the backend, set:
   - `CLIENT_URL=https://your-frontend.vercel.app`

---

## 8. Verification & Production Checklist

- [x] Run `curl https://<backend>/api/health` to confirm server status and database connectivity.
- [x] Verify account registration at `/signup` with real password hashing and session tokens.
- [x] Verify empty state is displayed for new users ("No episodes yet").
- [x] Ingest a real recording or YouTube URL at `/new-repurpose`.
- [x] Inspect generated platform assets (LinkedIn, X, Instagram, Blog, Newsletter, Show Notes).
- [x] Verify editorial actions: edit asset content, approve, reject, regenerate tone.
- [x] Verify multi-format export (Markdown, Plain Text, JSON).
- [x] Verify chat assistant with conversation persistence across refresh and relogin.
