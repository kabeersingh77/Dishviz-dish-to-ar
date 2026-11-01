import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Box, Code2, ArrowRight, Layers, ShieldCheck } from 'lucide-react';

export function LandingPage() {
  return (
    <main>
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-neutral-200 bg-white text-xs font-mono text-neutral-600 mb-6 shadow-sm">
          <span>AR Generation Platform</span>
          <span className="w-1 h-1 rounded-full bg-emerald-600" />
          <span>Objects, Products, and More</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-neutral-900 leading-tight tracking-tight mb-5">
          Turn Phone Photos Into Clean, AR-Ready 3D Models
        </h1>
        <p className="text-base text-neutral-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Photograph any physical object from multiple angles and get a standards-compliant GLB or USDZ file back. Suitable for products, food, collectibles, and real-world objects of any kind.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/create" className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Create AR Model
          </Link>
          <Link to="/docs/api" className="btn-secondary px-6 py-2.5 text-sm flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            API Documentation
          </Link>
        </div>
      </section>

      {/* ─── Workflow ───────────────────────────────────────────────────── */}
      <section
        className="border-t border-neutral-200 bg-neutral-50 py-16"
        aria-labelledby="workflow-heading"
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2
            id="workflow-heading"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center mb-10 font-mono"
          >
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-md p-4 text-center shadow-sm">
                <div className="w-10 h-10 mx-auto mb-3 rounded bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                  <step.Icon className="w-5 h-5 text-neutral-700" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="text-xs font-bold text-neutral-900 mb-1">{step.title}</p>
                <p className="text-xs text-neutral-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Highlights ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm">
            <h2 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-700" />
              Background Isolation
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed mb-3">
              Before 3D compilation, the pipeline separates your object from the surrounding environment. The result is a clean, isolated mesh that represents only the object you photographed.
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              6 photos minimum recommended. More angles produce more accurate geometry.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm">
            <h2 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              No Charge on Failure
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed mb-3">
              If the generation pipeline cannot produce a valid asset from your photos, the credit cost is automatically refunded. You only pay for successful results.
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              All charges and automatic refunds are recorded on your immutable Credit Ledger.
            </p>
          </div>
        </div>
      </section>

      {/* ─── API Section ────────────────────────────────────────────────── */}
      <section
        className="border-t border-neutral-200 bg-neutral-50 py-16"
        aria-labelledby="api-heading"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Developer Interface</div>
              <h2 id="api-heading" className="text-lg font-bold text-neutral-900 mb-3">
                REST API with Two Access Tiers
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                Submit photos directly through the public API. Integrate private first-party workflows via the internal master credential. Real-time webhooks notify your backend when assets are ready.
              </p>
              <Link to="/docs/api" className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                Read API Specifications
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="flex-1 w-full">
              <pre className="bg-neutral-900 text-neutral-100 rounded-md p-4 text-xs overflow-x-auto leading-relaxed font-mono border border-neutral-800">
                <code>{API_EXAMPLE}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">
          Ready to generate an AR model?
        </h2>
        <p className="text-xs text-neutral-500">
          Take 6 or more photos of any physical object from different angles.
        </p>
        <div>
          <Link to="/create" className="btn-primary px-6 py-2.5 text-xs font-semibold">
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}

const WORKFLOW_STEPS = [
  {
    Icon: Camera,
    title: '1. Capture',
    description: 'Take 6 or more photos of your object from different angles following the on-screen guide.',
  },
  {
    Icon: Box,
    title: '2. Segment',
    description: 'The pipeline separates the object from its background automatically.',
  },
  {
    Icon: Layers,
    title: '3. Reconstruct',
    description: 'Multi-angle photos are compiled into a 3D mesh with a baked texture.',
  },
  {
    Icon: Box,
    title: '4. Deliver',
    description: 'Download GLB or USDZ, or launch directly in AR on iOS or Android.',
  },
] as const;

const API_EXAMPLE = `# Submit photos to the public API
curl -X POST https://api.dishviz.com/api/v1/ar/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "images=@front.jpg" \\
  -F "images=@side.jpg" \\
  -F "images=@top.jpg" \\
  -F "consentGiven=true"

# Poll for result
curl https://api.dishviz.com/api/v1/ar/jobs/{jobId} \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
