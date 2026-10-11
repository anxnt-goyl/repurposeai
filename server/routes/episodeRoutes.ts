import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/store';
import { DBEpisode, DBMoment, DBContentAsset, DBTranscriptSegment } from '../db/types';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';
import { aiService } from '../services/aiService';
import { youtubeService, extractYouTubeVideoId } from '../services/youtubeService';
import { transcriptionService } from '../services/transcriptionService';
import { generateEpisodePdf } from '../services/pdfService';
import JSZip from 'jszip';

const router = Router();

// Setup local upload directory for media files
const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload MP4, MOV, MP3, WAV, or M4A.'));
    }
  },
});

const uploadSingleMedia = (req: any, res: any, next: any) => {
  upload.single('mediaFile')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { message: 'File is too large. Maximum supported size is 500 MB.' },
        });
      }
      return res.status(400).json({
        success: false,
        error: { message: err.message || 'File upload failed.' },
      });
    }
    if (req.file && req.file.size === 0) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({
        success: false,
        error: { message: 'The uploaded file is empty (0 bytes). Please upload a valid media file.' },
      });
    }
    next();
  });
};

// GET /api/episodes - retrieve user's episodes
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const episodes = await db.episodes.find({ userId });

    const enriched = await Promise.all(episodes.map(async (ep) => {
      const assets = await db.assets.find({ episodeId: ep.id });
      const moments = await db.moments.find({ episodeId: ep.id });
      const rawTranscript = await db.transcripts.find({ episodeId: ep.id });
      const transcript = rawTranscript.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      return {
        ...ep,
        assets,
        moments,
        transcript,
      };
    }));

    res.json({
      success: true,
      data: enriched,
    });
  } catch (err: any) {
    console.error('[EPISODES] Fetch error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch episodes.' } });
  }
});

// GET /api/episodes/:id - retrieve single episode
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);

    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Episode not found.' } });
      return;
    }

    const assets = await db.assets.find({ episodeId: ep.id });
    const moments = await db.moments.find({ episodeId: ep.id });
    const rawTranscript = await db.transcripts.find({ episodeId: ep.id });
    const transcript = rawTranscript.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

    res.json({
      success: true,
      data: {
        ...ep,
        assets,
        moments,
        transcript,
      },
    });
  } catch (err: any) {
    console.error('[EPISODES] Fetch one error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve episode.' } });
  }
});

// PATCH /api/episodes/:id - update episode metadata
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);

    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }

    const { title, status } = req.body;
    const updates: Partial<DBEpisode> = {
      updatedAt: new Date().toISOString(),
    };
    if (title && title.trim()) updates.title = title.trim();
    if (status) updates.status = status;

    const updated = await db.episodes.update(ep.id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to update episode.' } });
  }
});

// POST /api/episodes - create episode with real transcription and AI pipeline
router.post('/', requireAuth, uploadSingleMedia, async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  try {
    const userId = req.user!.id;
    const {
      title,
      sourceType = 'video',
      youtubeUrl,
      customTranscript,
      customSpeakers,
      duration = '30:00',
    } = req.body;

    if (sourceType === 'youtube' && !youtubeUrl && !customTranscript && !req.file) {
      res.status(400).json({ success: false, error: { message: 'Please provide an audio/video file, a YouTube link, or transcript text.' } });
      return;
    }

    // Fail fast if AI is not configured and no custom transcript was provided
    if (!customTranscript && !aiService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: { message: 'AI analysis is not configured. Set GEMINI_API_KEY to process episodes. Alternatively, use the "Paste Transcript" tab to skip AI transcription.' },
      });
      return;
    }
    let transcriptText = '';
    let cleanTitle = (title && title.trim()) || '';
    let parsedDurationSeconds = 1800;
    let durationStr = duration;
    let segmentsToSave: Array<{ timestamp: string; timestampSeconds: number; speaker: string; text: string }> = [];
    let canonicalSourceUrl: string | undefined = undefined;

    // 1. Process YouTube source if specified
    if (sourceType === 'youtube' && youtubeUrl) {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        res.status(400).json({
          success: false,
          error: { message: 'Please provide a valid YouTube video URL. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/' },
        });
        return;
      }

      canonicalSourceUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`[EPISODES] Extracting real YouTube captions for: ${canonicalSourceUrl}...`);
      try {
        const ytData = await youtubeService.getTranscript(canonicalSourceUrl);
        if (!cleanTitle || cleanTitle === 'YouTube Video Production' || cleanTitle === 'YouTube Video') {
          cleanTitle = ytData.title;
        }
        durationStr = ytData.duration;
        parsedDurationSeconds = ytData.durationSeconds;
        transcriptText = ytData.transcriptText;
        segmentsToSave = ytData.segments.map((s) => ({
          timestamp: s.timestamp,
          timestampSeconds: s.timestampSeconds,
          speaker: 'Transcript',
          text: s.text,
        }));
      } catch (ytErr: any) {
        res.status(400).json({
          success: false,
          error: { message: ytErr.message || 'Failed to retrieve YouTube transcript.' },
        });
        return;
      }
    }
    // 2. Process uploaded audio/video file
    else if (file) {
      if (!cleanTitle) cleanTitle = path.parse(file.originalname).name;

      if (customTranscript && customTranscript.trim()) {
        transcriptText = customTranscript.trim();
      } else {
        console.log(`[EPISODES] Transcribing uploaded media: ${file.originalname}...`);
        try {
          const transResult = await transcriptionService.transcribeFile(file.path, file.originalname);
          transcriptText = transResult.transcriptText;
          segmentsToSave = transResult.segments;
        } catch (transErr: any) {
          // Clean up file
          try { fs.unlinkSync(file.path); } catch {}
          res.status(400).json({
            success: false,
            error: { message: transErr.message || 'Media transcription failed.' },
          });
          return;
        }
      }
    }
    // 3. Process custom transcript text
    else if (customTranscript && customTranscript.trim()) {
      transcriptText = customTranscript.trim();
      if (!cleanTitle) cleanTitle = 'Custom Recording Session';
    } else {
      res.status(400).json({
        success: false,
        error: { message: 'Please provide an audio/video file, a YouTube link, or transcript text.' },
      });
      return;
    }

    if (!transcriptText || transcriptText.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: { message: 'The extracted transcript was empty or too brief for content repurposing.' },
      });
      return;
    }

    const epId = `ep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const fileSizeStr = file
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : sourceType === 'youtube'
      ? 'YouTube Stream'
      : 'Direct Ingest';

    const speakerList = customSpeakers
      ? customSpeakers.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [req.user!.name, 'Guest'];

    // 4. Real AI Content Understanding & Analysis
    let analysis;
    try {
      console.log(`[EPISODES] Running AI content analysis for "${cleanTitle}"...`);
      analysis = await aiService.analyzeEpisodeTranscript(cleanTitle, transcriptText, speakerList);
    } catch (analysisErr: any) {
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      console.error('[EPISODES] Content analysis step failed:', analysisErr.message);
      res.status(502).json({
        success: false,
        error: {
          step: 'analysis',
          message: analysisErr.message || 'AI content analysis failed.',
        },
      });
      return;
    }

    const newEpisode: DBEpisode = {
      id: epId,
      userId,
      title: cleanTitle,
      sourceType,
      sourceFilename: file ? file.originalname : undefined,
      sourceUrl: canonicalSourceUrl || (youtubeUrl ? youtubeUrl.trim() : undefined),
      duration: durationStr,
      durationSeconds: parsedDurationSeconds,
      fileSize: fileSizeStr,
      status: 'Processing',
      summary: analysis.summary,
      mainTopics: analysis.mainTopics,
      speakers: analysis.speakers,
      tone: analysis.tone,
      keyTakeaways: analysis.keyTakeaways,
      chapters: analysis.chapters,
      dateProcessed: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.episodes.create(newEpisode);

    // 5. Save Extracted Moments
    const savedMoments: DBMoment[] = [];
    if (analysis.moments && analysis.moments.length > 0) {
      analysis.moments.forEach((m, idx) => {
        const momentRecord: DBMoment = {
          id: `m-${epId}-${idx + 1}`,
          episodeId: epId,
          userId,
          index: idx + 1,
          timestamp: m.timestamp,
          timestampSeconds: m.timestamp.includes(':')
            ? parseInt(m.timestamp.split(':')[0], 10) * 60 + parseInt(m.timestamp.split(':')[1] || '0', 10)
            : idx * 180,
          title: m.title,
          quote: m.quote,
          type: m.type as any,
          score: m.score || 90,
          whyItMatters: m.whyItMatters,
          potentialPlatforms: (m.potentialPlatforms || ['linkedin', 'x', 'instagram']) as any,
          createdAt: new Date().toISOString(),
        };
        savedMoments.push(momentRecord);
      });
      await db.moments.createMany(savedMoments);
    }

    // 6. Save Transcript Segments
    let savedTranscripts: DBTranscriptSegment[] = [];
    if (segmentsToSave.length > 0) {
      savedTranscripts = segmentsToSave.map((seg, idx) => ({
        id: `ts-${epId}-${idx + 1}`,
        episodeId: epId,
        userId,
        timestamp: seg.timestamp,
        timestampSeconds: seg.timestampSeconds,
        speaker: seg.speaker || analysis.speakers[0] || 'Speaker',
        text: seg.text,
        createdAt: new Date().toISOString(),
      }));
      await db.transcripts.createMany(savedTranscripts);
    } else {
      const lines = transcriptText.split('\n').filter((l: string) => l.trim().length > 0);
      savedTranscripts = lines.map((line: string, idx: number) => {
        let speaker = analysis.speakers[idx % analysis.speakers.length] || 'Transcript';
        let text = line.trim();
        let timestampStr = '';
        let totalSec = Math.min(parsedDurationSeconds, idx * 30);

        // Check if line starts with timestamp: [01:23] or 01:23
        const tsMatch = text.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-:]?\s*(.*)$/);
        if (tsMatch) {
          timestampStr = tsMatch[1];
          text = tsMatch[2].trim();
          const parts = timestampStr.split(':').map((p) => parseInt(p, 10));
          if (parts.length === 2) totalSec = (parts[0] || 0) * 60 + (parts[1] || 0);
          else if (parts.length === 3) totalSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        } else {
          const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
          const ss = (totalSec % 60).toString().padStart(2, '0');
          timestampStr = `${mm}:${ss}`;
        }

        // Check if remaining text has speaker prefix: "Alice: hello"
        if (text.includes(':')) {
          const parts = text.split(':');
          const candidateSpeaker = parts[0].trim();
          if (candidateSpeaker.length > 0 && candidateSpeaker.length < 35 && !candidateSpeaker.includes(' ')) {
            speaker = candidateSpeaker;
            text = parts.slice(1).join(':').trim();
          }
        }

        return {
          id: `ts-${epId}-${idx + 1}`,
          episodeId: epId,
          userId,
          timestamp: timestampStr,
          timestampSeconds: totalSec,
          speaker: speaker || 'Transcript',
          text,
          createdAt: new Date().toISOString(),
        };
      });
      await db.transcripts.createMany(savedTranscripts);
    }

    // 7. Real Platform Content Generation (all 6 formats)
    console.log(`[EPISODES] Generating platform assets for "${cleanTitle}"...`);
    const platforms: Array<'linkedin' | 'x' | 'instagram' | 'blog' | 'newsletter' | 'show_notes'> = [
      'linkedin',
      'x',
      'instagram',
      'blog',
      'newsletter',
      'show_notes',
    ];

    let batchAssets: any;
    try {
      batchAssets = await aiService.generateAllPlatformAssets(newEpisode, savedMoments[0]);
    } catch (genErr: any) {
      await db.episodes.update(epId, { status: 'Draft' });
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      console.error('[EPISODES] Asset generation step failed:', genErr.message);
      res.status(502).json({
        success: false,
        error: {
          step: 'asset_generation',
          message: genErr.message || 'Platform content generation failed.',
        },
      });
      return;
    }

    const savedAssets: DBContentAsset[] = [];
    for (const plt of platforms) {
      const assetResult = batchAssets[plt];
      if (!assetResult || !assetResult.content) {
        await db.episodes.update(epId, { status: 'Draft' });
        res.status(502).json({
          success: false,
          error: {
            step: 'asset_generation',
            message: `Missing generated content for platform ${plt}.`,
          },
        });
        return;
      }
      const titleStr = assetResult.title || `${newEpisode.title} - ${plt.toUpperCase()}`;
      const contentStr = assetResult.content;
      const wordCount = assetResult.wordCount || contentStr.trim().split(/\s+/).filter(Boolean).length;

      const assetRecord: DBContentAsset = {
        id: `ast-${epId}-${plt}-01`,
        episodeId: epId,
        userId,
        momentId: savedMoments[0]?.id,
        platform: plt,
        title: titleStr,
        content: contentStr,
        status: plt === 'linkedin' || plt === 'show_notes' ? 'approved' : 'needs_review',
        lastEdited: 'Just now',
        wordCount,
        readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 180)),
        sourceContext: {
          timestamp: savedMoments[0]?.timestamp || '02:40',
          quote: savedMoments[0]?.quote || newEpisode.summary,
          momentType: savedMoments[0]?.type || 'Insight',
          tone: newEpisode.tone,
          audience: 'Founders, Creators, Operators',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savedAssets.push(assetRecord);
    }
    await db.assets.createMany(savedAssets);
    await db.episodes.update(epId, { status: 'Ready for Review' });
    newEpisode.status = 'Ready for Review';

    // Clean up temporary uploaded file
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }

    console.log(`[EPISODES] Created episode ${epId} with ${savedMoments.length} moments and ${savedAssets.length} assets.`);

    res.status(201).json({
      success: true,
      data: {
        ...newEpisode,
        moments: savedMoments,
        assets: savedAssets,
        transcript: savedTranscripts,
      },
    });
  } catch (err: any) {
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }
    console.error('[EPISODES] Create error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to process episode.' } });
  }
});

// DELETE /api/episodes/:id - delete episode and all associated data
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);

    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Episode not found.' } });
      return;
    }

    await db.episodes.delete(ep.id);
    await db.moments.deleteMany({ episodeId: ep.id });
    await db.assets.deleteMany({ episodeId: ep.id });
    await db.transcripts.deleteMany({ episodeId: ep.id });

    console.log(`[EPISODES] Deleted episode ${ep.id}`);
    res.json({ success: true, data: { deletedId: ep.id } });
  } catch (err: any) {
    console.error('[EPISODES] Delete error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete episode.' } });
  }
});

// GET /api/episodes/:id/moments
router.get('/:id/moments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const ep = await db.episodes.findById(req.params.id);
  if (!ep || ep.userId !== userId) {
    res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
    return;
  }
  const moments = await db.moments.find({ episodeId: ep.id });
  res.json({ success: true, data: moments });
});

// GET /api/episodes/:id/content
router.get('/:id/content', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const ep = await db.episodes.findById(req.params.id);
  if (!ep || ep.userId !== userId) {
    res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
    return;
  }
  const assets = await db.assets.find({ episodeId: ep.id });
  res.json({ success: true, data: assets });
});

// GET /api/episodes/:id/transcript
router.get('/:id/transcript', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const ep = await db.episodes.findById(req.params.id);
  if (!ep || ep.userId !== userId) {
    res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
    return;
  }
  const rawTranscript = await db.transcripts.find({ episodeId: ep.id });
  const transcript = rawTranscript.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  res.json({ success: true, data: transcript });
});

// POST /api/episodes/:id/transcribe - re-run transcription
router.post('/:id/transcribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const ep = await db.episodes.findById(req.params.id);
  if (!ep || ep.userId !== userId) {
    res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
    return;
  }
  const segments = await db.transcripts.find({ episodeId: ep.id });
  res.json({ success: true, data: segments });
});

// POST /api/episodes/:id/analyze - re-run analysis
router.post('/:id/analyze', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);
    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }
    const segments = await db.transcripts.find({ episodeId: ep.id });
    const transcriptText = segments.map((s) => s.text).join(' ');
    const analysis = await aiService.analyzeEpisodeTranscript(ep.title, transcriptText, ep.speakers);
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error('[EPISODES] Re-analyze error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Analysis failed.' } });
  }
});

// POST /api/episodes/:id/generate - re-run asset generation
router.post('/:id/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);
    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }
    const moments = await db.moments.find({ episodeId: ep.id });
    const batchAssets = await aiService.generateAllPlatformAssets(ep, moments[0]);
    res.json({ success: true, data: batchAssets });
  } catch (err: any) {
    console.error('[EPISODES] Re-generate error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Asset generation failed.' } });
  }
});

// GET /api/episodes/:id/export/pdf - export episode as formatted PDF
router.get('/:id/export/pdf', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);
    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }

    const category = (req.query.category as string) || 'all';
    const approvedOnly = req.query.approvedOnly === 'true';
    const includeTranscript = req.query.includeTranscript !== 'false';

    const assets = await db.assets.find({ episodeId: ep.id });
    const rawTranscript = await db.transcripts.find({ episodeId: ep.id });
    const transcript = rawTranscript.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

    const pdfBytes = generateEpisodePdf(ep, assets, transcript, category, { approvedOnly, includeTranscript });

    const sanitizedTitle = (ep.title || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `${sanitizedTitle}-${category}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error('[EPISODES] PDF export error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to generate PDF.' } });
  }
});

// GET /api/episodes/:id/export/zip - export assets as ZIP package
router.get('/:id/export/zip', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const ep = await db.episodes.findById(req.params.id);
    if (!ep || ep.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }

    const category = (req.query.category as string) || 'all';
    const approvedOnly = req.query.approvedOnly === 'true';
    const includeTranscript = req.query.includeTranscript !== 'false';

    const assets = await db.assets.find({ episodeId: ep.id });
    const rawTranscript = await db.transcripts.find({ episodeId: ep.id });
    const transcript = rawTranscript.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

    const eligibleAssets = approvedOnly
      ? assets.filter((a) => a.status === 'approved')
      : assets.filter((a) => a.status !== 'rejected');

    let scopedAssets = eligibleAssets;
    if (category === 'social') {
      scopedAssets = eligibleAssets.filter((a) => ['linkedin', 'x', 'instagram'].includes(a.platform));
    } else if (category === 'show_notes') {
      scopedAssets = eligibleAssets.filter((a) => a.platform === 'show_notes');
    } else if (category === 'blog') {
      scopedAssets = eligibleAssets.filter((a) => a.platform === 'blog');
    } else if (category === 'newsletter') {
      scopedAssets = eligibleAssets.filter((a) => a.platform === 'newsletter');
    } else if (category === 'transcript') {
      scopedAssets = [];
    }

    const zip = new JSZip();

    // 1. Overview & Summary
    const overviewLines: string[] = [
      `# ${ep.title}`,
      `**Duration:** ${ep.duration || 'N/A'} · **Exported:** ${new Date().toLocaleDateString()}`,
      ep.sourceUrl ? `**Source URL:** ${ep.sourceUrl}` : '',
      ep.sourceFilename ? `**Source File:** ${ep.sourceFilename}` : '',
      '',
      `## Executive Summary`,
      ep.summary || '',
      '',
      `## Key Takeaways`,
      ...(ep.keyTakeaways || []).map((t) => `- ${t}`),
      '',
      `## Chapters`,
      ...(ep.chapters || []).map((c) => `- [${c.timestamp}] **${c.title}**: ${c.description || ''}`),
    ].filter(Boolean);
    zip.file('00_overview_and_summary.md', overviewLines.join('\n'));

    // 2. Individual Content Assets
    if (scopedAssets.length > 0) {
      const contentFolder = zip.folder('content');
      scopedAssets.forEach((ast, idx) => {
        const platformSlug = ast.platform.toLowerCase();
        const assetContent = [
          `# [${ast.platform.toUpperCase()}] ${ast.title}`,
          `*Status: ${ast.status} | Word Count: ${ast.wordCount}*`,
          '',
          ast.content,
        ].join('\n');
        contentFolder?.file(`${(idx + 1).toString().padStart(2, '0')}_${platformSlug}.md`, assetContent);
      });
    }

    // 3. Transcript
    if (includeTranscript && transcript.length > 0) {
      const transcriptLines = transcript.map((t) => {
        const spk = (!t.speaker || t.speaker.toLowerCase() === 'speaker') ? 'Transcript' : t.speaker;
        return `[${t.timestamp}] ${spk}:\n${t.text}\n`;
      });
      zip.file('full_transcript.txt', transcriptLines.join('\n'));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const sanitizedTitle = (ep.title || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `${sanitizedTitle}-${category}-${new Date().toISOString().split('T')[0]}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('[EPISODES] ZIP export error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to generate ZIP.' } });
  }
});

export default router;
