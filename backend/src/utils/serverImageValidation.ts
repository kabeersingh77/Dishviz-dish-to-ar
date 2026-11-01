import sharp from 'sharp';
import { BUSINESS } from '../config/business';


export interface ServerImageValidationResult {
  valid: boolean;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
  isDark: boolean;
  warnings: string[];
  errors: string[];
}

const ALLOWED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp']);

/**
 * Validates an image buffer on the server using Sharp.
 * Performs rigorous validation on file headers, dimensions, brightness, and format.
 */
export async function validateImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<ServerImageValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (buffer.length > BUSINESS.limits.maxFileSizeBytes) {
    errors.push(
      `File "${filename}" exceeds maximum allowed size of ${BUSINESS.limits.maxFileSizeBytes / 1024 / 1024}MB.`
    );
  }

  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format.toLowerCase())) {
      errors.push(`File "${filename}" has unsupported format: ${metadata.format || 'unknown'}. Allowed: JPEG, PNG, WebP.`);
      return {
        valid: false,
        width: 0,
        height: 0,
        format: metadata.format || 'unknown',
        sizeBytes: buffer.length,
        isDark: false,
        warnings,
        errors,
      };
    }

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width < BUSINESS.limits.minImageWidth || height < BUSINESS.limits.minImageHeight) {
      warnings.push(
        `File "${filename}" resolution (${width}x${height}) is below recommended (${BUSINESS.limits.minImageWidth}x${BUSINESS.limits.minImageHeight}).`
      );
    }

    // Fast luminance analysis via small grayscale downsample
    const stats = await sharp(buffer)
      .resize(64, 64, { fit: 'inside' })
      .grayscale()
      .stats();

    const meanLuma = stats.channels[0]?.mean ?? 128;
    const isDark = meanLuma < 35;

    if (isDark) {
      warnings.push(`File "${filename}" appears very dark (lighting score ${Math.round(meanLuma)}/255).`);
    }

    return {
      valid: errors.length === 0,
      width,
      height,
      format: metadata.format,
      sizeBytes: buffer.length,
      isDark,
      warnings,
      errors,
    };
  } catch {
    errors.push(`File "${filename}" is corrupted or is not a valid image file.`);
    return {
      valid: false,
      width: 0,
      height: 0,
      format: 'corrupt',
      sizeBytes: buffer.length,
      isDark: false,
      warnings,
      errors,
    };
  }
}
