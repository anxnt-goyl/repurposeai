import { Router, Response } from 'express';
import { db } from '../db/store';
import { DBContentAsset } from '../db/types';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';
import { aiService } from '../services/aiService';

const router = Router();

// GET /api/content/:id - get single asset
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    res.json({ success: true, data: asset });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve asset.' } });
  }
});

// POST /api/content - create custom asset
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { episodeId, platform, title, content, momentId } = req.body;

    if (!episodeId || !title || !content) {
      res.status(400).json({ success: false, error: { message: 'episodeId, title, and content are required.' } });
      return;
    }

    const episode = await db.episodes.findById(episodeId);
    if (!episode || episode.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Episode not found.' } });
      return;
    }

    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const newAsset: DBContentAsset = {
      id: `ast-${episodeId}-custom-${Date.now()}`,
      episodeId,
      userId,
      momentId: momentId || undefined,
      platform: platform || 'linkedin',
      title: title.trim(),
      content: content.trim(),
      status: 'draft',
      lastEdited: 'Just now',
      wordCount: words,
      readingTimeMinutes: Math.max(1, Math.ceil(words / 180)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.assets.create(newAsset);
    res.status(201).json({ success: true, data: newAsset });
  } catch (err: any) {
    console.error('[CONTENT] Create error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to create asset.' } });
  }
});

// PATCH /api/content/:id - update content text or title
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    const { content, title } = req.body;
    const updates: Partial<DBContentAsset> = {
      updatedAt: new Date().toISOString(),
      lastEdited: 'Just now',
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (content !== undefined) {
      updates.content = content;
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      updates.wordCount = words;
      updates.readingTimeMinutes = Math.max(1, Math.ceil(words / 180));
    }

    const updated = await db.assets.update(asset.id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[CONTENT] Update error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to save asset.' } });
  }
});

// POST /api/content/:id/approve - approve asset
router.post('/:id/approve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    const updated = await db.assets.update(asset.id, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
      lastEdited: 'Approved just now',
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to approve asset.' } });
  }
});

// POST /api/content/:id/reject - reject asset
router.post('/:id/reject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    const updated = await db.assets.update(asset.id, {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      lastEdited: 'Rejected just now',
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to reject asset.' } });
  }
});

// PATCH /api/content/:id/status - approve or reject
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    const { status } = req.body;
    if (!['draft', 'needs_review', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: { message: 'Invalid status value.' } });
      return;
    }

    const updated = await db.assets.update(asset.id, {
      status,
      updatedAt: new Date().toISOString(),
      lastEdited: 'Just now',
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[CONTENT] Status error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to update asset status.' } });
  }
});

// POST /api/content/:id/regenerate - AI regeneration
router.post('/:id/regenerate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    const episode = await db.episodes.findById(asset.episodeId);
    if (!episode) {
      res.status(404).json({ success: false, error: { message: 'Parent episode not found.' } });
      return;
    }

    const moment = asset.momentId ? await db.moments.findById(asset.momentId) || undefined : undefined;
    const { toneModifier = 'standard' } = req.body;
    const userPrefs = await db.preferences.findOne({ userId });

    console.log(`[CONTENT] Regenerating asset ${asset.id} (${asset.platform}) with tone: ${toneModifier}...`);
    const generated = await aiService.generatePlatformAsset(
      episode,
      asset.platform,
      moment,
      toneModifier,
      userPrefs ? { tone: userPrefs.tone, contentLength: userPrefs.contentLength } : undefined
    );

    const updated = await db.assets.update(asset.id, {
      title: generated.title,
      content: generated.content,
      wordCount: generated.wordCount,
      readingTimeMinutes: generated.readingTimeMinutes,
      status: 'needs_review',
      lastEdited: `Regenerated (${toneModifier}) just now`,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[CONTENT] Regenerate error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to regenerate asset.' } });
  }
});

// DELETE /api/content/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const asset = await db.assets.findById(req.params.id);

    if (!asset || asset.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Content asset not found.' } });
      return;
    }

    await db.assets.delete(asset.id);
    res.json({ success: true, data: { deletedId: asset.id } });
  } catch (err: any) {
    console.error('[CONTENT] Delete error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete asset.' } });
  }
});

export default router;
