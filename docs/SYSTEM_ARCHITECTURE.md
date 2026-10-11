# System Architecture

## Architectural Layers
1. **Presentation Layer (React 19 + Tailwind CSS):**
   - High-performance component architecture using functional hooks.
   - Design tokens implemented via CSS custom properties allowing instant zero-reflow theme toggling.
   - Command palette, responsive collapsible sidebar, and toast notifications.

2. **State & Orchestration Layer (Context API):**
   - `ProjectContext`: Central data hub managing active episode, moments, assets, chat conversations, and user preferences.
   - `ThemeContext`: Obsidian vs Paper theme state with `localStorage` syncing.
   - `AuthContext`: Session lifecycle handling.
   - `ToastContext`: Non-blocking micro-feedback system.

3. **Intelligence & Mock Service Layer (`mockAIService.ts`):**
   - Decoupled from React views; delivers strongly-typed analytical outputs.
   - Asynchronous simulation mimicking cloud speech-to-text, LLM moment scoring, and platform adaptation.
   - Fully operational in offline demo environments without external cloud API dependencies.
