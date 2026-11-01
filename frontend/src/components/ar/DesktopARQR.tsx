import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { generateQRCodeDataUrl } from '../../utils/qrcode';

interface DesktopARQRProps {
  resultUrl: string;
}

/**
 * DesktopARQR — shown on desktop when the user wants to view in AR.
 *
 * Generates a QR code pointing to the result page.
 * The user scans it with their phone to open the result and launch AR.
 *
 * QR generation is done locally via the qrcode library — no third-party
 * service is called. The result URL is not sent anywhere.
 */
export function DesktopARQR({ resultUrl }: DesktopARQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const dataUrl = await generateQRCodeDataUrl(resultUrl, 180);
        setQrDataUrl(dataUrl);
      } catch {
        setQrError(true);
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [resultUrl]);

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-neutral-900 mb-4">
        <Smartphone className="w-4 h-4" aria-hidden="true" />
        View in AR on your phone
      </div>
      <p className="text-xs text-neutral-500 mb-5">
        Scan this QR code with your phone's camera to open the AR viewer on a mobile device.
      </p>

      <div
        className="mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50"
        style={{ width: 196, height: 196 }}
        aria-label="QR code for mobile AR viewing"
      >
        {isGenerating && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
          </div>
        )}
        {!isGenerating && qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR code: scan with your phone to view in AR"
            width={196}
            height={196}
            className="w-full h-full"
          />
        )}
        {!isGenerating && qrError && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <p className="text-xs text-neutral-500 text-center">
              QR code unavailable. Share this URL manually:
            </p>
          </div>
        )}
      </div>

      {qrError && (
        <p className="text-xs font-mono text-neutral-600 mt-3 break-all bg-neutral-100 px-3 py-2 rounded">
          {resultUrl}
        </p>
      )}

      <p className="text-xs text-neutral-400 mt-4">
        Works on iOS (Safari) and Android (Chrome)
      </p>
    </div>
  );
}
