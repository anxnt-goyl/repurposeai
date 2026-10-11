import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/authRoutes';
import episodeRoutes from './server/routes/episodeRoutes';
import contentRoutes from './server/routes/contentRoutes';
import chatRoutes from './server/routes/chatRoutes';
import userRoutes from './server/routes/userRoutes';
import seedRoutes from './server/routes/seedRoutes';
import { aiService } from './server/services/aiService';
import { db, connectMongoDB } from './server/db/store';

dotenv.config();



const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: isProduction && allowedOrigins.length > 0
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
          } else {
            cb(new Error(`CORS: origin ${origin} not allowed`));
          }
        }
      : '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health Check Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database: db.isMongo() ? 'mongodb_atlas' : 'persistent_disk',
    environment: process.env.NODE_ENV || 'development',
    aiConfigured: aiService.isConfigured(),
  });
});

app.get('/api/health/services', (_req: Request, res: Response) => {
  res.json({
    database: {
      status: 'operational',
      type: db.isMongo() ? 'mongodb_atlas' : 'persistent_disk',
    },
    ai: {
      status: aiService.isConfigured() ? 'ready' : 'missing_api_key',
      provider: 'Google Gemini (gemini-3.8-flash)',
    },
    storage: {
      status: 'operational',
      type: 'persistent_storage',
    },
  });
});

// Mount Centralized Backend API Routes
app.use('/api/auth', authRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', userRoutes);
app.use('/api/seed', seedRoutes);

// Global API 404 handler for unmatched /api routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} does not exist.`,
    },
  });
});

// Frontend Vite Integration (Middleware in Dev, Static in Prod)
async function startServer() {
  try {
    await connectMongoDB();
  } catch (err: any) {
    console.warn('[SERVER] MongoDB Atlas initialization warning:', err.message);
  }

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] RepurposeAI listening on http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] Mode: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`[SERVER] Database: ${db.isMongo() ? 'MongoDB Atlas (primary)' : 'Persistent Disk Store (MongoDB unavailable or unconfigured)'}`);
    console.log(`[SERVER] Gemini AI: ${aiService.isConfigured() ? 'Configured' : 'Not configured (GEMINI_API_KEY missing)'}`);
    if (isProduction && !db.isMongo()) {
      console.warn('[SERVER] WARNING: Running in production with disk store. Data will not persist across deploys. Set MONGODB_URI.');
    }
  });
  server.headersTimeout = 300_000;
  server.requestTimeout = 300_000;
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err);
  process.exit(1);
});
