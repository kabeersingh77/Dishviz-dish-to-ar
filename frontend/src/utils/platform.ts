/**
 * Platform detection utilities for AR launch.
 * Used to show the correct AR button variant per device/browser.
 */

export type ARPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface PlatformInfo {
  platform: ARPlatform;
  supportsQuickLook: boolean;    // iOS Safari only
  supportsSceneViewer: boolean;  // Android Chrome only
  supportsWebXR: boolean;        // Modern browsers with WebXR API
}

export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);

  // Quick Look requires iOS + Safari
  const supportsQuickLook = isIOS && isSafari;

  // Scene Viewer requires Android + Chrome (or WebView)
  const supportsSceneViewer = isAndroid && /Chrome|SamsungBrowser/.test(ua);

  // WebXR — check API presence
  const supportsWebXR =
    typeof navigator !== 'undefined' &&
    'xr' in navigator &&
    typeof (navigator as Navigator & { xr?: { isSessionSupported?: unknown } }).xr?.isSessionSupported === 'function';

  const platform: ARPlatform = isIOS
    ? 'ios'
    : isAndroid
    ? 'android'
    : 'desktop';

  return { platform, supportsQuickLook, supportsSceneViewer, supportsWebXR };
}

/**
 * Build Android Scene Viewer intent URL.
 * Reference: https://developers.google.com/ar/develop/scene-viewer
 */
export function buildSceneViewerUrl(glbUrl: string): string {
  const params = new URLSearchParams({
    file: glbUrl,
    mode: 'ar_preferred',
    enable_vertical_placement: 'false',
    disable_occlusion: 'false',
  });
  // Deep link opens Scene Viewer; fallback to Play Store if not installed
  return `intent://arvr.google.com/scene-viewer/1.2?${params.toString()}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=https://developers.google.com/ar;end;`;
}
