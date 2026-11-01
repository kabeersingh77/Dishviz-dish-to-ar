import { BUSINESS } from '../../config/business';

/**
 * Cookie Policy — /cookies
 *
 * Explains essential cookies, cookieless analytics, preference storage, and consent controls.
 */
export function CookiesPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-sm prose-neutral">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Cookie Policy</h1>
      <p className="text-xs text-neutral-400 mb-8">
        Effective date: {BUSINESS.policies.effectiveDate} · Version {BUSINESS.policies.version}
      </p>

      <p>
        This Cookie Policy explains how <strong>{BUSINESS.name}</strong> ("we", "us") uses cookies and
        similar client-side storage technologies when you visit our website, application, or developer portals.
      </p>

      <h2>1. What Are Cookies and Local Storage?</h2>
      <p>
        Cookies are small text files placed on your device by a web server. Local storage is a standard web browser
        feature allowing websites to store data locally within your browser. We use these technologies to maintain
        secure sign-in sessions and respect your privacy choices.
      </p>

      <h2>2. Categories of Technologies We Use</h2>

      <h3>Category A: Strictly Necessary Technologies (Always Active)</h3>
      <p>
        These technologies are indispensable for providing our core platform services. Without them, secure authentication
        and account management cannot operate. They do not store personally identifiable marketing information.
      </p>
      <div className="overflow-x-auto my-4">
        <table className="w-full text-xs text-left border border-neutral-200">
          <thead className="bg-neutral-100 text-neutral-800">
            <tr>
              <th className="p-2 border-b">Identifier</th>
              <th className="p-2 border-b">Type</th>
              <th className="p-2 border-b">Purpose</th>
              <th className="p-2 border-b">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-600">
            <tr>
              <td className="p-2 font-mono">token</td>
              <td className="p-2">httpOnly Cookie</td>
              <td className="p-2">Secures your authenticated user session. Inaccessible to client JavaScript to protect against XSS.</td>
              <td className="p-2">7 days</td>
            </tr>
            <tr>
              <td className="p-2 font-mono">objectar_cookie_consent_v1</td>
              <td className="p-2">Local Storage</td>
              <td className="p-2">Stores your cookie consent preferences so we do not prompt you on every page load.</td>
              <td className="p-2">Persistent</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Category B: Performance & Analytics (Consent-Gated)</h3>
      <p>
        We use minimal, cookieless telemetry to measure generation queue durations, model creation success rates, and device AR
        launch compatibility.
      </p>
      <ul>
        <li>
          <strong>No Cross-Site Tracking:</strong> We do not track your browsing activity across other websites.
        </li>
        <li>
          <strong>No Photo Data Sent:</strong> Telemetry payloads contain only high-level status events and never include your uploaded photos or personal identity.
        </li>
        <li>
          <strong>Consent Gated:</strong> Analytics are <em>disabled by default</em> and activated only if you click "Accept All" or toggle Analytics to "On" in your preferences.
        </li>
      </ul>

      <h3>Category C: Preferences & Display Settings</h3>
      <p>
        Used to remember UI adjustments, recent camera viewfinder settings, and accessibility options across browser sessions.
      </p>

      <h2>3. How to Manage or Withdraw Your Consent</h2>
      <p>
        You have complete control over non-essential technologies:
      </p>
      <ul>
        <li>
          <strong>Cookie Settings Modal:</strong> Click the <strong>Cookie Settings</strong> link located in the footer of any page on this site to change your preferences or revoke consent at any time.
        </li>
        <li>
          <strong>Browser Controls:</strong> Most web browsers allow you to block or delete cookies through browser settings. Note that deleting the <code>token</code> cookie will sign you out of your account.
        </li>
      </ul>

      <h2>4. Updates to This Policy</h2>
      <p>
        We may update this policy periodically to reflect operational, legal, or regulatory changes. Any updates will be posted
        here with a revised effective date.
      </p>

      <h2>5. Contact Us</h2>
      <p>
        If you have questions regarding our use of cookies or privacy practices, please contact our Privacy Desk at{' '}
        <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a>.
      </p>
    </article>
  );
}
