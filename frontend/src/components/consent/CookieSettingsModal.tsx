import { useState, useEffect } from 'react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import { X, Shield, BarChart3, Sliders, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookieSettingsModal() {
  const { preferences, isSettingsOpen, closeSettings, savePreferences, acceptAll, rejectNonEssential } =
    useCookieConsent();

  const [analytics, setAnalytics] = useState(preferences.analytics);
  const [prefs, setPrefs] = useState(preferences.preferences);

  // Sync state with context when opened
  useEffect(() => {
    setAnalytics(preferences.analytics);
    setPrefs(preferences.preferences);
  }, [preferences, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  function handleSave() {
    savePreferences({
      analytics,
      preferences: prefs,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-settings-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neutral-700" />
            <h2 id="cookie-settings-title" className="text-base font-semibold text-neutral-900">
              Cookie & Privacy Preferences
            </h2>
          </div>
          <button
            onClick={closeSettings}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 text-sm text-neutral-600">
          <p className="text-xs text-neutral-500 leading-relaxed">
            We respect your right to privacy. Customize which categories of cookies and similar technologies
            you permit on this device. You can update these choices anytime from the Cookie Settings link in the footer.
            For full details, read our{' '}
            <Link to="/cookies" onClick={closeSettings} className="underline text-neutral-800 hover:text-neutral-950 inline-flex items-center gap-0.5">
              Cookie Policy <ExternalLink className="w-3 h-3" />
            </Link>.
          </p>

          {/* Strictly Necessary */}
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200/70">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 font-medium text-neutral-900">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Strictly Necessary</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                Always Active
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              Essential for authentication sessions, core security, and remembering photo processing consent.
              These cannot be disabled as the platform cannot function without them.
            </p>
          </div>

          {/* Analytics */}
          <div className="p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 font-medium text-neutral-900">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>Performance & Analytics</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              Cookieless, minimal telemetry tracking aggregate events like photo capture counts and 3D reconstruction success.
              Never collects photograph contents, URLs, or personal data.
            </p>
          </div>

          {/* Preferences */}
          <div className="p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 font-medium text-neutral-900">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>Preferences & Accessibility</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs}
                  onChange={(e) => setPrefs(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              Remembers UI layout choices, recent tool filters, and accessibility preferences between sessions.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={rejectNonEssential}
              className="btn-secondary text-xs px-3 py-1.5 flex-1 sm:flex-initial"
            >
              Reject All
            </button>
            <button
              onClick={acceptAll}
              className="btn-secondary text-xs px-3 py-1.5 flex-1 sm:flex-initial"
            >
              Accept All
            </button>
          </div>
          <button
            onClick={handleSave}
            className="btn-primary text-xs px-4 py-1.5 w-full sm:w-auto justify-center"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
