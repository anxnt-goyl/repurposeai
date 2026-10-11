import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';
import { seedUserEpisode } from '../seeds/seed';
import { db } from '../db/store';

const router = Router();

// POST /api/seed - optionally seeds a real sample episode into DB for the authenticated user
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ success: false, error: { message: 'Seeding is disabled in production environments.' } });
    return;
  }
  try {
    const userId = req.user!.id;
    const result = await seedUserEpisode(userId);
    res.json({ success: true, data: { message: 'Seed episode created in database.', ...result } });
  } catch (err: any) {
    console.error('[SEED] Error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to seed sample project.' } });
  }
});

// POST /api/seed/clear - clears current user's data for fresh testing
router.post('/clear', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ success: false, error: { message: 'Clearing data is disabled in production environments.' } });
    return;
  }
  try {
    const userId = req.user!.id;
    const eps = await db.episodes.find({ userId });
    for (const ep of eps) {
      await db.moments.deleteMany({ episodeId: ep.id });
      await db.assets.deleteMany({ episodeId: ep.id });
      await db.transcripts.deleteMany({ episodeId: ep.id });
    }
    await db.episodes.deleteMany({ userId });
    await db.chats.deleteMany({ userId });
    await db.messages.deleteMany({ userId });

    res.json({ success: true, data: { message: 'User data cleared.' } });
  } catch (err: any) {
    console.error('[SEED] Clear error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to clear data.' } });
  }
});

export default router;
