import { Link } from 'react-router-dom';
import { AlertTriangle, Zap } from 'lucide-react';

interface TrialUsageBarProps {
  generationsUsed: number;
  generationsTotal: number;
  generationsRemaining: number;
  canCreate: boolean;
}

/**
 * TrialUsageBar
 *
 * Shows a segmented progress bar for trial usage.
 * When quota is exhausted, shows an upgrade CTA instead of the bar.
 *
 * Rules:
 *  - Never shown for active paid subscribers (caller should gate it with isOnTrial)
 *  - Bar fills proportionally to usage
 *  - Colour shifts amber at 80%, red at 100%
 */
export function TrialUsageBar({
  generationsUsed,
  generationsTotal,
  generationsRemaining,
  canCreate,
}: TrialUsageBarProps) {
  const pct = generationsTotal > 0 ? Math.min(1, generationsUsed / generationsTotal) : 0;
  const pctDisplay = Math.round(pct * 100);

  const barColor =
    pct >= 1
      ? 'bg-red-500'
      : pct >= 0.8
      ? 'bg-amber-500'
      : 'bg-sky-500';

  if (!canCreate) {
    return (
      <div className="card p-5 border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">
              Trial limit reached
            </p>
            <p className="text-xs text-amber-700 mb-3">
              You've used all {generationsTotal} free trial generations. Upgrade to continue creating AR models.
            </p>
            <Link to="/pricing" className="btn-primary text-xs px-3 py-1.5 gap-1.5">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Upgrade to continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-700">Free trial</span>
        <span className="text-xs text-neutral-500">
          {generationsRemaining} of {generationsTotal} remaining
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={generationsTotal}
        aria-valuenow={generationsUsed}
        aria-label={`${generationsUsed} of ${generationsTotal} trial generations used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pctDisplay}%` }}
        />
      </div>

      {pct >= 0.8 && pct < 1 && (
        <p className="text-xs text-amber-600 mt-2">
          Running low.{' '}
          <Link to="/pricing" className="underline font-medium">Upgrade</Link>{' '}
          to keep creating.
        </p>
      )}

      {pct < 0.8 && (
        <p className="text-xs text-neutral-400 mt-2">
          <Link to="/pricing" className="underline hover:text-neutral-600 transition-colors">View plans</Link>
          {' '}to unlock unlimited generations.
        </p>
      )}
    </div>
  );
}
