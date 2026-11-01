import React, { useState } from 'react';
import { BUSINESS } from '../config/business';
import { Server, Code2, Globe, Shield, Terminal, BookOpen } from 'lucide-react';

const CODE = (s: string) => (
  <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-900">{s}</code>
);

export function ApiDocsPage() {
  const maxMB = BUSINESS.limits.maxFileSizeMB;
  const [lang, setLang] = useState<'curl' | 'js' | 'python'>('curl');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-6 h-6 text-neutral-800" />
          <h1 className="text-2xl font-bold text-neutral-900">Developer API Reference</h1>
        </div>
        <p className="text-sm text-neutral-600">
          The ObjectAR REST API enables programmatic multi-angle photo ingestion, subject-segmented 3D reconstruction,
          and AR asset retrieval. All endpoints are versioned under {CODE('/api/v1/')}.
        </p>
      </div>

      {/* Language Selector Bar */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-100 border border-neutral-200 mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 px-2">
          <Terminal className="w-3.5 h-3.5 text-neutral-600" />
          <span>Code Examples:</span>
        </div>
        <div className="flex gap-1">
          {(['curl', 'js', 'python'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                lang === l
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              {l === 'curl' ? 'cURL' : l === 'js' ? 'JavaScript / TypeScript' : 'Python'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Authentication ── */}
      <Section title="Authentication">
        <p className="text-sm text-neutral-600 mb-3">
          Authenticate external developer requests using your API key as a Bearer token in the {CODE('Authorization')} header:
        </p>
        <CodeBlock language="bash">{`Authorization: Bearer YOUR_API_KEY`}</CodeBlock>
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 mt-3 space-y-1">
          <p>
            • Generate keys in your <a href="/dashboard/api" className="underline font-medium">API Dashboard</a>.
          </p>
          <p>
            • Keys start with {CODE('oar_live_')}. Only cryptographic hashes are stored on our servers; the full key is shown once.
          </p>
          <p>
            • Rate limits: <strong>60 requests per minute</strong> on general endpoints, <strong>30 jobs per hour</strong> on creation.
          </p>
        </div>
      </Section>

      {/* ── 1. Create AR Job ── */}
      <Section title="1. Create an AR Reconstruction Job">
        <EndpointRow method="POST" path="/api/v1/ar/jobs" label="Upload photographs and queue 3D reconstruction" />
        <p className="text-xs text-neutral-500 mb-3">
          Accepts multipart form-data. Upload 6 to 12 multi-angle photographs of the physical object or dish.
        </p>

        {lang === 'curl' && (
          <CodeBlock language="bash">{`curl -X POST https://api.objectar.example.com/api/v1/ar/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "images=@angle_01.jpg" \\
  -F "images=@angle_02.jpg" \\
  -F "images=@angle_03.jpg" \\
  -F "images=@angle_04.jpg" \\
  -F "images=@angle_05.jpg" \\
  -F "images=@angle_06.jpg" \\
  -F "segmentationMode=smart" \\
  -F "visibility=unlisted" \\
  -F "consentGiven=true"`}</CodeBlock>
        )}

        {lang === 'js' && (
          <CodeBlock language="typescript">{`const formData = new FormData();
// Append image File or Blob objects
photos.forEach((file) => formData.append('images', file));
formData.append('segmentationMode', 'smart'); // 'smart' | 'dish_only'
formData.append('visibility', 'unlisted');    // 'private' | 'unlisted' | 'public'
formData.append('consentGiven', 'true');

const response = await fetch('https://api.objectar.example.com/api/v1/ar/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
  },
  body: formData,
});
const data = await response.json();
console.log('Job created:', data.jobId);`}</CodeBlock>
        )}

        {lang === 'python' && (
          <CodeBlock language="python">{`import requests

url = "https://api.objectar.example.com/api/v1/ar/jobs"
headers = {"Authorization": "Bearer YOUR_API_KEY"}

files = [
    ("images", open("angle_01.jpg", "rb")),
    ("images", open("angle_02.jpg", "rb")),
    ("images", open("angle_03.jpg", "rb")),
    ("images", open("angle_04.jpg", "rb")),
    ("images", open("angle_05.jpg", "rb")),
    ("images", open("angle_06.jpg", "rb")),
]
data = {
    "segmentationMode": "smart",
    "visibility": "unlisted",
    "consentGiven": "true"
}

res = requests.post(url, headers=headers, files=files, data=data)
job_data = res.json()
print("Created job:", job_data["jobId"])`}</CodeBlock>
        )}

        <p className="text-xs font-semibold text-neutral-700 mt-3 mb-1">Response (201 Created):</p>
        <CodeBlock language="json">{`{
  "jobId": "cly109a8bc43",
  "status": "queued",
  "segmentationMode": "smart",
  "visibility": "unlisted",
  "version": 1,
  "imageCount": 6,
  "warnings": []
}`}</CodeBlock>
      </Section>

      {/* ── 2. Poll Status ── */}
      <Section title="2. Poll Job Status">
        <EndpointRow method="GET" path="/api/v1/ar/jobs/:jobId" label="Query asynchronous pipeline progression" />

        {lang === 'curl' && (
          <CodeBlock language="bash">{`curl https://api.objectar.example.com/api/v1/ar/jobs/cly109a8bc43 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</CodeBlock>
        )}

        {lang === 'js' && (
          <CodeBlock language="typescript">{`const res = await fetch('https://api.objectar.example.com/api/v1/ar/jobs/cly109a8bc43', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
});
const job = await res.json();
console.log('Status:', job.status); // e.g. 'segmenting_subject', 'reconstructing_object', 'ready'`}</CodeBlock>
        )}

        {lang === 'python' && (
          <CodeBlock language="python">{`import requests

res = requests.get(
    "https://api.objectar.example.com/api/v1/ar/jobs/cly109a8bc43",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print("Status:", res.json()["status"])`}</CodeBlock>
        )}

        <p className="text-xs font-semibold text-neutral-700 mt-3 mb-1">Status Lifecycle Values:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono text-neutral-700 my-2">
          {['queued', 'preparing_images', 'segmenting_subject', 'uploading_photos',
            'analyzing_views', 'reconstructing_object', 'generating_3d_model',
            'optimizing_model', 'preparing_ar', 'ready', 'failed'].map((s) => (
            <div key={s} className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s === 'ready' ? 'bg-emerald-500' : s === 'failed' ? 'bg-red-500' : 'bg-sky-500'}`} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. Retrieve Result ── */}
      <Section title="3. Retrieve Job Result & Asset URLs">
        <EndpointRow method="GET" path="/api/v1/ar/jobs/:jobId/result" label={`Available when status is "ready"`} />
        <CodeBlock language="json">{`{
  "id": "cly109a8bc43",
  "status": "ready",
  "segmentationConfidence": 0.94,
  "visibility": "unlisted",
  "version": 1,
  "primaryAssetId": "asset_92kz81",
  "assets": {
    "glbUrl": "https://storage.objectar.example.com/output/cly109a8bc43/model.glb?sig=...",
    "usdzUrl": "https://storage.objectar.example.com/output/cly109a8bc43/model.usdz?sig=...",
    "thumbnailUrl": "https://storage.objectar.example.com/output/cly109a8bc43/thumbnail.png?sig=..."
  },
  "formats": ["glb", "usdz"],
  "completedAt": "2026-09-16T10:14:02.000Z"
}`}</CodeBlock>
      </Section>

      {/* ── 4. Persistent Asset Retrieval (No Generation Cost) ── */}
      <Section title="4. Persistent Asset Retrieval (Viewing Existing 3D Models)">
        <EndpointRow method="GET" path="/api/v1/ar/assets/:assetId" label="Query pre-computed 3D asset metadata" />
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mb-3">
          <strong>Cost & Performance Rule:</strong> Viewing an existing asset ID retrieves pre-rendered 3D files and
          <strong> NEVER triggers or consumes generation allowances</strong>. External apps should store the returned {CODE('assetId')}
          and query this endpoint to render models to end users.
        </div>

        {lang === 'curl' && (
          <CodeBlock language="bash">{`curl https://api.objectar.example.com/api/v1/ar/assets/asset_92kz81`}</CodeBlock>
        )}

        {lang === 'js' && (
          <CodeBlock language="typescript">{`// End users load the pre-computed model by Asset ID
const res = await fetch('https://api.objectar.example.com/api/v1/ar/assets/asset_92kz81');
const asset = await res.json();
console.log('GLB URL:', asset.glbUrl);
console.log('USDZ URL:', asset.usdzUrl);`}</CodeBlock>
        )}

        {lang === 'python' && (
          <CodeBlock language="python">{`import requests

res = requests.get("https://api.objectar.example.com/api/v1/ar/assets/asset_92kz81")
asset = res.json()
print("GLB download link:", asset["glbUrl"])`}</CodeBlock>
        )}

        <CodeBlock language="json">{`{
  "assetId": "asset_92kz81",
  "jobId": "cly109a8bc43",
  "type": "glb",
  "visibility": "unlisted",
  "version": 1,
  "mimeType": "model/gltf-binary",
  "sizeBytes": 2841920,
  "downloadUrl": "https://...",
  "glbUrl": "https://...",
  "usdzUrl": "https://...",
  "thumbnailUrl": "https://...",
  "isOwner": true,
  "createdAt": "2026-09-16T10:14:02.000Z"
}`}</CodeBlock>
      </Section>

      {/* ── 5. Embeddable Viewer ── */}
      <Section title="5. Embeddable 3D & AR Viewer">
        <p className="text-sm text-neutral-600 mb-3">
          Embed generated 3D models into any external website or mobile web app using an iframe or direct model streaming:
        </p>

        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">A. Responsive iframe Embed</h4>
        <CodeBlock language="html">{`<iframe
  src="https://objectar.example.com/embed/asset_92kz81"
  width="100%"
  height="450"
  frameborder="0"
  allow="camera; accelerometer; gyroscope"
  style="border-radius: 12px; overflow: hidden;"
></iframe>`}</CodeBlock>

        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-4 mb-2">B. Direct Web Component Stream</h4>
        <CodeBlock language="html">{`<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>

<model-viewer
  src="https://api.objectar.example.com/api/v1/ar/assets/asset_92kz81/model"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  auto-rotate
  style="width: 100%; height: 400px;"
></model-viewer>`}</CodeBlock>
      </Section>

      {/* ── Rate Limits ── */}
      <Section title="Rate Limits & Status Codes">
        <table className="w-full text-xs">
          <thead className="text-left">
            <tr className="border-b border-neutral-100">
              <th className="pb-2 font-semibold">Status Code</th>
              <th className="pb-2 font-semibold">Condition</th>
              <th className="pb-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-neutral-600 divide-y divide-neutral-50">
            <tr><td className="py-2 font-mono">201 Created</td><td>Job queued successfully</td><td>Poll {CODE('/jobs/:id')} with backoff</td></tr>
            <tr><td className="py-2 font-mono">401 Unauthorized</td><td>Missing or invalid API key</td><td>Check {CODE('Authorization: Bearer')} header</td></tr>
            <tr><td className="py-2 font-mono">402 Payment Required</td><td>Free trial or monthly quota exhausted</td><td>Upgrade plan via dashboard</td></tr>
            <tr><td className="py-2 font-mono">403 Forbidden</td><td>Asset is private and not owned by caller</td><td>Update visibility to 'unlisted' or 'public'</td></tr>
            <tr><td className="py-2 font-mono">429 Too Many Requests</td><td>Rate limit exceeded</td><td>Inspect {CODE('Retry-After')} response header</td></tr>
            <tr><td className="py-2 font-mono">503 Unavailable</td><td>AI provider key unconfigured</td><td>Set {CODE('AR_PROVIDER_API_KEY')} in environment</td></tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
}

// ─── Reusable Documentation Components ───────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 border-t border-neutral-200/80 pt-8">
      <h2 className="text-base font-bold text-neutral-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EndpointRow({ method, path, label }: { method: string; path: string; label: string }) {
  const colors: Record<string, string> = {
    GET: 'text-sky-700 bg-sky-50 border-sky-200',
    POST: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    PATCH: 'text-amber-700 bg-amber-50 border-amber-200',
    DELETE: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className="flex items-center gap-3 mb-2 flex-wrap">
      <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${colors[method] ?? ''}`}>
        {method}
      </span>
      <code className="font-mono text-xs font-semibold text-neutral-900">{path}</code>
      <span className="text-xs text-neutral-500">• {label}</span>
    </div>
  );
}

function CodeBlock({ children, language = 'bash' }: { children: string; language?: string }) {
  return (
    <pre
      className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed font-mono mb-3 border border-neutral-800"
      data-language={language}
    >
      <code>{children}</code>
    </pre>
  );
}
