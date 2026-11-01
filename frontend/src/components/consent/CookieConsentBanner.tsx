import { useCookieConsent } from '../../context/CookieConsentContext';
import { Cookie, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookieConsentBanner() {
  const { hasAnswered, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();

  if (hasAnswered) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 animate-slide-up"
      role="region"
      aria-label="Cookie consent notice"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800 flex-shrink-0 mt-0.5">
          <Cookie className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
            <span>Your Privacy & Cookies</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </h3>
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
            We use strictly necessary cookies to keep you signed in. With your permission, we also use privacy-first,
            cookieless analytics to measure model generation quality. We never sell your data or use your photos for model training.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <button
            onClick={acceptAll}
            className="btn-primary text-xs px-3 py-1.5 flex-1 justify-center"
          >
            Accept All
          </button>
          <button
            onClick={rejectNonEssential}
            className="btn-secondary text-xs px-3 py-1.5 flex-1 justify-center"
          >
            Reject Non-Essential
          </button>
        </div>
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <button
            onClick={openSettings}
            className="text-neutral-500 hover:text-neutral-900 underline transition-colors"
          >
            Manage preferences
          </button>
          <Link
            to="/cookies"
            className="text-neutral-400 hover:text-neutral-700 underline transition-colors"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
