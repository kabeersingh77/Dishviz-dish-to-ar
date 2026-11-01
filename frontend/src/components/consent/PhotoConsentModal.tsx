import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { BUSINESS } from '../../config/business';

interface PhotoConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * PhotoConsentModal
 *
 * Shown before the first photo is processed.
 * Checkbox is NOT pre-checked (required by consent guidelines).
 * Links to Privacy Policy and Terms.
 * Must be accepted before proceeding.
 */
export function PhotoConsentModal({ onAccept, onDecline }: PhotoConsentModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/60"
        onClick={onDecline}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-slide-up">
        <button
          onClick={onDecline}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <h2 id="consent-title" className="text-base font-semibold text-neutral-900 mb-3">
          How your photos are used
        </h2>

        <div className="text-sm text-neutral-600 space-y-3 mb-5">
          <p>
            Your photos are uploaded to our servers to generate your 3D and AR asset.
            Before reconstruction, we isolate the object from the background.
          </p>
          <p>
            We process your photos only to provide this service. Photos are retained for
            up to <strong>{BUSINESS.limits.trialGenerations > 0 ? `${30} days` : 'a limited period'}</strong> after
            which they are deleted, unless you request earlier deletion.
          </p>
          {/* Third-party disclosure — required */}
          <p>
            To generate your 3D model, your segmented images may be sent to a
            third-party AI reconstruction provider. This is documented in our{' '}
            <Link
              to="/privacy"
              className="text-accent-600 hover:text-accent-800 underline"
              target="_blank"
              rel="noopener"
            >
              Privacy Policy
            </Link>.
          </p>
          <p className="text-xs text-neutral-400">
            We do not use your photos to train AI models.
          </p>
        </div>

        {/* Consent checkbox — must not be pre-checked */}
        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-neutral-900 flex-shrink-0"
            aria-describedby="consent-description"
          />
          <span id="consent-description" className="text-sm text-neutral-700">
            I understand how my photos will be processed according to the{' '}
            <Link
              to="/privacy"
              className="text-accent-600 hover:text-accent-800 underline"
              target="_blank"
              rel="noopener"
            >
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link
              to="/terms"
              className="text-accent-600 hover:text-accent-800 underline"
              target="_blank"
              rel="noopener"
            >
              Terms of Service
            </Link>.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onAccept}
            disabled={!checked}
            className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={onDecline}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-neutral-400 text-center mt-3">
          You can request deletion of your photos at any time by contacting{' '}
          <a
            href={`mailto:${BUSINESS.privacyEmail}`}
            className="underline hover:no-underline"
          >
            {BUSINESS.privacyEmail}
          </a>.
        </p>
      </div>
    </div>
  );
}
