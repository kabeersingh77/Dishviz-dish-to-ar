import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../security/jwt';
import { hashApiKey } from '../../security/apiKeys';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

// Extend Express Request with authenticated user context
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      /**
       * 'session'  — Cookie session from web app user
       * 'api_key'  — External developer API key (Bearer oar_live_...)
       * 'internal' — First-party server-to-server credential (e.g. Universal Digital Menu SaaS)
       */
      authMethod?: 'session' | 'api_key' | 'internal';
    }
  }
}

/**
 * Internal service secret auth check.
 * Verifies if the request carries the private server-to-server secret.
 */
function tryInternalAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (
    env.internalArServiceSecret &&
    authHeader &&
    authHeader === `Bearer ${env.internalArServiceSecret}`
  ) {
    req.userId = 'internal_digital_menu';
    req.userEmail = 'internal@objectar.local';
    req.authMethod = 'internal';
    return true;
  }
  return false;
}

/**
 * JWT session auth middleware — for web app routes.
 * Reads token from httpOnly cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check internal first-party secret first
  if (tryInternalAuth(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer oar_')
      ? authHeader.substring(7).trim()
      : undefined;

  const token = (req.cookies as Record<string, string>)?.token || bearerToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.authMethod = 'session';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/**
 * Developer API key auth middleware.
 * Accepts: Authorization: Bearer oar_live_... OR internal secret.
 * Updates lastUsedAt in a non-blocking fire-and-forget.
 */
export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check internal first-party secret
  if (tryInternalAuth(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer oar_')) {
    res.status(401).json({
      error: 'Invalid API key format. Use: Authorization: Bearer oar_live_...',
      code: 'INVALID_API_KEY_FORMAT',
    });
    return;
  }

  const fullKey = authHeader.replace('Bearer ', '');
  const keyHash = hashApiKey(fullKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!apiKey || apiKey.revokedAt) {
    res.status(401).json({ error: 'Invalid or revoked API key', code: 'INVALID_API_KEY' });
    return;
  }

  // Non-blocking last-used timestamp update
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* intentionally silent */ });

  req.userId = apiKey.user.id;
  req.userEmail = apiKey.user.email;
  req.authMethod = 'api_key';
  next();
}

/**
 * Dual-mode auth — accepts either an internal secret, an external API key, OR a cookie session.
 * Used on AR job and asset routes so both web users and developers/internal callers can access them.
 */
export async function requireAuthOrApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Internal server-to-server check
  if (tryInternalAuth(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  // 2. If the Authorization header contains an external API key, use API key auth
  if (authHeader?.startsWith('Bearer oar_')) {
    return requireApiKey(req, res, next);
  }

  // 3. Otherwise try cookie session
  requireAuth(req, res, next);
}

/**
 * Optional authentication — populates req.userId if a valid cookie, API key,
 * or internal secret is provided, but does not reject the request if missing.
 * Used for public or unlisted asset viewing.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (tryInternalAuth(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer oar_')) {
    const fullKey = authHeader.replace('Bearer ', '');
    const keyHash = hashApiKey(fullKey);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true } } },
    });
    if (apiKey && !apiKey.revokedAt) {
      req.userId = apiKey.user.id;
      req.userEmail = apiKey.user.email;
      req.authMethod = 'api_key';
    }
    return next();
  }

  const token = (req.cookies as Record<string, string>)?.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.userId = payload.sub;
      req.userEmail = payload.email;
      req.authMethod = 'session';
    } catch {
      // Ignore invalid session in optional auth
    }
  }

  next();
}
