import { useState, useEffect, useCallback, useRef } from 'react';
import { jobs, ApiError } from '../api/client';
import type { ARJob, ARJobResult } from '../types/api';

const TERMINAL_STATUSES = new Set(['ready', 'failed']);
const INITIAL_POLL_MS = 3_000;
const MAX_POLL_MS = 30_000;
const BACKOFF_FACTOR = 1.4;

interface UseJobPollerReturn {
  job: ARJob | null;
  result: ARJobResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useJobPoller
 *
 * Polls the backend for job status until the job reaches a terminal state.
 * Uses exponential backoff to avoid hammering the API.
 * Stops polling on unmount or terminal status.
 * When status reaches 'ready', fetches the full result including asset URLs.
 */
export function useJobPoller(jobId: string): UseJobPollerReturn {
  const [job, setJob] = useState<ARJob | null>(null);
  const [result, setResult] = useState<ARJobResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollDelay = useRef(INITIAL_POLL_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchResult = useCallback(async () => {
    try {
      const res = await jobs.getResult(jobId);
      if (isMounted.current) {
        setResult(res);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(
          err instanceof ApiError ? err.message : 'Failed to load result.'
        );
        setIsLoading(false);
      }
    }
  }, [jobId]);

  const poll = useCallback(async () => {
    try {
      const status = await jobs.getStatus(jobId);
      if (!isMounted.current) return;

      setJob(status);

      if (status.status === 'ready') {
        await fetchResult();
        return; // Stop polling
      }

      if (status.status === 'failed') {
        setError(status.errorMessage ?? 'Processing failed. Please try again.');
        setIsLoading(false);
        return; // Stop polling
      }

      // Schedule next poll with backoff
      if (!TERMINAL_STATUSES.has(status.status)) {
        pollDelay.current = Math.min(pollDelay.current * BACKOFF_FACTOR, MAX_POLL_MS);
        timerRef.current = setTimeout(() => void poll(), pollDelay.current);
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof ApiError && err.status === 404) {
        setError('Job not found. It may have been deleted.');
        setIsLoading(false);
        return;
      }
      // Network error — retry with backoff
      pollDelay.current = Math.min(pollDelay.current * BACKOFF_FACTOR, MAX_POLL_MS);
      timerRef.current = setTimeout(() => void poll(), pollDelay.current);
    }
  }, [jobId, fetchResult]);

  useEffect(() => {
    pollDelay.current = INITIAL_POLL_MS;
    void poll();
  }, [poll]);

  return { job, result, isLoading, error };
}
