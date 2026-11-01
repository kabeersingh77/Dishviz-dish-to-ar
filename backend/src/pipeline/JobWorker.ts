import { prisma } from '../db/prisma';
import { PipelineExecutor } from './PipelineExecutor';

/**
 * JobWorker
 *
 * A simple polling-based job queue worker.
 * Queries for queued jobs and runs the pipeline serially.
 *
 * Design:
 *  - Single-process, no external queue dependency (Phase 10 can add BullMQ/SQS)
 *  - Concurrency cap of 2 jobs simultaneously to avoid overwhelming providers
 *  - Graceful shutdown: completes in-progress jobs before exit
 *  - Never processes a job it didn't claim (update-where guards against race conditions)
 */
export class JobWorker {
  private readonly POLL_INTERVAL_MS = 5_000;
  private readonly MAX_CONCURRENT = 2;

  private isShuttingDown = false;
  private activeJobs = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    console.log('[JobWorker] Starting — polling every', this.POLL_INTERVAL_MS, 'ms');
    this.schedulePoll();

    // Graceful shutdown on SIGTERM / SIGINT
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT',  () => this.stop());
  }

  stop(): void {
    console.log('[JobWorker] Shutdown requested — waiting for active jobs to complete...');
    this.isShuttingDown = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  private schedulePoll(): void {
    if (this.isShuttingDown) return;
    this.pollTimer = setTimeout(() => void this.poll(), this.POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      while (this.activeJobs < this.MAX_CONCURRENT) {
        const claimed = await this.claimNextJob();
        if (!claimed) break; // no more queued jobs
        this.activeJobs++;

        // Run the pipeline without blocking the poll loop
        void this.runJob(claimed.id).finally(() => {
          this.activeJobs--;
        });
      }
    } catch (err) {
      // Log poll errors but don't crash the worker
      console.error('[JobWorker] Poll error:', err instanceof Error ? err.message : err);
    }

    this.schedulePoll();
  }

  /**
   * Atomically claims a queued job by setting it to 'preparing_images'.
   * This prevents two workers (or two poll cycles) from picking the same job.
   */
  private async claimNextJob(): Promise<{ id: string } | null> {
    // Prisma doesn't have a native SELECT FOR UPDATE so we use a two-step
    // approach: find + update-where with the original status as a guard.
    const job = await prisma.aRJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true },
    });

    if (!job) return null;

    // Try to claim it — if someone else already changed the status, count returns 0
    const updated = await prisma.aRJob.updateMany({
      where: { id: job.id, status: 'queued' },
      data: { status: 'preparing_images' },
    });

    return updated.count > 0 ? { id: job.id } : null;
  }

  private async runJob(jobId: string): Promise<void> {
    console.log(`[JobWorker] Processing job ${jobId}`);
    const start = Date.now();
    const executor = new PipelineExecutor();
    try {
      await executor.execute(jobId);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[JobWorker] Job ${jobId} completed in ${elapsed}s`);
    } catch (err) {
      // PipelineExecutor handles its own error persistence — this should not happen
      console.error(`[JobWorker] Unexpected error for job ${jobId}:`, err instanceof Error ? err.message : err);
    }
  }
}
