import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { BUSINESS } from './config/business';
import apiRoutes from './api/routes';
import masterArRoutes from './api/routes/internal/ar';
import { requireMasterAuth } from './api/middleware/masterAuth';
import { errorHandler } from './api/middleware/errorHandler';
import { JobWorker } from './pipeline/JobWorker';

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProduction
      ? undefined
      : false, // Relaxed CSP in dev for easier debugging
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const configured = (env.frontendOrigin || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      // Exact match or wildcard
      if (configured.includes(origin) || configured.includes('*')) {
        return callback(null, true);
      }

      // Auto-allow Vercel preview domains if a vercel origin is configured
      if (
        configured.some((co) => co.includes('vercel.app')) &&
        (origin.endsWith('.vercel.app') || origin.endsWith('.vercel.app/'))
      ) {
        return callback(null, true);
      }

      // In local development or if no origin configured, allow
      if (env.isDevelopment || configured.length === 0) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Dishviz-Master-Secret',
      'X-ByteMod-Master-Secret',
    ],
  })
);

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── Static asset serving (local storage provider only) ───────────────────
// Serves /static/assets/* from the configured local upload directory.
// In production with S3/R2, this route is not used — assets are served via signed URLs.
const uploadsDir = path.resolve(process.cwd(), env.storageLocalPath);
app.use('/static/assets', express.static(uploadsDir, {
  // Intentionally conservative: no directory listing, no index files
  index: false,
  dotfiles: 'deny',
}));

// ─── Master/Private API routes (Internal Only — isolated & unlisted) ───────
app.use('/api/internal/v1/ar', requireMasterAuth, masterArRoutes);

// ─── Public API routes ────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handler (must be last middleware) ───────────────────────────────
app.use(errorHandler);

// ─── Startup ───────────────────────────────────────────────────────────────
let server: ReturnType<typeof app.listen> | undefined;

if (!env.isTest) {
  server = app.listen(env.port, () => {
    console.log(`[ObjectAR Backend] Running on http://localhost:${env.port}`);
    console.log(`[ObjectAR Backend] Environment: ${env.nodeEnv}`);
    console.log(`[ObjectAR Backend] Frontend origin: ${env.frontendOrigin}`);

    if (env.arProvider === 'unconfigured') {
      console.warn(
        '[WARN] AR_PROVIDER is not configured. ' +
        'Set AR_PROVIDER and AR_PROVIDER_API_KEY to enable 3D generation.'
      );
    } else {
      console.log(`[ObjectAR Backend] AR provider: ${env.arProvider}`);
    }

    if (env.segmentationProvider === 'unconfigured') {
      console.warn(
        '[WARN] SEGMENTATION_PROVIDER is not configured. ' +
        'Set SEGMENTATION_PROVIDER to enable background removal before 3D reconstruction.'
      );
    } else {
      console.log(`[ObjectAR Backend] Segmentation provider: ${env.segmentationProvider}`);
    }

    if (!env.stripeSecretKey) {
      console.warn('[WARN] STRIPE_SECRET_KEY is not set. Billing features will be unavailable.');
    }

    if (env.isDevelopment && env.jwtSecret.includes('CHANGE')) {
      console.warn(
        '[WARN] Using default JWT secret. Set a strong JWT_SECRET before deploying to production.'
      );
    }

    console.log(`[ObjectAR Backend] Trial generations: ${BUSINESS.limits.trialGenerations}`);

    const worker = new JobWorker();
    worker.start();
    console.log('[ObjectAR Backend] Job worker started');
  });
}

export { app, server };


