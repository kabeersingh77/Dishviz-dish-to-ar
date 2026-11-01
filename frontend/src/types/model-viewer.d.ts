/**
 * Type declarations for the @google/model-viewer web component.
 * model-viewer is loaded via CDN script tag in index.html.
 * This file allows TypeScript to understand <model-viewer> JSX usage.
 */

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & ModelViewerAttributes,
      HTMLElement
    >;
  }
}

interface ModelViewerAttributes {
  src?: string;
  'ios-src'?: string;
  alt?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'ar-scale'?: string;
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'auto-rotate-delay'?: number;
  'rotation-per-second'?: string;
  'environment-image'?: string;
  exposure?: number;
  'shadow-intensity'?: number;
  'shadow-softness'?: number;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'interaction' | 'manual';
  poster?: string;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  onError?: (e: Event) => void;
  onLoad?: (e: Event) => void;
  'ar-status'?: string;
}
