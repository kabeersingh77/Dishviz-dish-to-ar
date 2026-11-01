import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

/**
 * Master Authentication Middleware
 *
 * Exclusively guards the Master/Private API (/api/internal/v1/*).
 * Requirements:
 *  - Checks X-Dishviz-Master-Secret (or X-ByteMod-Master-Secret / Authorization: Bearer <master_secret>)
 *  - Compares against MASTER_INTERNAL_SECRET
 *  - If MASTER_ALLOWED_IPS is configured, checks client IP against allowed list
 *  - On failure, returns HTTP 404 Not Found to obscure the endpoint's existence completely
 */
export function requireMasterAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secretHeader = req.headers['x-dishviz-master-secret'] || req.headers['x-bytemod-master-secret'];
  const authHeader = req.headers['authorization'];

  let token = '';
  if (typeof secretHeader === 'string' && secretHeader) {
    token = secretHeader.trim();
  } else if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Verify secret token
  if (!token || token !== env.masterInternalSecret) {
    // Return 404 Not Found so public users and automated scanners cannot detect route existence
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Verify IP allowlist if configured
  if (env.masterAllowedIps) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    const allowed = env.masterAllowedIps
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    const isLoopback = clientIp.includes('127.0.0.1') || clientIp.includes('::1');
    if (allowed.length > 0 && !allowed.includes(clientIp) && !isLoopback) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
  }

  (req as any).isMaster = true;
  (req as any).apiTier = 'master_internal';
  next();
}
