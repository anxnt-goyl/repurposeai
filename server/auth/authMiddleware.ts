import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/store';
import { DBUser } from '../db/types';

const JWT_SECRET = process.env.JWT_SECRET || 'repurposeai_dev_secret_do_not_use_in_production';
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[AUTH] CRITICAL: JWT_SECRET environment variable is missing or less than 32 characters. Authentication is insecure. Set a strong JWT_SECRET in production.');
    process.exit(1);
  }
}

export interface AuthenticatedRequest extends Request {
  user?: DBUser;
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function generateToken(user: DBUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid. Please sign in.',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = await db.users.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The authenticated session account no longer exists.',
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session has expired or is invalid. Please sign in again.',
      },
    });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await db.users.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}
