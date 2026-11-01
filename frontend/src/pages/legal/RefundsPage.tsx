import { Link } from 'react-router-dom';
import { BUSINESS } from '../../config/business';

/**
 * Refund Policy — /refunds
 *
 * Explains cancellation rules, credit adjustments for failed generations, and statutory rights.
 */
export function RefundsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-sm prose-neutral">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Refund Policy</h1>
      <p className="text-xs text-neutral-400 mb-8">
        Effective date: {BUSINESS.policies.effectiveDate} · Version {BUSINESS.policies.version}
      </p>

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 mb-8 leading-relaxed">
        <strong>Overview:</strong> This policy outlines the refund and cancellation procedures for{' '}
        <strong>{BUSINESS.name}</strong> ({BUSINESS.legalEntity}). We strive for fair and transparent billing
        while maintaining reasonable operational cost controls for computationally intensive 3D reconstruction.
      </div>

      <h2>1. Subscription Cancellations</h2>
      <p>
        You can cancel your subscription at any time directly through the <strong>Billing Dashboard</strong> via the
        Stripe Customer Portal.
      </p>
      <ul>
        <li>Cancellation takes effect immediately at the end of your current monthly billing period.</li>
        <li>You will maintain full access to your account and model creation benefits until the billing period concludes.</li>
        <li>We do not charge cancellation or early-termination fees.</li>
      </ul>

      <h2>2. Refund Eligibility & Unused Billing Periods</h2>
      <p>
        Because server capacity and GPU computation are provisioned upon subscription activation, monthly subscription fees
        are generally non-refundable for partial or unused billing periods, except where mandatory consumer protection laws apply.
      </p>
      <p>
        If you experience an accidental duplicate charge or unexpected billing anomaly, contact our support team within
        <strong> 14 days</strong> of the transaction for prompt review and resolution.
      </p>

      <h2>3. Pay-As-You-Go Credits & Failed Reconstruction Guarantee</h2>
      <p>
        Dishviz charges a transparent \$1.50 per completed 3D reconstruction from your credit balance:
      </p>
      <ul>
        <li>
          <strong>Automatic Failure Refund Guarantee:</strong> If an AR generation fails due to pipeline errors, segmentation failure, view incoherence, or server timeout (resulting in status <code>failed</code>), the \$1.50 charge is <strong>instantly refunded in full</strong> back to your Credit Ledger by the system.
        </li>
        <li>
          <strong>Ledger Transparency:</strong> Every credit deduction and automatic refund is recorded as an immutable ledger transaction visible in your Billing Dashboard.
        </li>
        <li>
          <strong>Pre-Paid Credit Balances:</strong> Pre-paid credits (\$100, \$250, \$500, or Custom tiers) never expire. Unused credit balances may be refunded back to the original payment method upon written request within 30 days of purchase if no generations have been initiated.
        </li>
      </ul>

      <h2>4. Major Service Outages</h2>
      <p>
        If our platform experiences continuous, unscheduled downtime exceeding 24 consecutive hours attributable solely to
        our infrastructure, active subscribers may request a prorated service credit toward their next billing statement.
      </p>

      <h2>5. How to Request Assistance</h2>
      <p>
        To submit a billing inquiry or refund request, please email our support desk at{' '}
        <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a> with:
      </p>
      <ol>
        <li>Your registered account email address.</li>
        <li>The transaction date and amount.</li>
        <li>A brief summary of the issue or Job ID (if related to a specific AR reconstruction).</li>
      </ol>
      <p>We aim to investigate and respond to all inquiries within <strong>3 to 5 business days</strong>.</p>

      <h2>6. Statutory Consumer Rights</h2>
      <p>
        Nothing in this Refund Policy restricts, limits, or modifies any statutory consumer guarantees or rights provided
        under applicable local legislation in your jurisdiction (including EU/UK statutory cooling-off rights where applicable).
      </p>
    </article>
  );
}
