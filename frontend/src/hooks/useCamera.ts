import { useState, useRef, useCallback, useEffect } from 'react';

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  thumbnailUrl: string;
  capturedAt: Date;
}

export interface CameraState {
  isSupported: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  isStreaming: boolean;
  error: string | null;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraState: CameraState;
  capturedPhotos: CapturedPhoto[];
  requestCamera: () => Promise<void>;
  capturePhoto: () => CapturedPhoto | null;
  removePhoto: (id: string) => void;
  stopCamera: () => void;
}

/**
 * useCamera hook
 *
 * Manages camera stream lifecycle:
 * - Requests camera access ONLY when requestCamera() is explicitly called
 * - Prefers environment-facing (rear) camera
 * - Captures frames to canvas blobs
 * - Creates object URL thumbnails for preview
 * - Properly tears down stream on unmount
 */
export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>({
    isSupported: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    permissionState: 'prompt',
    isStreaming: false,
    error: null,
  });

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      // Revoke all thumbnail URLs to avoid memory leaks
      capturedPhotos.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState({
        isSupported: false,
        permissionState: 'unavailable',
        isStreaming: false,
        error:
          'Camera access is unavailable on this device or browser. ' +
          'You can upload photos instead.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState({
        isSupported: true,
        permissionState: 'granted',
        isStreaming: true,
        error: null,
      });
    } catch (err) {
      const isDenied =
        err instanceof Error &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      setCameraState({
        isSupported: true,
        permissionState: isDenied ? 'denied' : 'unavailable',
        isStreaming: false,
        error: isDenied
          ? 'Camera permission was denied. You can upload photos instead.'
          : 'Camera is unavailable. It may be in use by another application.',
      });
    }
  }, []);

  const capturePhoto = useCallback((): CapturedPhoto | null => {
    const video = videoRef.current;
    if (!video || !cameraState.isStreaming) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    // Use a typed callback to capture the blob
    let captured: CapturedPhoto | null = null;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const thumbnailUrl = URL.createObjectURL(blob);
        const photo: CapturedPhoto = {
          id,
          blob,
          thumbnailUrl,
          capturedAt: new Date(),
        };
        captured = photo;
        setCapturedPhotos((prev) => [...prev, photo]);
      },
      'image/jpeg',
      0.92 // 92% quality — good balance of size and fidelity
    );

    return captured;
  }, [cameraState.isStreaming]);

  const removePhoto = useCallback((id: string) => {
    setCapturedPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.thumbnailUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  return {
    videoRef,
    cameraState,
    capturedPhotos,
    requestCamera,
    capturePhoto,
    removePhoto,
    stopCamera,
  };
}
