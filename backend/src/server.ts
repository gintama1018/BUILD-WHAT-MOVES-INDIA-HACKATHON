import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { getDb } from './db/connection';
import { runSeed } from './db/seed/run_seed';
import { router as queryRouter } from './api/routes/query';
import { router as authoritiesRouter } from './api/routes/authorities';
import { router as portalsRouter } from './api/routes/portals';
import { router as feedbackRouter } from './api/routes/feedback';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '50kb' })); // Small limit — RTI queries are short

// Global rate limit: 60 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests — please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/query', queryRouter);
app.use('/api/authorities', authoritiesRouter);
app.use('/api/portals', portalsRouter);
app.use('/api/feedback', feedbackRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Global error handler ─────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again.',
    // NEVER expose stack traces or internal details in production
  });
});

// ── Start ────────────────────────────────────────────────────
async function start() {
  // Initialize DB + seed on first run
  getDb();
  runSeed();
  console.log(`[db] Database ready`);

  app.listen(PORT, () => {
    console.log(`[server] RTI Assistant API running on http://localhost:${PORT}`);
    console.log(`[model] AI model: ${process.env.AI_MODEL_NAME || 'claude-sonnet-5'}`);
  });
}

start().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});

export default app;
