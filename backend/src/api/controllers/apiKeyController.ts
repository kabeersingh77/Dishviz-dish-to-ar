import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import { generateApiKey } from '../../security/apiKeys';
import { BUSINESS } from '../../config/business';

// ─── List Keys ────────────────────────────────────────────────────────────────

export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;
    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ keys });
  } catch (err) {
    next(err);
  }
}

// ─── Create Key ───────────────────────────────────────────────────────────────

export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'A name for the API key is required.' });
      return;
    }

    if (name.trim().length > 64) {
      res.status(400).json({ error: 'Key name must be 64 characters or fewer.' });
      return;
    }

    // Enforce per-user key cap
    const existingCount = await prisma.apiKey.count({
      where: { userId, revokedAt: null },
    });

    if (existingCount >= BUSINESS.limits.maxApiKeysPerUser) {
      res.status(400).json({
        error: `You can have at most ${BUSINESS.limits.maxApiKeysPerUser} active API keys. Revoke an existing key first.`,
        code: 'KEY_LIMIT_REACHED',
      });
      return;
    }

    const generated = generateApiKey('live');

    const key = await prisma.apiKey.create({
      data: {
        userId,
        name: name.trim(),
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
      },
    });

    // Return full key ONCE — it will never be retrievable again
    res.status(201).json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      revokedAt: null,
      // Only field returned once:
      fullKey: generated.fullKey,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Revoke Key ───────────────────────────────────────────────────────────────

export async function revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;
    const keyId = String(req.params.keyId);

    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!key) {
      res.status(404).json({ error: 'API key not found.' });
      return;
    }

    if (key.userId !== userId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (key.revokedAt) {
      res.status(400).json({ error: 'This key has already been revoked.' });
      return;
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Rename Key ───────────────────────────────────────────────────────────────

export async function renameApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;
    const keyId = String(req.params.keyId);
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'A name is required.' });
      return;
    }

    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!key) { res.status(404).json({ error: 'API key not found.' }); return; }
    if (key.userId !== userId) { res.status(403).json({ error: 'Access denied.' }); return; }
    if (key.revokedAt) { res.status(400).json({ error: 'Cannot rename a revoked key.' }); return; }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { name: name.trim() },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
