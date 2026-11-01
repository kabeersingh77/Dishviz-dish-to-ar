import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { billing, credits, ApiError, type CreditBalanceResponse } from '../api/client';
import { CreditCard, ExternalLink, CheckCircle, AlertTriangle, ShieldCheck, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface LedgerItem {
  id: string;
  amount: number;
  type: string;
  jobId: string | null;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
}

export function DashboardBillingPage() {
  const { subscription, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credit state
  const [creditInfo, setCreditInfo] = useState<CreditBalanceResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [topupLoading, setTopupLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusParam = searchParams.get('status');

  const loadBillingData = async () => {
    try {
      const [balanceRes, ledgerRes] = await Promise.all([
        credits.getBalance(),
        credits.getLedger(50),
      ]);
      setCreditInfo(balanceRes);
      setLedger(ledgerRes.history);
    } catch (err: any) {
      console.warn('Failed to load credit details:', err);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  async function handleTopUp(tierId?: string, amount?: number) {
    setTopupLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = tierId ? { tier: tierId } : { amount };
      const res = await credits.topUp(payload);
      setSuccessMessage(`Successfully added $${res.amountAdded.toFixed(2)} in credits to your balance.`);
      setCustomAmount('');
      await loadBillingData();
      await refreshUser();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Top-up failed. Please check your network.');
    } finally {
      setTopupLoading(false);
    }
  }

  async function handleOpenPortal() {
    setLoadingPortal(true);
    setError(null);

    try {
      const { portalUrl } = await billing.createPortal();
      window.location.href = portalUrl;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not open billing portal. Please try again or contact support.'
      );
      setLoadingPortal(false);
    }
  }

  const isSubscribed =
    subscription !== null &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const balance = creditInfo?.balance ?? 0;
  const cost = creditInfo?.costPerGeneration ?? 1.50;
  const remaining = creditInfo?.generationsRemaining ?? Math.floor(balance / cost);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Infrastructure Billing & Credit Ledger
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Dishviz operates on transparent pay-as-you-go credit infrastructure. Pre-paid balance is billed at $1.50 per 3D reconstruction with an automated 100% refund guarantee on failure.
        </p>
      </div>

      {statusParam === 'success' && (
        <div className="p-4 rounded-md bg-green-50 border border-green-200 text-sm text-green-800 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Subscription confirmed</p>
            <p className="text-xs text-green-700 mt-0.5">
              Your developer subscription is active.
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Credits added</p>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ─── Credit Balance Overview ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-md p-5 shadow-sm">
          <div className="text-xs font-mono uppercase text-neutral-500 tracking-wider">Available Balance</div>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            ${balance.toFixed(2)}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Flat $1.50 per generation
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-5 shadow-sm">
          <div className="text-xs font-mono uppercase text-neutral-500 tracking-wider">Reconstructions Available</div>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {remaining} <span className="text-sm font-normal text-neutral-500">jobs</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            GLB and USDZ outputs included
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase text-neutral-500 tracking-wider">Failure Guarantee</div>
            <div className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> 100% Automated Refund
            </div>
          </div>
          <div className="text-[11px] text-neutral-500 mt-2">
            Failed reconstructions immediately credit back $1.50 to your ledger.
          </div>
        </div>
      </div>

      {/* ─── Top-Up Credit Packs ─── */}
      <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Purchase Infrastructure Credits</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Select a pre-paid credit tier or enter a custom amount ($100 minimum).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {creditInfo?.tiers.map((tier) => (
            <div
              key={tier.id}
              className={`border rounded-md p-4 flex flex-col justify-between transition-colors ${
                tier.popular ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div>
                {tier.popular && (
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 bg-neutral-900 text-white rounded mb-2 inline-block">
                    Recommended
                  </span>
                )}
                <div className="text-lg font-bold text-neutral-900">{tier.name}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Approx. {tier.generations} AR 3D model reconstructions
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => handleTopUp(tier.id)}
                  disabled={topupLoading}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                    tier.popular
                      ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      : 'border border-neutral-300 hover:bg-neutral-100 text-neutral-900'
                  } disabled:opacity-50`}
                >
                  {topupLoading ? 'Processing...' : `Add $${tier.credits}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom amount */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 text-sm">$</span>
            <input
              type="number"
              min="100"
              step="10"
              placeholder="Custom amount ($100 min)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const val = parseFloat(customAmount);
              if (isNaN(val) || val < 100) {
                setError('Minimum custom credit top-up is $100.');
                return;
              }
              handleTopUp(undefined, val);
            }}
            disabled={topupLoading || !customAmount}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 disabled:opacity-40 transition-colors"
          >
            Add Custom Credits
          </button>
        </div>
      </div>

      {/* ─── Real Transaction Audit Ledger ─── */}
      <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-500" />
              Credit Audit Ledger
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Immutable ledger entries documenting every charge, top-up, and automatic failure refund.
            </p>
          </div>
          <button
            type="button"
            onClick={loadBillingData}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Refresh
          </button>
        </div>

        {ledger.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-500">
            No transaction records found on this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-mono">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ledger.map((entry) => {
                  const isPositive = entry.amount > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 font-mono uppercase text-[10px] px-2 py-0.5 rounded border ${
                          entry.type === 'job_refund'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : entry.type === 'topup'
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-neutral-200 bg-neutral-100 text-neutral-700'
                        }`}>
                          {isPositive ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                          {entry.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 max-w-xs truncate">
                        {entry.description || 'Infrastructure transaction'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        isPositive ? 'text-emerald-700' : 'text-neutral-900'
                      }`}>
                        {isPositive ? `+$${entry.amount.toFixed(2)}` : `-$${Math.abs(entry.amount).toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                        ${entry.balanceAfter.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Stripe Portal & Enterprise Support ─── */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Invoices & Card Management</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Download PDF VAT tax invoices or manage payment cards through the Stripe Customer Portal.
          </p>
        </div>
        <button
          onClick={() => void handleOpenPortal()}
          disabled={loadingPortal}
          className="px-4 py-2 text-xs font-semibold rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-900 flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" />
          {loadingPortal ? 'Opening Portal...' : 'Manage Invoices on Stripe'}
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
