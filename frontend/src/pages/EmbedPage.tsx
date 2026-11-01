import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assets, type AssetDetails, ApiError } from '../api/client';
import { Box, AlertTriangle } from 'lucide-react';

export function EmbedPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setError('Missing Asset ID');
      setIsLoading(false);
      return;
    }

    assets
      .get(assetId)
      .then((data) => {
        setAsset(data);
        setIsLoading(false);
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError && err.status === 403
            ? 'This 3D AR asset is private or requires authorization.'
            : 'Asset not found or unavailable.';
        setError(msg);
        setIsLoading(false);
      });
  }, [assetId]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-900 text-white">
        <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-xs text-neutral-400 font-mono">Loading 3D asset…</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-900 text-white p-4 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
        <p className="text-sm font-semibold text-neutral-200 mb-1">Unable to display 3D model</p>
        <p className="text-xs text-neutral-400 max-w-xs">{error}</p>
      </div>
    );
  }

  const modelSrc = asset.glbUrl || `/api/v1/ar/assets/${asset.assetId}/model`;

  return (
    <div className="w-screen h-screen bg-neutral-950 flex flex-col relative overflow-hidden">
      {/* 3D Model Viewer */}
      <model-viewer
        src={modelSrc}
        ios-src={asset.usdzUrl || undefined}
        alt="3D AR Model"
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        shadow-intensity={1}
        exposure={1}

        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      >

        {/* AR Launch Button overlay */}
        <button
          slot="ar-button"
          className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white text-neutral-900 font-medium text-xs rounded-lg shadow-lg flex items-center gap-1.5 hover:bg-neutral-100 transition-colors"
        >
          <Box className="w-4 h-4 text-neutral-900" />
          View in AR
        </button>
      </model-viewer>

      {/* Discrete watermark for embed */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-mono text-neutral-400 bg-black/50 px-2 py-0.5 rounded">
          Powered by ObjectAR
        </span>
      </div>
    </div>
  );
}
