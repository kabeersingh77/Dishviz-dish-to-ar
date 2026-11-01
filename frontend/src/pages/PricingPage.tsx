import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BUSINESS } from '../config/business';
import { useAuth } from '../context/AuthContext';
import { billing, credits, ApiError } from '../api/client';
import { Check, AlertCircle, ShieldCheck, Zap } from 'lucide-react';

export function PricingPage() {
  const { isAuthenticated, subscription, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<'web_app' | 'developer_api' | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusParam = searchParams.get('status');

  async function handleTopUp(tierId: string) {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    setLoadingPlan(tierId);
    setError(null);
    setSuccess(null);

    try {
      const res = await credits.topUp({ tier: tierId });
      setSuccess(`Added $${res.amountAdded} in credits. New balance: $${res.newBalance.toFixed(2)}.`);
      await refreshUser();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Credit purchase failed. Please check your network.');
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleSubscribe(plan: 'web_app' | 'developer_api') {
    if (!isAuthenticated) {
      navigate(`/register?plan=${plan}`);
      return;
    }

    setLoadingPlan(plan);
    setError(null);

    try {
      const { checkoutUrl } = await billing.createCheckout(plan);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to initiate checkout. Please try again or contact support.'
      );
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div>
        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-1">
          Transparent Infrastructure Pricing
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Pay-As-You-Go Credits & Infrastructure Tiers
        </h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
          Zero subscriptions required for core generation. Pre-load credits at $1.50 per 3D reconstruction with an immutable failure refund guarantee.
        </p>
      </div>

      {statusParam === 'cancelled' && (
        <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 text-sm text-neutral-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <span>Checkout was cancelled. You have not been charged.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ─── Credit Packs ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Infrastructure Credit Packs</h2>
          <span className="text-xs font-mono text-neutral-500">$1.50 flat fee per completed 3D model</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {BUSINESS.credits.packs.map((pack) => (
            <div
              key={pack.id}
              className={`border rounded-md p-6 flex flex-col justify-between transition-colors ${
                pack.popular
                  ? 'border-neutral-900 bg-neutral-50 shadow-sm'
                  : 'border-neutral-200 bg-white shadow-sm'
              }`}
            >
              <div>
                {pack.popular && (
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 bg-neutral-900 text-white rounded mb-2 inline-block">
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-bold text-neutral-900">{pack.name}</h3>
                <div className="text-2xl font-bold font-mono text-neutral-900 mt-2">
                  ${pack.credits}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Yields approx. {pack.generations} AR 3D model reconstructions
                </p>

                <ul className="space-y-2 text-xs text-neutral-700 mt-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>Native volumetric 3D reconstruction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>GLB + USDZ binary exports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>100% automated refund if job fails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>Credits never expire</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => void handleTopUp(pack.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                    pack.popular
                      ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      : 'border border-neutral-300 hover:bg-neutral-100 text-neutral-900'
                  } disabled:opacity-50`}
                >
                  {loadingPlan === pack.id ? 'Processing...' : `Purchase ${pack.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Refund & Engine Guarantee ─── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-950">Clean Failure & Automatic Refund Guarantee</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              If an image set has insufficient angle overlap, low segmentation confidence, or the reconstruction pipeline encounters an error, the \$1.50 credit is automatically returned to your ledger balance. You are only charged for valid 3D assets.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Developer API Plans ─── */}
      <div className="space-y-4 pt-4 border-t border-neutral-200">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Developer API Plans (High-Volume Automation)</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            For platforms integrating Dishviz programmatically with dedicated concurrency and webhook dispatching.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Consumer plan */}
          <div className="bg-white border border-neutral-200 rounded-md p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 mb-1">
                {BUSINESS.plans.webApp.name}
              </h3>
              <p className="text-2xl font-bold font-mono text-neutral-900 mb-1">
                {BUSINESS.plans.webApp.displayPrice}
              </p>
              <p className="text-xs text-neutral-500 mb-5">
                For culinary teams and photographers capturing dishes from the web application.
              </p>
              <ul className="space-y-2 text-xs text-neutral-700 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Interactive 6 to 8 angle guided camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Culinary metadata & dietary classification</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Web and mobile QR AR launching</span>
                </li>
              </ul>
            </div>

            <div>
              {subscription?.plan === 'web_app' && subscription.status === 'active' ? (
                <Link to="/dashboard/billing" className="btn-secondary w-full justify-center text-xs py-2">
                  Current plan (Manage)
                </Link>
              ) : (
                <button
                  onClick={() => void handleSubscribe('web_app')}
                  disabled={loadingPlan !== null}
                  className="btn-primary w-full justify-center text-xs py-2"
                >
                  {loadingPlan === 'web_app'
                    ? 'Redirecting to checkout...'
                    : `Subscribe to ${BUSINESS.plans.webApp.name}`}
                </button>
              )}
            </div>
          </div>

          {/* Developer plan */}
          <div className="bg-white border border-neutral-200 rounded-md p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 mb-1">
                {BUSINESS.plans.developerApi.name}
              </h3>
              <p className="text-2xl font-bold font-mono text-neutral-900 mb-1">
                {BUSINESS.plans.developerApi.displayPrice}
              </p>
              <p className="text-xs text-neutral-500 mb-5">
                For software engineers integrating AR generation directly into food delivery and POS software.
              </p>
              <ul className="space-y-2 text-xs text-neutral-700 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Full REST API with idempotency keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Real-time webhook notifications on completion</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Private internal master key routing</span>
                </li>
              </ul>
            </div>

            <div>
              {subscription?.plan === 'developer_api' && subscription.status === 'active' ? (
                <Link to="/dashboard/billing" className="btn-secondary w-full justify-center text-xs py-2">
                  Current plan (Manage)
                </Link>
              ) : (
                <button
                  onClick={() => void handleSubscribe('developer_api')}
                  disabled={loadingPlan !== null}
                  className="btn-secondary w-full justify-center text-xs py-2"
                >
                  {loadingPlan === 'developer_api'
                    ? 'Redirecting to checkout...'
                    : `Subscribe to ${BUSINESS.plans.developerApi.name}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Honest notes */}
      <div className="border-t border-neutral-200 pt-8 space-y-2 text-xs text-neutral-500">
        <p>
          <strong className="text-neutral-700">3D Reconstruction Specs:</strong> Models are delivered in standard glTF 2.0 binary (.glb) and Universal Scene Description (.usdz) format. Quality is optimized by 6 to 8 multi-angle views with even lighting.
        </p>
        <p>
          <strong className="text-neutral-700">Audit & Refunds:</strong> Review full transaction details in your <Link to="/dashboard/billing" className="underline font-medium text-neutral-700">Credit Ledger</Link> or inspect our <Link to="/refunds" className="underline font-medium text-neutral-700">Refund Policy</Link>.
        </p>
      </div>
    </div>
  );
}
