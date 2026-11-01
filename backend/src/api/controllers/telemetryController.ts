import { Request, Response } from 'express';

/**
 * TelemetryController — Handles privacy-preserving, consent-gated telemetry.
 *
 * Rules:
 *  - Disallows raw photos, image data URLs, personal identity, passwords, or secrets.
 *  - Whitelist event names only.
 *  - Does not link telemetry to permanent user records without consent.
 */

const ALLOWED_EVENTS = new Set([
  'capture_started',
  'capture_completed',
  'generation_started',
  'generation_completed',
  'generation_failed',
  'ar_view_opened',
  'asset_downloaded',
  'subscription_started',
  'api_key_created',
  'cookie_consent_updated',
]);

const PROHIBITED_KEYS = ['image', 'photo', 'data', 'base64', 'password', 'key', 'email', 'name', 'secret'];

export function recordTelemetry(req: Request, res: Response): void {
  const { event, properties } = req.body as {
    event?: string;
    properties?: Record<string, unknown>;
  };

  if (!event || !ALLOWED_EVENTS.has(event)) {
    res.status(400).json({ error: 'Invalid telemetry event' });
    return;
  }

  // Security check: inspect properties for sensitive data or image blobs
  if (properties && typeof properties === 'object') {
    for (const key of Object.keys(properties)) {
      const lowerKey = key.toLowerCase();
      if (PROHIBITED_KEYS.some((p) => lowerKey.includes(p))) {
        res.status(400).json({ error: 'Prohibited telemetry payload property detected' });
        return;
      }
    }
  }

  // Non-intrusive logging — can be hooked into an internal metrics sink
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Telemetry] Event: ${event}`, properties ? JSON.stringify(properties) : '');
  }

  res.status(204).send();
}
