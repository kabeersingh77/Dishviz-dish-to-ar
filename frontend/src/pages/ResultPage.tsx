import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
  Download,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
  ChevronRight,
  X,
  Lock,
  Globe,
  Share2,
} from 'lucide-react';
import { useJobPoller } from '../hooks/useJobPoller';
import { DesktopARQR } from '../components/ar/DesktopARQR';
import { detectPlatform, buildSceneViewerUrl } from '../utils/platform';
import { JOB_STATUS_LABELS } from '../types/api';
import { assets } from '../api/client';


/**
 * ResultPage — /result/:jobId
 *
 * Phase 4 implementation:
 * - Real-time status polling (no fake progress bars)
 * - Interactive model-viewer with camera controls
 * - Platform-appropriate AR launch (iOS Quick Look, Android Scene Viewer, desktop QR)
 * - Download GLB / USDZ
 * - Copy embed code
 */
export function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, result, isLoading, error } = useJobPoller(jobId ?? '');

  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showARModal, setShowARModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedTab, setEmbedTab] = useState<'iframe' | 'webcomponent'>('iframe');
  const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>('private');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const platform = detectPlatform();
  const resultUrl = `${window.location.origin}/result/${jobId}`;

  // Sync visibility from result once loaded
  useEffect(() => {
    if (result?.visibility) {
      setVisibility(result.visibility);
    }
  }, [result?.visibility]);


  // ── Loading / polling state ────────────────────────────────────────────
  if (isLoading || (job && job.status !== 'ready' && job.status !== 'failed')) {
    const currentStatus = job?.status;
    const statusLabel = currentStatus
      ? JOB_STATUS_LABELS[currentStatus] ?? currentStatus
      : 'Waiting…';

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-base font-semibold text-neutral-900 mb-2">
          Processing your model
        </h1>
        <p className="text-sm text-neutral-500 mb-2">
          {statusLabel}
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          This may take a few minutes depending on the number of photos and reconstruction complexity.
          You can safely close this page and return later. Your job will continue in the background.
        </p>

        {/* Real status pipeline indicator */}
        {currentStatus && (
          <div className="mt-8 text-left max-w-xs mx-auto">
            <StatusPipeline currentStatus={currentStatus} />
          </div>
        )}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || job?.status === 'failed') {
    const message = error ?? job?.errorMessage ?? 'Processing failed.';
    const code = job?.errorCode;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="text-base font-semibold text-neutral-900 mb-2">Processing failed</h1>
        <p className="text-sm text-neutral-600 mb-1">{message}</p>
        {code === 'SEGMENTATION_LOW_CONFIDENCE' && (
          <p className="text-xs text-neutral-500 mt-2 mb-4">
            Tip: photograph the object on a plain, contrasting background with good lighting
            from at least 6 different angles.
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/create" className="btn-primary">Try again</Link>
          <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Ready state — show model viewer ────────────────────────────────────
  if (!result) return null;

  const glbUrl = result.assets.glbUrl;
  const usdzUrl = result.assets.usdzUrl;
  const primaryAssetId = result.primaryAssetId;

  const iframeSnippet = primaryAssetId
    ? `<iframe\n  src="${window.location.origin}/embed/${primaryAssetId}"\n  width="100%"\n  height="450"\n  frameborder="0"\n  allow="camera; accelerometer; gyroscope; xr-spatial-tracking"\n  allowfullscreen>\n</iframe>`
    : '';

  const webComponentSnippet = glbUrl
    ? `<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>\n<model-viewer\n  src="${glbUrl}"\n  ${usdzUrl ? `ios-src="${usdzUrl}"\n  ` : ''}alt="AR Model"\n  camera-controls\n  ar\n  ar-modes="webxr scene-viewer quick-look"\n  shadow-intensity="1"\n  style="width: 100%; height: 400px;">\n</model-viewer>`
    : '';

  const activeSnippet = embedTab === 'iframe' && iframeSnippet ? iframeSnippet : webComponentSnippet;

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(activeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleVisibilityChange = async (newVisibility: 'private' | 'unlisted' | 'public') => {
    if (!jobId) return;
    try {
      setIsUpdatingVisibility(true);
      await assets.updateVisibility(jobId, newVisibility);
      setVisibility(newVisibility);
    } catch (err) {
      console.error('Failed to update visibility:', err);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleARLaunch = () => {
    if (platform.supportsQuickLook && usdzUrl) {
      // iOS Quick Look — open via hidden anchor click
      const a = document.createElement('a');
      a.rel = 'ar';
      a.href = usdzUrl;
      a.appendChild(document.createElement('img'));
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (platform.supportsSceneViewer && glbUrl) {
      window.location.href = buildSceneViewerUrl(glbUrl);
    } else {
      // Desktop or unsupported mobile — show QR modal
      setShowARModal(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
        <Link to="/dashboard" className="hover:text-neutral-700 transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <Link to="/dashboard/history" className="hover:text-neutral-700 transition-colors">Dishes</Link>
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
        <span>{result.itemName || 'AR Model'}</span>
      </div>

      {/* Dish Profile Header if Food Metadata Present */}
      {result.itemName && (
        <div className="bg-white border border-neutral-200 rounded-md p-5 mb-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {result.itemCategory && (
                <span className={`px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded uppercase tracking-wider border ${
                  result.itemCategory === 'veg'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                    : result.itemCategory === 'vegan'
                    ? 'border-green-700 text-green-800 bg-green-50'
                    : result.itemCategory === 'non-veg'
                    ? 'border-red-600 text-red-700 bg-red-50'
                    : 'border-neutral-300 text-neutral-700 bg-neutral-100'
                }`}>
                  {result.itemCategory}
                </span>
              )}
              <span className="text-xs font-mono text-neutral-400">Dishviz Native Reconstruction</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {result.itemName}
            </h1>
            {result.itemTasteProfile && (
              <p className="text-xs font-medium text-neutral-600 italic">
                {result.itemTasteProfile}
              </p>
            )}
            {result.itemDescription && (
              <p className="text-xs text-neutral-500 max-w-2xl mt-1">
                {result.itemDescription}
              </p>
            )}
          </div>

          {result.itemPrice !== undefined && result.itemPrice !== null && (
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3 text-right self-start md:self-auto min-w-28">
              <div className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">Price</div>
              <div className="text-lg font-bold font-mono text-neutral-900">
                ${Number(result.itemPrice).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* ─── 3D Viewer ─── */}
        <div className="card overflow-hidden">
          {glbUrl ? (
            <model-viewer
              src={glbUrl}
              ios-src={usdzUrl}
              alt={result.itemName || "Your AR model"}
              camera-controls
              auto-rotate
              auto-rotate-delay={3000}
              shadow-intensity={1}
              shadow-softness={0.8}
              exposure={1}
              ar
              ar-modes="webxr scene-viewer quick-look"
              loading="eager"
              style={{ width: '100%', height: '480px', backgroundColor: '#f4f4f5' }}
            />
          ) : (
            <div className="flex items-center justify-center h-80 bg-neutral-50 text-neutral-400 text-sm">
              No 3D model available
            </div>
          )}
        </div>

        {/* ─── Actions Panel ─── */}
        <div className="space-y-4">
          {/* AR Launch */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-1">View in AR</h2>
            <p className="text-xs text-neutral-500 mb-4">
              {platform.platform === 'ios'
                ? 'Tap to open in AR using iOS Quick Look.'
                : platform.platform === 'android'
                ? 'Tap to open in AR using Google Scene Viewer.'
                : 'Scan the QR code on your phone to launch AR.'}
            </p>
            <button
              onClick={handleARLaunch}
              disabled={!glbUrl && !usdzUrl}
              className="btn-primary w-full justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" aria-hidden="true" />
              {platform.platform === 'desktop' ? 'Get QR code for AR' : 'Launch in AR'}
            </button>
            {platform.platform === 'ios' && !usdzUrl && (
              <p className="text-xs text-neutral-400 mt-2">
                USDZ format not yet available for this model.
              </p>
            )}
          </div>

          {/* Downloads */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Download</h2>
            <div className="space-y-2">
              {glbUrl && (
                <a
                  href={glbUrl}
                  download
                  className="btn-secondary w-full justify-center gap-2"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download GLB
                </a>
              )}
              {usdzUrl && (
                <a
                  href={usdzUrl}
                  download
                  className="btn-secondary w-full justify-center gap-2"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download USDZ
                </a>
              )}
              {!glbUrl && !usdzUrl && (
                <p className="text-xs text-neutral-400">No downloadable files available.</p>
              )}
            </div>
          </div>

          {/* Embed */}
          {glbUrl && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-1">Embed</h2>
              <p className="text-xs text-neutral-500 mb-3">
                Add this model to your website using the model-viewer web component.
              </p>
              <button
                onClick={() => setShowEmbedModal(true)}
                className="btn-secondary w-full justify-center gap-2"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                Get embed code
              </button>
            </div>
          )}

          {/* Model info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Model info</h2>
            <dl className="space-y-1.5 text-xs">
              <Row label="Job ID" value={<code className="font-mono">{jobId}</code>} />
              <Row
                label="Completed"
                value={
                  result.completedAt
                    ? new Date(result.completedAt).toLocaleString()
                    : 'Pending'
                }
              />
              <Row
                label="Segmentation"
                value={
                  result.segmentationConfidence !== null && result.segmentationConfidence !== undefined
                    ? `${Math.round(result.segmentationConfidence * 100)}% confidence`
                    : 'N/A'
                }
              />
              <Row
                label="Formats"
                value={result.formats.join(', ').toUpperCase() || 'None'}
              />
              <Row
                label="Visibility"
                value={
                  <div className="flex items-center gap-1.5">
                    <select
                      value={visibility}
                      onChange={(e) => void handleVisibilityChange(e.target.value as 'private' | 'unlisted' | 'public')}
                      disabled={isUpdatingVisibility}
                      className="border border-neutral-300 rounded px-1.5 py-0.5 text-xs bg-white text-neutral-800 disabled:opacity-50"
                    >
                      <option value="private">Private (Owner only)</option>
                      <option value="unlisted">Unlisted (Anyone with link)</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                }
              />
            </dl>
          </div>
        </div>
      </div>

      {/* ─── Embed Code Modal ─── */}
      {showEmbedModal && (
        <Modal title="Embed 3D & AR" onClose={() => setShowEmbedModal(false)}>
          <div className="flex gap-2 border-b border-neutral-200 pb-2 mb-3">
            <button
              type="button"
              onClick={() => setEmbedTab('iframe')}
              className={`text-xs px-3 py-1.5 font-medium rounded transition-colors ${
                embedTab === 'iframe'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100'
              }`}
            >
              Responsive iframe (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setEmbedTab('webcomponent')}
              className={`text-xs px-3 py-1.5 font-medium rounded transition-colors ${
                embedTab === 'webcomponent'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100'
              }`}
            >
              &lt;model-viewer&gt; Tag
            </button>
          </div>

          <p className="text-xs text-neutral-500 mb-3">
            {embedTab === 'iframe'
              ? 'Embed the standalone interactive 3D viewer directly on your website, e-commerce store, or web app without client-side JavaScript. Asset visibility must be set to Unlisted or Public.'
              : 'Direct HTML web component integration using Google <model-viewer>. Direct temporary signed URLs expire after 2 hours.'}
          </p>
          <pre className="bg-neutral-900 text-neutral-100 rounded p-3 text-xs overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed mb-3">
            {activeSnippet}
          </pre>
          <button
            onClick={() => void handleCopyEmbed()}
            className="btn-primary gap-2"
          >
            {copiedEmbed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedEmbed ? 'Copied snippet!' : 'Copy snippet'}
          </button>
        </Modal>
      )}

      {/* ─── AR QR Modal (desktop only) ─── */}
      {showARModal && (
        <Modal title="View in AR" onClose={() => setShowARModal(false)}>
          <DesktopARQR resultUrl={resultUrl} />
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const stages = [
    'preparing_images',
    'segmenting_subject',
    'uploading_photos',
    'analyzing_views',
    'reconstructing_object',
    'generating_3d_model',
    'optimizing_model',
    'preparing_ar',
  ];

  const currentIdx = stages.indexOf(currentStatus);

  return (
    <ol className="space-y-2">
      {stages.map((stage, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <li key={stage} className="flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isDone
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-neutral-900 animate-pulse'
                  : 'bg-neutral-200'
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-xs ${
                isCurrent ? 'text-neutral-900 font-medium' : 'text-neutral-400'
              }`}
            >
              {JOB_STATUS_LABELS[stage as keyof typeof JOB_STATUS_LABELS] ?? stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-neutral-500 flex-shrink-0">{label}</dt>
      <dd className="text-neutral-900 text-right">{value}</dd>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-neutral-950/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-sm font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
