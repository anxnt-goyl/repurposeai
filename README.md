# RepurposeAI

> **Create once. Repurpose everywhere.**  
> AI-powered Show-Notes & Multi-Platform Repurposing Agent.

---

## 1. Product Overview

RepurposeAI is an editorial-grade, human-in-the-loop web application designed for creators, podcast hosts, and founders. It takes one long-form video, audio, or YouTube recording and turns it into structured show-notes, platform-adapted social posts (LinkedIn, X, Instagram), long-form articles, and newsletters—reducing post-recording repurposing time from 4–6 hours to under 30 minutes while preserving human editorial judgment and voice fidelity.

---

## 2. Problem Statement

Post-recording content distribution suffers from extreme administrative friction:
- Creators spend 4–6 hours manually scrubbing audio, hunting for soundbites, and copying timestamps.
- Raw transcripts are dense, unindexed text walls that don't convert into platform-native formats.
- Naive AI summarizers output generic bullet points with flat, synthetic copy.
- Cross-posting identical text ignores the unique psychological reading tempo of different platforms (e.g., LinkedIn thought-leadership vs X brevity vs email intimacy).

---

## 3. The RepurposeAI Solution

RepurposeAI introduces a **Context-First, Platform-Aware** pipeline:
1. **Context-First Analysis:** Diarizes speakers and understands the full thesis before scoring moments.
2. **Platform Dialect Translation:** Transforms the same core insight into native idioms for LinkedIn, X, Instagram, Blog, and Newsletter.
3. **One-to-Many Leverage:** 1 recorded episode produces 12 curated moments and 18 platform-specific drafts.
4. **Human Sovereignty:** AI creates the first draft; the creator acts as Editor-in-Chief with single-click tone adjustments and review approval.

---

## 4. Key Features

- **Command Center Dashboard:** Quick metrics (episodes, assets, hours saved, approval rate), active pipeline tracking, and recent project archives.
- **Ingestion Suite:** Drag-and-drop support for MP4, MOV, MP3, WAV, M4A, plus YouTube URL support and instant showcase loader.
- **Autonomous Processing Pipeline:** Visual step-by-step progress tracking (Upload → Transcribe → Understand → Moments → Generate → Adapt → Finalize).
- **Interactive Transcript & Moments Map:** Timestamped diarization with high-value moment markers (`02:41 HIGH VALUE`) clickable directly into the editor.
- **Split Content Editor:** Split view pairing source audio context (verbatim quote, timestamp, detected tone, target audience) with live editable drafts and rapid tone transformation (`Standard`, `Make Concise`, `Make Punchy`).
- **Editorial Review Gate:** Batch review dashboard tracking approved, needs-review, and rejected assets with live progress percentages.
- **Client-Side Asset Export:** Instant generation of Markdown (`.md`), Plain Text (`.txt`), or Structured JSON (`.json`) files.
- **Contextual Assistant Chat & History:** Main navigation chat with integrated history (`Today`, `Yesterday`, `Previous 7 days`) grounded in the active episode context.
- **Dual Premium Theme System:**
  - **Obsidian:** Dark workspace with charcoal surfaces and warm amber accents.
  - **Paper:** Warm off-white editorial workspace with high-contrast typography.
- **Quick Command Palette (`⌘K` / `Ctrl+K`):** Global jump navigation, instant search, and theme switching.

---

## 5. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Lucide React, Motion, Canvas-Confetti.
- **Design System:** Custom CSS design tokens with strict 60-30-10 color allocation, Plus Jakarta Sans, Instrument Serif, and JetBrains Mono.
- **Mock AI Service (`mockAIService.ts`):** Deterministic offline intelligence layer simulating Whisper audio transcription, LLM entity extraction, moment scoring, and platform adaptation without external API keys.
- **State Management:** React Context architecture (`ThemeContext`, `AuthContext`, `ProjectContext`, `ToastContext`) with localStorage persistence.

---

## 6. Project Structure

```
├── docs/                     # Comprehensive architectural documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── FEATURES.md
│   ├── UI_UX_SYSTEM.md
│   ├── USER_FLOW.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── AI_PIPELINE.md
│   ├── MOCK_AI_ARCHITECTURE.md
│   ├── DEMO_GUIDE.md
│   ├── FUTURE_ROADMAP.md
│   └── TECH_STACK.md
├── src/
│   ├── components/
│   │   ├── common/           # Sidebar, Navbar, CommandPalette, Toast, ExportModal
│   │   └── workspace/        # Overview, Transcript, Moments, Content, Editor, Review
│   ├── contexts/             # Theme, Auth, Project, Toast state providers
│   ├── data/                 # Master showcase episode data & pre-populated chats
│   ├── pages/                # Landing, Auth, Dashboard, Projects, Workspace, Chat, Settings
│   ├── services/             # mockAIService.ts service layer
│   ├── types/                # TypeScript data interfaces
│   ├── App.tsx               # Root application router and layout shell
│   ├── index.css             # Theme tokens for Obsidian and Paper
│   └── main.tsx
├── package.json
└── README.md
```

---

## 7. Getting Started

### Prerequisites
- Node.js 18+ or Bun

### Installation
```bash
npm install
```

### Running Frontend (Dev Server)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Lint & Build
```bash
npm run lint
npm run build
```

---

## 8. Demo Mode (Zero API Key Requirement)

RepurposeAI is completely self-contained for evaluation and showcase:
1. Open the app at `/`.
2. Click **Start Repurposing** or navigate to `/dashboard`.
3. Click **New Repurpose** → Click **Load Showcase** (or drop any sample file) → Click **Analyze Episode**.
4. Watch the 7-stage processing pipeline transition into the Content Workspace.
5. In **Moments**, click on moment `#01` (`02:41 Score: 94`) → **Generate Content**.
6. In the Split Editor, view the source context on the left, click **Make Concise** to see the draft adapt, and click **Approve Draft**.
7. Navigate to **Review** to see the score update to `14 / 18 approved`, then click **Export Final Assets** to download `.md`, `.txt`, or `.json`.
8. Switch to **Chat** to explore Recent Chats grouped by `Today`, `Yesterday`, and `Previous 7 days`, and ask contextual questions.
9. Open **Settings** to toggle between **Obsidian** and **Paper** themes with instant persistence.

---

## 9. Team

- **Anant Goyal**
- **Dhriti Tandon**
- **Nitin Kumar**
- **Pari Agrawal**
- **Prashant Kumar**
