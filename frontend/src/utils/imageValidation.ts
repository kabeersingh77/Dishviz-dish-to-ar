/**
 * Image quality validation utilities.
 * Runs client-side before upload to give early feedback.
 * Server-side validation is also applied — this is a UX aid, not a security gate.
 */

export interface ValidationResult {
  valid: boolean;
  /** Advisory warnings — do not block unless hard limit exceeded */
  warnings: string[];
  /** Hard errors — must be resolved before upload */
  errors: string[];
}

export interface ImageAnalysis {
  file: File;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  /** 0–255 mean luminance */
  meanLuminance: number;
  /** Laplacian variance — low value suggests blur */
  blurScore: number;
  /** Perceptual hash for near-duplicate detection */
  pHash: string;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const BLUR_THRESHOLD = 80;          // Laplacian variance below this → likely blurry
const DARK_THRESHOLD = 40;          // Mean luma below this → too dark
const DUPLICATE_HASH_DISTANCE = 8; // Hamming distance for near-duplicate detection

// ─── Per-file validation ──────────────────────────────────────────────────

export function validateFileType(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return `"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`;
  }
  return null;
}

export function validateFileSize(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 15 MB.`;
  }
  return null;
}

export function validateFileSizeByName(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `"${file.name}" is too large (${mb} MB). Maximum is 15 MB.`;
  }
  return null;
}

// ─── Canvas-based analysis ───────────────────────────────────────────────

/**
 * Loads an image blob into an offscreen canvas and analyses:
 * - Dimensions
 * - Mean luminance (brightness)
 * - Blur score (Laplacian variance approximation)
 * - Perceptual hash (8x8 DCT-based pHash)
 */
export async function analyseImage(file: File | Blob): Promise<Omit<ImageAnalysis, 'file'>> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { naturalWidth: width, naturalHeight: height } = img;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, width, height);

      // Mean luminance
      let totalLuma = 0;
      for (let i = 0; i < data.length; i += 4) {
        // BT.601 luma
        totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const meanLuminance = totalLuma / (data.length / 4);

      // Blur via Laplacian approximation on a downscaled version
      const blurScore = estimateBlur(ctx, width, height);

      // 8x8 pHash
      const pHash = computePHash(ctx, width, height);

      resolve({
        blob: file,
        width,
        height,
        sizeBytes: file instanceof File ? file.size : file.size,
        meanLuminance,
        blurScore,
        pHash,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be loaded'));
    };

    img.src = url;
  });
}

function estimateBlur(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  // Downsample to 64×64 for speed
  const size = 64;
  const small = document.createElement('canvas');
  small.width = size;
  small.height = size;
  const sCtx = small.getContext('2d')!;
  sCtx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, size, size);
  const { data } = sCtx.getImageData(0, 0, size, size);

  // Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Laplacian kernel: [0,1,0,1,-4,1,0,1,0]
  let variance = 0;
  let count = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const lap =
        gray[idx - size] +
        gray[idx + size] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];
      variance += lap * lap;
      count++;
    }
  }

  return count > 0 ? variance / count : 0;
}

function computePHash(ctx: CanvasRenderingContext2D, w: number, h: number): string {
  const size = 32;
  const small = document.createElement('canvas');
  small.width = size;
  small.height = size;
  const sCtx = small.getContext('2d')!;
  sCtx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, size, size);
  const { data } = sCtx.getImageData(0, 0, size, size);

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  const bits = gray.map((v) => (v >= mean ? '1' : '0')).join('');

  // Pack bits into hex string
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const av = parseInt(a[i], 16);
    const bv = parseInt(b[i], 16);
    const xor = av ^ bv;
    dist += xor.toString(2).split('').filter((c) => c === '1').length;
  }
  return dist;
}

// ─── Batch validation ────────────────────────────────────────────────────

export interface BatchValidationResult {
  analyses: Array<ImageAnalysis & { warnings: string[] }>;
  globalWarnings: string[];
  errors: string[];
  canProceed: boolean;
}

export async function validateImageBatch(files: File[]): Promise<BatchValidationResult> {
  const errors: string[] = [];
  const globalWarnings: string[] = [];
  const analyses: Array<ImageAnalysis & { warnings: string[] }> = [];

  for (const file of files) {
    const typeError = validateFileType(file);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    const sizeError = validateFileSizeByName(file);
    if (sizeError) {
      errors.push(sizeError);
      continue;
    }

    try {
      const analysis = await analyseImage(file);
      const itemWarnings: string[] = [];

      if (analysis.width < MIN_WIDTH || analysis.height < MIN_HEIGHT) {
        itemWarnings.push(
          `"${file.name}" resolution is low (${analysis.width}×${analysis.height}). Minimum recommended: 640×480.`
        );
      }

      if (analysis.blurScore < BLUR_THRESHOLD) {
        itemWarnings.push(`"${file.name}" may be blurry. Try to hold steady when capturing.`);
      }

      if (analysis.meanLuminance < DARK_THRESHOLD) {
        itemWarnings.push(`"${file.name}" is quite dark. Better lighting improves 3D quality.`);
      }

      analyses.push({ file, ...analysis, warnings: itemWarnings });
    } catch {
      errors.push(`"${file.name}" could not be read. It may be corrupted.`);
    }
  }

  // Near-duplicate detection across batch
  const duplicatePairs: number[] = [];
  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      if (hammingDistance(analyses[i].pHash, analyses[j].pHash) <= DUPLICATE_HASH_DISTANCE) {
        if (!duplicatePairs.includes(j)) duplicatePairs.push(j);
      }
    }
  }
  if (duplicatePairs.length > 0) {
    globalWarnings.push(
      `${duplicatePairs.length} photo(s) appear very similar to others. Different angles improve 3D quality.`
    );
  }

  return {
    analyses,
    globalWarnings,
    errors,
    canProceed: errors.length === 0 && analyses.length > 0,
  };
}
