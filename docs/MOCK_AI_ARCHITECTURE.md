# Mock AI Architecture

## Design Goals
1. **Zero External Dependency:** Allows immediate evaluation without requiring OpenAI Whisper or Google Gemini API keys.
2. **Realistic Latency Simulation:** Uses asynchronous delays and staged progress callbacks to accurately reflect cloud synthesis timeframes.
3. **Pristine Data Quality:** Supplies rich, realistic, human-crafted podcast dialogue ("The Future of AI Agents") with authentic arguments, timestamps, and quotes.
4. **Decoupled Service Boundary:** Implemented in `src/services/mockAIService.ts` completely isolated from React view components.

## Exported Functions
- `transcribeEpisode(fileOrUrl, onProgress)`: Simulates diarization and phonetic timestamp alignment.
- `analyzeEpisode(title, transcript)`: Produces executive summary, main topics, speakers, tone, and key takeaways.
- `extractMoments(transcript)`: Returns 12 scored moments with platform mappings.
- `generateShowNotes(episodeTitle, moments)`: Returns structured podcast show notes.
- `generateLinkedIn(moment, toneModifier)`: Produces thought-leadership post; supports tone transforms (`standard`, `concise`, `punchy`).
- `generateXThread(moment)`: Produces numbered viral thread.
- `generateInstagram(moment)`: Produces carousel slides and caption text.
- `generateBlog(episodeTitle)`: Produces deep-dive markdown essay.
- `generateNewsletter(episodeTitle)`: Produces intimate subscriber email with subject and preview lines.
- `chatWithAssistant(userQuery, currentEpisode)`: Produces structured assistant answers with timestamps and platform recommendations.
