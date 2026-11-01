import { Link } from 'react-router-dom';
import { BUSINESS } from '../../config/business';

/**
 * Terms of Service — /terms
 *
 * Outlines rights, limitations of AI/3D reconstruction, acceptable use, and business terms.
 */
export function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-sm prose-neutral">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Terms of Service</h1>
      <p className="text-xs text-neutral-400 mb-8">
        Effective date: {BUSINESS.policies.effectiveDate} · Version {BUSINESS.policies.version}
      </p>

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 mb-8 leading-relaxed">
        <strong>Important:</strong> These Terms of Service constitute a legally binding agreement between you and{' '}
        <strong>{BUSINESS.legalEntity}</strong> ("{BUSINESS.name}", "we", "us"). By creating an account, uploading
        photographs, or utilizing our REST API, you agree to these Terms. Placeholders marked in brackets indicate
        configurable terms subject to final legal review.
      </div>

      <h2>1. Service Overview</h2>
      <p>
        {BUSINESS.name} is a general-purpose AR creation platform that converts multi-angle 2D photographs into
        3D and Augmented Reality (AR) assets (including GLB, glTF, and USDZ formats). The platform is available
        to individual creators, businesses, and developers via our web interface and REST API.
      </p>

      <h2>2. Limitations of 3D Reconstruction & AI Processing</h2>
      <p>
        3D reconstruction from 2D photographs depends on lighting uniformity, surface texture, focal depth, and the number
        of angles captured (minimum {BUSINESS.limits.minImagesRecommended} recommended).
      </p>
      <ul>
        <li>
          <strong>No Absolute Accuracy Guarantee:</strong> While our pipeline applies subject segmentation and geometric reconstruction, we do not warrant that output models will achieve millimetric precision, physical scale accuracy without calibration markers, or photorealistic recreation on highly reflective, transparent, or textureless surfaces.
        </li>
        <li>
          <strong>Subject Segmentation:</strong> Automated foreground separation aims to isolate the intended dish or physical object from surrounding tables, floors, and environmental clutter. Segmentation boundaries may require manual angle adjustments in low-contrast conditions.
        </li>
      </ul>

      <h2>3. User Content & Intellectual Property</h2>
      <ul>
        <li>
          <strong>Your Content:</strong> You retain all ownership rights in the photographs you capture or upload. You represent and warrant that you hold all necessary licenses, permissions, and consents for any items or third-party property depicted in your photographs.
        </li>
        <li>
          <strong>Prohibited Content:</strong> You must not upload photographs of non-consenting persons, copyrighted works without authorization, weapons, illegal substances, or harassing/defamatory material.
        </li>
        <li>
          <strong>Generated Models:</strong> As between you and {BUSINESS.name}, you own the generated 3D assets produced from your authorized photographs, subject to your compliance with these Terms.
        </li>
      </ul>

      <h2>4. Acceptable Use & Restrictions</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Interfere with, disrupt, or place an unreasonable load on our servers, job queues, or storage infrastructure.</li>
        <li>Attempt to access another user's private AR jobs, input photographs, or API keys.</li>
        <li>Reverse-engineer, decompile, or attempt to derive source code from the reconstruction pipeline.</li>
        <li>Resell raw API generation access to competing services without a separate enterprise commercial agreement.</li>
      </ul>

      <h2>5. Subscriptions, Payments & Quotas</h2>
      <ul>
        <li>
          <strong>Free Trial:</strong> New accounts receive {BUSINESS.limits.trialGenerations} free generation attempts. Once exhausted, additional generations require an active subscription plan.
        </li>
        <li>
          <strong>AR Creator Plan:</strong> {BUSINESS.plans.webApp.displayPrice} for unlimited web application model creation.
        </li>
        <li>
          <strong>Developer API Plan:</strong> {BUSINESS.plans.developerApi.displayPrice} for REST API programmatic access with developer key management.
        </li>
        <li>
          <strong>Billing & Cancellations:</strong> Billed monthly via Stripe. You can cancel at any time via the Customer Portal. Cancellation takes effect at the end of the current billing cycle. Refunds are governed by our <Link to="/refunds">Refund Policy</Link>.
        </li>
      </ul>

      <h2>6. Developer API & Key Security</h2>
      <p>
        API keys grant programmatic access to your account allowance. You are solely responsible for securing your keys.
        Never commit API keys to client-side public repositories or browser code. If an API key is compromised, revoke it
        immediately from the API dashboard.
      </p>

      <h2>7. AR Compatibility & Device Dependencies</h2>
      <p>
        Augmented Reality features rely on native operating system viewers (Apple Quick Look for iOS Safari, Google Scene Viewer
        for Android Chrome, and WebXR for compatible browsers). We do not guarantee AR projection compatibility on unsupported
        devices or obsolete browser versions. When AR is not supported by a device, the interactive 3D WebGL viewer is presented.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BUSINESS.name} AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR
        IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </p>

      <h2>9. Account Termination</h2>
      <p>
        You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate our
        acceptable use rules, engage in fraudulent payment activity, or compromise platform security.
      </p>

      <h2>10. Governing Law & Dispute Resolution</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of <strong>[GOVERNING LAW / JURISDICTION]</strong>,
        without regard to its conflict of law provisions.
      </p>

      <h2>11. Contact</h2>
      <p>
        Inquiries regarding these Terms should be directed to{' '}
        <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a> or by mail to{' '}
        <strong>{BUSINESS.legalEntity}</strong> at [BUSINESS PHYSICAL ADDRESS].
      </p>
    </article>
  );
}
