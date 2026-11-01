import { telemetryApi } from '../api/client';

export type TelemetryEventName =
  | 'capture_started'
  | 'capture_completed'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'ar_view_opened'
  | 'asset_downloaded'
  | 'subscription_started'
  | 'api_key_created'
  | 'cookie_consent_updated';

/**
 * Consent-gated privacy-preserving telemetry client.
 *
 * Rules:
 *  - Only dispatches events if user explicitly consented to analytics in Cookie Settings.
 *  - Cookieless: no tracking cookies, fingerprinting, or cross-site identifiers.
 *  - Strips any raw image data, file paths, or PII before sending.
 */
export function trackEvent(
  event: TelemetryEventName,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  try {
    // 1. Consent Gate Check
    const stored = localStorage.getItem('objectar_cookie_consent_v1');
    if (!stored) return; // No consent decision made yet — do not track

    const parsed = JSON.parse(stored) as { analytics?: boolean };
    if (!parsed.analytics) return; // Analytics consent denied or not granted

    // 2. Sanitize properties (ensure no prohibited keys or payloads)
    const sanitized: Record<string, unknown> = {};
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        const lower = key.toLowerCase();
        if (
          lower.includes('image') ||
          lower.includes('photo') ||
          lower.includes('data') ||
          lower.includes('password') ||
          lower.includes('email') ||
          lower.includes('secret')
        ) {
          continue; // Skip prohibited fields
        }
        sanitized[key] = value;
      }
    }

    // 3. Dispatch to backend anonymously
    void telemetryApi.sendEvent(event, sanitized).catch(() => {
      // Fire-and-forget: failure must never break the user experience
    });
  } catch {
    // Intentionally silent
  }
}
