import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { BUSINESS } from '../../config/business';

/**
 * ComplianceController — Handles GDPR / CCPA cookie consent logging and user rights.
 */

export async function recordConsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { consentType, granted, preferences } = req.body as {
      consentType?: string;
      granted?: boolean;
      preferences?: {
        essential?: boolean;
        analytics?: boolean;
        preferences?: boolean;
      };
    };

    const validTypes = ['cookie_preferences', 'photo_processing', 'marketing'];
    const type = consentType && validTypes.includes(consentType) ? consentType : 'cookie_preferences';

    const userId = req.userId || null;
    const ipHash = req.ip
      ? crypto.createHash('sha256').update(req.ip).digest('hex')
      : null;
    const userAgent = req.headers['user-agent'] || null;

    await prisma.consentRecord.create({
      data: {
        userId,
        consentType: type,
        policyVersion: BUSINESS.policies.version,
        ipHash,
        userAgent: preferences ? `${userAgent || ''} | prefs:${JSON.stringify(preferences)}` : userAgent,
      },
    });

    res.json({ success: true, recorded: true });
  } catch (err) {
    next(err);
  }
}
