import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/camera/CameraView';
import { PhotoConsentModal } from '../components/consent/PhotoConsentModal';
import { validateImageBatch } from '../utils/imageValidation';
import { jobs, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CapturedPhoto } from '../hooks/useCamera';
import type { SegmentationMode } from '../types/api';
import { BUSINESS } from '../config/business';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

type PageState =
  | 'consent'        // Show consent modal before camera
  | 'capture'        // Camera / upload UI
  | 'review'         // Validation warnings review
  | 'submitting'     // Uploading to backend
  | 'error';         // Upload/validation failed

/**
 * CreatePage — /create
 *
 * Orchestrates the full capture → consent → validate → submit flow.
 * Does NOT process images itself — all real processing happens backend.
 */
export function CreatePage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [pageState, setPageState] = useState<PageState>('consent');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [segmentationMode, setSegmentationMode] = useState<SegmentationMode>('smart');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const handleConsentAccepted = () => {
    setConsentGiven(true);
    setPageState('capture');
  };

  const handleConsentDeclined = () => {
    navigate('/');
  };

  const handlePhotosReady = useCallback(async (capturedPhotos: CapturedPhoto[]) => {
    setPhotos(capturedPhotos);

    // Run client-side validation
    const files = capturedPhotos.map((p) => {
      const file = new File([p.blob], `image_${p.id}.jpg`, { type: 'image/jpeg' });
      return file;
    });

    const result = await validateImageBatch(files);

    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      setValidationWarnings(result.globalWarnings);
      setPageState('review');
      return;
    }

    if (result.globalWarnings.length > 0 || result.analyses.some((a) => a.warnings.length > 0)) {
      const allWarnings = [
        ...result.globalWarnings,
        ...result.analyses.flatMap((a) => a.warnings),
      ];
      setValidationWarnings(allWarnings);
      setValidationErrors([]);
      setPageState('review');
      return;
    }

    // No warnings — proceed directly
    await submitJob(capturedPhotos);
  }, []);

  const submitJob = useCallback(async (photosToSubmit: CapturedPhoto[]) => {
    setPageState('submitting');
    setSubmitError(null);

    try {
      const blobs = photosToSubmit.map((p) => p.blob);
      const { jobId } = await jobs.create(blobs, {
        segmentationMode,
        consentGiven: true,
      });
      navigate(`/result/${jobId}`);
      // Refresh usage counts — non-blocking, dashboard quota bar updates on return
      void refreshUser();

    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Upload failed. Please check your connection and try again.';
      setSubmitError(message);
      setPageState('error');
    }
  }, [segmentationMode, navigate, refreshUser]);

  // ─── Render states ─────────────────────────────────────────────────────

  if (pageState === 'consent') {
    return (
      <PhotoConsentModal
        onAccept={handleConsentAccepted}
        onDecline={handleConsentDeclined}
      />
    );
  }

  if (pageState === 'capture') {
    return (
      <CameraView
        onPhotosReady={(p) => void handlePhotosReady(p)}
        onBack={() => navigate('/')}
      />
    );
  }

  if (pageState === 'review') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-base font-semibold text-neutral-900 mb-1">
                {validationErrors.length > 0
                  ? 'Some photos could not be used'
                  : 'Photo quality advisory'}
              </h1>
              <p className="text-sm text-neutral-500">
                {validationErrors.length > 0
                  ? 'Please remove the affected photos and try again.'
                  : 'These are advisories only: you can still continue. Better photos improve 3D quality.'}
              </p>
            </div>
          </div>

          {/* Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2 mb-4">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Warnings */}
          {validationWarnings.length > 0 && (
            <div className="space-y-2 mb-6">
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Segmentation mode selector */}
          <div className="border border-neutral-200 rounded-lg p-4 mb-6">
            <button
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="w-full flex items-center justify-between text-sm"
            >
              <span className="font-medium text-neutral-900">
                Segmentation mode:{' '}
                <span className="text-neutral-600 font-normal capitalize">{segmentationMode.replace('_', ' ')}</span>
              </span>
              {showModeSelector ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
              )}
            </button>
            {showModeSelector && (
              <div className="mt-3 space-y-2">
                {([
                  { value: 'smart', label: 'Smart (recommended)', desc: 'Auto-detects the main object and closely related items.' },
                  { value: 'dish_only', label: 'Object only', desc: 'Primary object only, no utensils or accessories.' },
                ] as const).map((opt) => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="segMode"
                      value={opt.value}
                      checked={segmentationMode === opt.value}
                      onChange={() => setSegmentationMode(opt.value)}
                      className="mt-0.5 accent-neutral-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900">{opt.label}</span>
                      <p className="text-xs text-neutral-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPageState('capture')}
              className="btn-secondary flex-1 justify-center"
            >
              Retake photos
            </button>
            {validationErrors.length === 0 && (
              <button
                onClick={() => void submitJob(photos)}
                className="btn-primary flex-1 justify-center"
              >
                Continue anyway
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Uploading photos…</p>
        <p className="text-xs text-neutral-400 max-w-xs text-center">
          {BUSINESS.limits.minImagesRecommended}+ photos recommended for best results.
          Processing will begin immediately on our servers.
        </p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold text-neutral-900 mb-2">Upload failed</p>
          <p className="text-sm text-neutral-500 mb-6">{submitError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setPageState('capture')} className="btn-secondary">
              Go back
            </button>
            <button onClick={() => void submitJob(photos)} className="btn-primary">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
