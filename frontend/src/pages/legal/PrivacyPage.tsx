import { BUSINESS } from '../../config/business';

/**
 * Privacy Policy — /privacy
 *
 * Designed for clear information hierarchy with configurable business placeholders.
 * Suitable for review by qualified legal counsel.
 */
export function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-sm prose-neutral">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Privacy Policy</h1>
      <p className="text-xs text-neutral-400 mb-8">
        Effective date: {BUSINESS.policies.effectiveDate} · Version {BUSINESS.policies.version}
      </p>

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 mb-8 leading-relaxed">
        <strong>Notice:</strong> This document describes the data practices of{' '}
        <strong>{BUSINESS.name}</strong> (<strong>{BUSINESS.legalEntity}</strong>). It outlines
        how personal information and uploaded photographs are processed across our web application,
        3D reconstruction engine, and REST API. Placeholders marked in brackets represent configurable
        corporate details subject to final legal review.
      </div>

      <h2>1. Information We Collect</h2>
      <p>We adhere to data minimization principles and collect only information required to operate the service:</p>
      <ul>
        <li>
          <strong>Account Information:</strong> Your email address, optional name, and a salted bcrypt cryptographic password hash. We never store or have access to plaintext passwords.
        </li>
        <li>
          <strong>Uploaded Photographs:</strong> Multi-angle photographs you upload to generate 3D/AR models. These are classified as private user content. We do not use customer photographs to train public artificial intelligence models without explicit, affirmative consent.
        </li>
        <li>
          <strong>Generated 3D Assets:</strong> Resulting GLB, glTF, USDZ, and thumbnail files produced by the reconstruction engine, linked to your account.
        </li>
        <li>
          <strong>API Credentials:</strong> Developer API keys are stored as irreversible SHA-256 hashes. Full keys are revealed exactly once upon creation.
        </li>
        <li>
          <strong>Technical Logs:</strong> Minimal server logs recording timestamp, HTTP method, status code, and hashed IP addresses to prevent abuse and enforce rate limits.
        </li>
      </ul>

      <h2>2. How We Process Photographs & AR Models</h2>
      <p>
        When you submit photos for 3D reconstruction, they pass through an asynchronous pipeline:
      </p>
      <ol>
        <li>
          <strong>Subject Segmentation:</strong> Algorithms distinguish the primary subject (e.g., dish, physical item, associated utensils) from background surfaces (floors, tables, incidental surroundings).
        </li>
        <li>
          <strong>Reconstruction:</strong> The segmented imagery is processed to compute mesh geometry, texture maps, and mobile-optimized AR files.
        </li>
        <li>
          <strong>Storage & Viewing:</strong> Generated assets are stored in private cloud storage. Viewing an existing asset retrieves pre-built files and never re-triggers generation processing.
        </li>
      </ol>

      <h2>3. Third-Party Processors</h2>
      <p>We work with trusted third-party service providers to deliver our infrastructure:</p>
      <ul>
        <li>
          <strong>Payment Processing:</strong> Stripe handles checkout and customer billing portal sessions. Credit card data is collected directly by Stripe under PCI-DSS compliance; our servers never touch full card numbers.
        </li>
        <li>
          <strong>Cloud Storage:</strong> Encrypted object storage (AWS S3-compatible or local isolated storage during development) for private image and asset storage.
        </li>
        <li>
          <strong>AI & 3D Providers:</strong> External reconstruction engines (such as Tripo3D or Meshy) when configured. Data transmitted is limited to the images required for asset generation.
        </li>
      </ul>

      <h2>4. Data Retention & Automatic Purging</h2>
      <ul>
        <li>
          <strong>Raw Uploaded Photographs:</strong> Retained for {BUSINESS.retention.rawPhotosDays} days to allow model refinement or troubleshooting, after which they are scheduled for permanent deletion.
        </li>
        <li>
          <strong>Generated 3D Assets:</strong> Retained in your account asset library for {BUSINESS.retention.generatedAssetsDays} days, or indefinitely while an active subscription is maintained.
        </li>
        <li>
          <strong>Deleted Accounts:</strong> When an account is deleted, all associated photographs, 3D models, database rows, and API keys are immediately and permanently erased from our primary databases.
        </li>
      </ul>

      <h2>5. Cookies & Analytics</h2>
      <p>
        We strictly distinguish essential technologies from optional analytics:
      </p>
      <ul>
        <li>
          <strong>Essential Cookies:</strong> An httpOnly session cookie (<code>token</code>) necessary for authentication and security. Cannot be disabled.
        </li>
        <li>
          <strong>Analytics Telemetry:</strong> Cookieless, privacy-preserving event tracking (e.g. generation counts) that is loaded <em>only after affirmative consent</em> via our Cookie Banner.
        </li>
      </ul>
      <p>
        You can adjust your preferences anytime via the <strong>Cookie Settings</strong> link in our footer.
      </p>

      <h2>6. Your Legal Rights (GDPR / CCPA)</h2>
      <p>Depending on your jurisdiction, you have statutory rights including:</p>
      <ul>
        <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong>Right to Rectification:</strong> Update or correct inaccurate account details.</li>
        <li><strong>Right to Erasure (Deletion):</strong> You can permanently delete your account and all associated assets at any time directly from your Dashboard under Privacy Settings or via <code>DELETE /api/v1/auth/me</code>.</li>
        <li><strong>Right to Withdraw Consent:</strong> Revoke cookie or marketing consent at any time without penalty.</li>
      </ul>

      <h2>7. Security Practices</h2>
      <p>
        We apply technical and organizational safeguards including TLS encryption in transit, cryptographic password hashing (bcrypt), SHA-256 API key hashing, signed time-limited asset download URLs, and rate limiting against brute-force attacks.
      </p>

      <h2>8. International Transfers & Governing Law</h2>
      <p>
        Data may be processed on servers located in jurisdictions where our cloud infrastructure resides. Processing complies with applicable cross-border transfer mechanisms. This policy is governed by the laws of <strong>[GOVERNING LAW JURISDICTION]</strong>.
      </p>

      <h2>9. Contact Information</h2>
      <p>
        For privacy questions, data requests, or regulatory inquiries, contact:
      </p>
      <div className="p-4 rounded-lg bg-neutral-50 text-xs space-y-1 font-mono text-neutral-700">
        <p><strong>Privacy Officer:</strong> {BUSINESS.privacyEmail}</p>
        <p><strong>Support:</strong> {BUSINESS.supportEmail}</p>
        <p><strong>Entity:</strong> {BUSINESS.legalEntity}</p>
        <p><strong>Address:</strong> [BUSINESS PHYSICAL ADDRESS, CITY, COUNTRY]</p>
      </div>
    </article>
  );
}
