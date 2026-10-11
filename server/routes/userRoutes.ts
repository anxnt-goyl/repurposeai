import { Router, Response } from 'express';
import { db } from '../db/store';
import { DBUserPreferences } from '../db/types';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';

const router = Router();

// GET /api/profile
router.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// PATCH /api/profile
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, email } = req.body;

    const updates: any = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name.trim();
    if (email && email.includes('@')) {
      const cleanEmail = email.trim().toLowerCase();
      // Check if email taken by someone else
      const existing = await db.users.findOne({ email: cleanEmail });
      if (existing && existing.id !== user.id) {
        res.status(409).json({ success: false, error: { message: 'Email address already in use.' } });
        return;
      }
      updates.email = cleanEmail;
    }

    const updated = await db.users.update(user.id, updates);
    res.json({
      success: true,
      data: {
        id: updated!.id,
        name: updated!.name,
        email: updated!.email,
        role: updated!.role,
      },
    });
  } catch (err: any) {
    console.error('[USER] Profile update error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to update profile.' } });
  }
});

// GET /api/preferences
router.get('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let prefs = await db.preferences.findOne({ userId });

  if (!prefs) {
    prefs = {
      id: `pref-${userId}`,
      userId,
      tone: 'conversational',
      contentLength: 'medium',
      creativity: 65,
      notifications: {
        processingComplete: true,
        contentGenerationComplete: true,
        exportComplete: true,
      },
      updatedAt: new Date().toISOString(),
    };
    await db.preferences.create(prefs);
  }

  res.json({ success: true, data: prefs });
});

// PATCH /api/preferences
router.patch('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let prefs = await db.preferences.findOne({ userId });

    const { tone, contentLength, creativity, notifications } = req.body;
    const updates: Partial<DBUserPreferences> = {
      updatedAt: new Date().toISOString(),
    };

    if (tone) updates.tone = tone;
    if (contentLength) updates.contentLength = contentLength;
    if (creativity !== undefined) updates.creativity = Number(creativity);
    if (notifications) {
      updates.notifications = {
        ...prefs?.notifications,
        ...notifications,
      };
    }

    if (!prefs) {
      const newPrefs: DBUserPreferences = {
        id: `pref-${userId}`,
        userId,
        tone: tone || 'conversational',
        contentLength: contentLength || 'medium',
        creativity: creativity !== undefined ? Number(creativity) : 65,
        notifications: notifications || {
          processingComplete: true,
          contentGenerationComplete: true,
          exportComplete: true,
        },
        updatedAt: new Date().toISOString(),
      };
      await db.preferences.create(newPrefs);
      res.json({ success: true, data: newPrefs });
      return;
    }

    const updated = await db.preferences.update(prefs.id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[USER] Preferences update error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to update preferences.' } });
  }
});

// GET /api/stats - Real live metrics calculated strictly from DB
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const episodes = await db.episodes.find({ userId });
    const assets = await db.assets.find({ userId });

    const totalEpisodes = episodes.length;
    const totalAssets = assets.length;
    const totalApproved = assets.filter((a) => a.status === 'approved').length;
    const totalPending = assets.filter((a) => a.status === 'needs_review' || a.status === 'draft').length;
    const totalRejected = assets.filter((a) => a.status === 'rejected').length;

    const hoursSaved = Math.max(0, Math.round(totalAssets * 0.35));
    const approvalRate = totalAssets > 0 ? Math.round((totalApproved / totalAssets) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalEpisodes,
        totalAssets,
        totalApproved,
        totalPending,
        totalRejected,
        hoursSaved,
        approvalRate,
      },
    });
  } catch (err: any) {
    console.error('[USER] Stats calculation error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to calculate stats.' } });
  }
});

export default router;
