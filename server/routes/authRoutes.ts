import { Router, Request, Response } from 'express';
import { db } from '../db/store';
import { DBUser } from '../db/types';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = (password && String(password).trim()) || '';

    if (!cleanPassword || cleanPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' },
      });
      return;
    }

    const existing = await db.users.findOne({ email: cleanEmail });

    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email address already exists. Please sign in.' },
      });
      return;
    }

    const cleanName = (name && name.trim()) || cleanEmail.split('@')[0];
    const newUser: DBUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      role: 'Creator & Founder',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.users.create(newUser);
    const token = generateToken(newUser);

    // Initialize user preferences
    await db.preferences.create({
      id: `pref-${newUser.id}`,
      userId: newUser.id,
      tone: 'conversational',
      contentLength: 'medium',
      creativity: 65,
      notifications: {
        processingComplete: true,
        contentGenerationComplete: true,
        exportComplete: true,
      },
      updatedAt: new Date().toISOString(),
    });

    console.log(`[AUTH] User registered: ${cleanEmail} (${newUser.id})`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (err: any) {
    console.error('[AUTH] Signup error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create account.' },
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !String(email).trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Incorrect email: Please enter your email address.' },
      });
      return;
    }

    if (!password || !String(password).trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PASSWORD', message: 'Incorrect password: Please enter your password.' },
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = String(password).trim();
    let user = await db.users.findOne({ email: cleanEmail });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INCORRECT_EMAIL',
          message: 'Incorrect email: No account found for this email address. Please check your spelling or sign up.',
        },
      });
      return;
    }

    const isMatch = verifyPassword(cleanPassword, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INCORRECT_PASSWORD',
          message: 'Incorrect password: The password you entered is incorrect. Please verify and try again.',
        },
      });
      return;
    }

    const token = generateToken(user);
    console.log(`[AUTH] User logged in: ${cleanEmail} (${user.id})`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to sign in.' },
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: { message: 'Email is required.' } });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = (newPassword && String(newPassword).trim()) || 'password123';
    const user = await db.users.findOne({ email: cleanEmail });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'No account found for this email address.' },
      });
      return;
    }

    user.passwordHash = hashPassword(cleanPassword);
    user.updatedAt = new Date().toISOString();
    await db.users.update(user.id, user);

    res.json({
      success: true,
      data: { message: 'Password updated successfully. You can now sign in with your new password.' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to reset password.' } });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: 'Signed out successfully.' } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export default router;
