import React, { useState, useEffect, useCallback } from 'react';
import { X, Circle } from 'lucide-react';
import { useCamera, type CapturedPhoto } from '../../hooks/useCamera';
import { UploadFallback } from './UploadFallback';
import { BUSINESS } from '../../config/business';

interface CameraViewProps {
  onPhotosReady: (photos: CapturedPhoto[]) => void;
  onBack: () => void;
}

/**
 * CameraView — the full capture experience.
 *
 * Modes:
 * 1. Camera mode (default when permission granted)
 * 2. Upload fallback (permission denied, device has no camera, or user opts for upload)
 *
 * UI:
 * - Full-bleed video preview
 * - Minimal overlay: instruction text + count indicator
 * - Bottom thumbnail tray (scrollable, does not cover subject)
 * - Large shutter button (thumb-friendly)
 * - Advisory when below minimum recommended count
 */
export function CameraView({ onPhotosReady, onBack }: CameraViewProps) {
  const {
    videoRef,
    cameraState,
    capturedPhotos,
    requestCamera,
    capturePhoto,
    removePhoto,
    stopCamera,
  } = useCamera();

  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [uploadPhotos, setUploadPhotos] = useState<CapturedPhoto[]>([]);

  const allPhotos = mode === 'camera' ? capturedPhotos : uploadPhotos;
  const count = allPhotos.length;
  const min = BUSINESS.limits.minImagesRecommended;
  const max = BUSINESS.limits.maxImagesPerJob;

  // Start camera on mount — only if camera mode
  useEffect(() => {
    if (mode === 'camera') {
      void requestCamera();
    }
    return () => {
      if (mode === 'camera') stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // If permission denied → switch to upload fallback automatically
  useEffect(() => {
    if (cameraState.permissionState === 'denied' || !cameraState.isSupported) {
      setMode('upload');
    }
  }, [cameraState.permissionState, cameraState.isSupported]);

  const handleCapture = useCallback(() => {
    if (count >= max) return;
    capturePhoto();
  }, [capturePhoto, count, max]);

  const handleDone = () => {
    if (count === 0) return;
    onPhotosReady(allPhotos);
  };

  const handleUploadPhotosAdded = (newPhotos: CapturedPhoto[]) => {
    setUploadPhotos((prev) => [...prev, ...newPhotos].slice(0, max));
  };

  const handleUploadRemove = (id: string) => {
    setUploadPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.thumbnailUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col">
      {/* ─── Camera / Upload area ─── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Camera preview */}
        {mode === 'camera' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              aria-label="Camera viewfinder"
            />

            {/* Permission / error overlay */}
            {!cameraState.isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                {cameraState.permissionState === 'denied' ? (
                  <>
                    <p className="text-white font-medium mb-2">
                      Camera permission denied
                    </p>
                    <p className="text-neutral-400 text-sm mb-6">
                      {cameraState.error}
                    </p>
                    <button
                      onClick={() => setMode('upload')}
                      className="btn-primary"
                    >
                      Upload photos instead
                    </button>
                  </>
                ) : (
                  <div className="text-neutral-400 text-sm">
                    Starting camera…
                  </div>
                )}
              </div>
            )}

            {/* Instruction overlay — shown when streaming */}
            {cameraState.isStreaming && (
              <div className="absolute top-0 left-0 right-0 px-4 pt-4 pb-3
                              bg-gradient-to-b from-neutral-950/60 to-transparent
                              pointer-events-none">
                <p className="text-white text-sm font-medium text-center">
                  Take photos from all angles.{' '}
                  <span className="text-neutral-300">
                    {min} photos minimum recommended.
                  </span>
                </p>
                <p className="text-neutral-400 text-xs text-center mt-0.5">
                  Move around the object and capture different viewpoints.
                </p>
              </div>
            )}
          </>
        )}

        {/* Upload fallback mode */}
        {mode === 'upload' && (
          <div className="absolute inset-0 flex flex-col overflow-y-auto">
            <div className="flex-1 bg-white p-4 m-4 rounded-lg">
              {cameraState.error && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700">
                  {cameraState.error}
                </div>
              )}
              <h2 className="text-sm font-semibold text-neutral-900 mb-1">
                Upload photos
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                {min} photos minimum recommended, from different angles around the object.
              </p>
              <UploadFallback
                photos={uploadPhotos}
                onPhotosAdded={handleUploadPhotosAdded}
                onRemove={handleUploadRemove}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Thumbnail tray + controls ─── */}
      <div className="bg-neutral-950 safe-area-pb flex-shrink-0">

        {/* Thumbnail strip */}
        {count > 0 && mode === 'camera' && (
          <div
            className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none"
            aria-label="Captured photos"
            role="list"
          >
            {capturedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-neutral-800 group"
                role="listitem"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute inset-0 flex items-center justify-center
                             bg-neutral-900/60 opacity-0 group-hover:opacity-100
                             focus-visible:opacity-100 transition-opacity"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X className="w-4 h-4 text-white" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-4 gap-4">

          {/* Back */}
          <button
            onClick={onBack}
            className="text-neutral-400 hover:text-white text-sm transition-colors min-w-16"
            aria-label="Go back"
          >
            Back
          </button>

          {/* Shutter / Upload toggle */}
          <div className="flex flex-col items-center gap-2">
            {mode === 'camera' && cameraState.isStreaming && (
              <button
                onClick={handleCapture}
                disabled={count >= max}
                className="w-16 h-16 rounded-full border-4 border-white bg-transparent
                           flex items-center justify-center
                           hover:bg-white/10 active:bg-white/20
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Capture photo"
              >
                <Circle
                  className="w-8 h-8 text-white fill-white"
                  aria-hidden="true"
                />
              </button>
            )}

            {/* Count indicator */}
            <span className="text-xs text-neutral-400" aria-live="polite">
              {count} / {min}
              {count >= min && <span className="ml-1 text-green-400 font-mono text-[10px]">OK</span>}
            </span>
          </div>

          {/* Done */}
          <button
            onClick={handleDone}
            disabled={count === 0}
            className={`text-sm font-medium min-w-16 text-right transition-colors
              ${count >= min
                ? 'text-white hover:text-neutral-300'
                : count > 0
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-600 cursor-not-allowed'
              }`}
            aria-label={
              count === 0
                ? 'Take at least one photo to continue'
                : count < min
                ? `Continue with ${count} photo${count > 1 ? 's' : ''} (${min - count} more recommended)`
                : 'Done: continue to generation'
            }
          >
            Done
            {count > 0 && count < min && (
              <span className="block text-xs text-amber-400 font-normal mt-0.5">
                {min - count} more recommended
              </span>
            )}
          </button>
        </div>

        {/* Switch mode link */}
        <div className="pb-3 text-center">
          {mode === 'camera' && cameraState.isStreaming && (
            <button
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Upload photos instead
            </button>
          )}
          {mode === 'upload' && cameraState.isSupported && cameraState.permissionState !== 'denied' && (
            <button
              onClick={() => setMode('camera')}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Use camera instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
