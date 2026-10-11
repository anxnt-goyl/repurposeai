# User Flow Specification

```
[Landing Page /]
       │
       ▼
[Sign In / Sign Up]
       │
       ▼
[Dashboard /dashboard] ◄────────────────────────────────┐
       │                                                 │
       ├──► [+ New Repurpose /new-repurpose]             │
       │           │                                     │
       │           ▼                                     │
       │    [Processing /processing]                     │
       │           │                                     │
       │           ▼                                     │
       └──► [Content Workspace /workspace/:id]          │
                   │                                     │
                   ├── [Overview Tab]                    │
                   ├── [Transcript Tab] (Seek & Click)   │
                   ├── [Moments Tab] (Select #01)        │
                   │         │                           │
                   │         ▼                           │
                   ├── [Split Editor] (Concise / Approve)│
                   ├── [Review Gate] (14/18 Approved)    │
                   └── [Export Modal] (.md / .txt / .json)
       │
       ├──► [Assistant Chat /chat]
       │           │
       │           ├── [Chat History: Today / Yesterday / 7d]
       │           └── [Contextual QA on active episode]
       │
       └──► [Settings /settings] (Themes, AI Directives)
```
