import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const rateLimitMessage = (message: string) => ({ error: message });

/** Applies to auth endpoints (register, login) — protects against brute force */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('Too many requests. Please try again in 15 minutes.'),
});

/** Applies to general API routes */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('Rate limit exceeded. Please slow down your requests.'),
  keyGenerator: (req: Request) => {
    // Rate limit by API key prefix if present, otherwise by IP
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer oar_')) {
      return auth.slice(7, 23); // First 16 chars of key as rate limit identifier
    }
    return req.ip ?? 'unknown';
  },
});

/** Applies to job creation (upload) endpoints — prevents storage abuse */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage(
    'Upload rate limit reached. You can create up to 30 jobs per hour.'
  ),
});
