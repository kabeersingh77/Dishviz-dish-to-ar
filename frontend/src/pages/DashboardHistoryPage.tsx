import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Box, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { jobs, ApiError } from '../api/client';
import type { ARJob, ARJobStatus } from '../types/api';
import { JOB_STATUS_LABELS } from '../types/api';

export function DashboardHistoryPage() {
  const [jobList, setJobList] = useState<(ARJob & { thumbnailUrl?: string | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await jobs.list();
        setJobList(data.jobs as (ARJob & { thumbnailUrl?: string | null })[]);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Failed to load jobs. Please refresh.'
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Food Dishes & AR Models</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Your catalog of 3D food reconstructions and AR models ready for mobile viewing and embedding.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/add-item" className="btn-primary gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Food Dish
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-100 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {!isLoading && !error && jobList.length === 0 && (
        <div className="text-center py-16 border border-dashed border-neutral-200 rounded-lg">
          <Box className="w-8 h-8 text-neutral-300 mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm font-medium text-neutral-700 mb-1">No food dishes yet</p>
          <p className="text-xs text-neutral-500 mb-5">
            Capture 6 to 8 photos of a dish to generate your first AR 3D model.
          </p>
          <Link to="/add-item" className="btn-primary">Add Food Dish</Link>
        </div>
      )}

      {!isLoading && jobList.length > 0 && (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
          {jobList.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: ARJob & { thumbnailUrl?: string | null } }) {
  const isReady = job.status === 'ready';
  const isFailed = job.status === 'failed';
  const isProcessing = !isReady && !isFailed;

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-white hover:bg-neutral-50 transition-colors">
      {/* Thumbnail or placeholder */}
      <div className="w-14 h-14 rounded overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0 flex items-center justify-center">
        {job.thumbnailUrl ? (
          <img
            src={job.thumbnailUrl}
            alt={job.itemName || "Dish thumbnail"}
            className="w-full h-full object-cover"
          />
        ) : (
          <Box className="w-6 h-6 text-neutral-300" strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusIcon status={job.status} />
          <span className="text-sm font-semibold text-neutral-900 truncate">
            {job.itemName || JOB_STATUS_LABELS[job.status] || job.status}
          </span>
          {job.itemCategory && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
              {job.itemCategory}
            </span>
          )}
          {job.itemPrice !== undefined && job.itemPrice !== null && (
            <span className="text-xs font-mono font-medium text-neutral-600">
              ${Number(job.itemPrice).toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {new Date(job.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {' · '}
          <span className="capitalize">{job.segmentationMode.replace('_', ' ')} mode</span>
          {job.apiTier && ` · Tier: ${job.apiTier}`}
        </p>
        {isFailed && job.errorMessage && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{job.errorMessage}</p>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {isReady && (
          <Link
            to={`/result/${job.id}`}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            View in AR
          </Link>
        )}
        {isProcessing && (
          <Link
            to={`/result/${job.id}`}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            View progress
          </Link>
        )}
        {isFailed && (
          <Link to="/add-item" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ARJobStatus }) {
  if (status === 'ready') {
    return <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-label="Ready" />;
  }
  if (status === 'failed') {
    return <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-label="Failed" />;
  }
  return <Clock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 animate-pulse" aria-label="Processing" />;
}
