/**
 * QR code generator using qrcode.js (loaded via CDN).
 * Generates a data URL for a QR pointing to the model result page.
 *
 * We use a lightweight approach: canvas-based generation via a small
 * QR encoding library. No external service — no URL is sent to a third party.
 */

/**
 * Generates a QR code PNG data URL for the given text using qrcode-generator.
 * Falls back to a plain instruction if canvas is unavailable.
 *
 * Note: qrcode-generator is loaded via a dynamic import to keep the main
 * bundle small. The library is only loaded when this function is called.
 */
export async function generateQRCodeDataUrl(text: string, size = 200): Promise<string> {
  // Dynamic import — loaded only on desktop when QR is actually needed
  const QRCode = await import('qrcode');
  const dataUrl = await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#18181b',  // neutral-950
      light: '#fafafa', // neutral-50
    },
    errorCorrectionLevel: 'M',
  });
  return dataUrl;
}
