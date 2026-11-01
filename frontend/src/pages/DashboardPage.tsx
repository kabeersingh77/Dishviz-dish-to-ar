import { Link } from 'react-router-dom';
import { Plus, History, Key, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TrialUsageBar } from '../components/usage/TrialUsageBar';

export function DashboardPage() {
  const { user, trial, subscription, me } = useAuth();

  // Derive canCreate and isOnTrial from auth context (backed by /me response)
  const canCreate = me?.canCreate ?? true;
  const isOnTrial = me?.isOnTrial ?? true;
  const isActive =
    subscription !== null &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-1">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Welcome back{user?.name ? `, ${user.name}` : ''}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* ─── Main action ─── */}
        <div className="space-y-4">

          {/* Trial usage bar — only for users without active subscription */}
          {isOnTrial && trial && (
            <TrialUsageBar
              generationsUsed={trial.generationsUsed}
              generationsTotal={trial.generationsTotal}
              generationsRemaining={trial.generationsRemaining}
              canCreate={canCreate}
            />
          )}

          {/* Create CTA */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1">Create an AR model</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Photograph an object from multiple angles. We'll process and generate a 3D model you can view in AR.
            </p>
            {canCreate ? (
              <Link to="/create" className="btn-primary gap-2 inline-flex">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Start new model
              </Link>
            ) : (
              <div>
                <button
                  disabled
                  className="btn-primary gap-2 inline-flex opacity-50 cursor-not-allowed"
                  title="Upgrade to create more models"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Start new model
                </button>
                <p className="text-xs text-neutral-500 mt-2">
                  <Link to="/pricing" className="underline font-medium text-neutral-700">Upgrade your plan</Link>{' '}
                  to continue creating models.
                </p>
              </div>
            )}
          </div>

          {/* Recent history shortcut */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Recent models</h2>
              <Link
                to="/dashboard/history"
                className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                View all →
              </Link>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              All your generated AR assets are saved in your history.
            </p>
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-4">
          {/* Subscription status */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Plan
            </p>
            {isActive && subscription ? (
              <>
                <p className="text-sm font-semibold text-neutral-900">
                  {subscription.plan === 'web_app' ? 'AR Creator' : 'Developer API'}
                </p>
                <p className="text-xs text-neutral-500 capitalize mt-0.5">{subscription.status}</p>
                <Link
                  to="/dashboard/billing"
                  className="text-xs underline text-neutral-500 hover:text-neutral-800 transition-colors mt-2 block"
                >
                  Manage billing
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-neutral-900">Free trial</p>
                {trial && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {trial.generationsRemaining} generation{trial.generationsRemaining !== 1 ? 's' : ''} remaining
                  </p>
                )}
                <Link to="/pricing" className="text-xs underline text-neutral-500 hover:text-neutral-800 transition-colors mt-2 block">
                  Upgrade plan
                </Link>
              </>
            )}
          </div>

          {/* Quick nav */}
          <nav aria-label="Dashboard navigation">
            <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
              {[
                { to: '/dashboard/history', label: 'AR History', Icon: History },
                { to: '/dashboard/api', label: 'API Keys', Icon: Key },
                { to: '/dashboard/billing', label: 'Billing', Icon: CreditCard },
              ].map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-neutral-50 transition-colors text-sm text-neutral-700"
                  >
                    <Icon className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Privacy & Account Deletion */}
          <div className="card p-5 border-neutral-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Privacy & Data
            </p>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              In accordance with GDPR & CCPA right to erasure, you can permanently delete your account and all associated photographs and 3D assets.
            </p>
            <button
              onClick={async () => {
                const confirmed = window.confirm(
                  'Are you sure you want to permanently delete your account? This action cannot be undone and will immediately erase all your photos, 3D models, API keys, and active subscriptions.'
                );
                if (!confirmed) return;

                try {
                  const res = await fetch('/api/v1/auth/me', {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  if (res.ok) {
                    alert('Your account and data have been permanently deleted.');
                    window.location.href = '/';
                  } else {
                    alert('Could not delete account. Please try again or contact support.');
                  }
                } catch {
                  alert('Network error. Please try again.');
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium"
            >
              Delete account & erase data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

