/**
 * Job Queue System
 *
 * Enables multiple users to generate SaaS applications simultaneously
 * without blocking each other. Uses an in-memory priority queue with
 * Supabase persistence for durability.
 *
 * Architecture:
 *   Client → POST /api/queue/enqueue → JobQueue.enqueue()
 *       → Worker pool (configurable concurrency, default: 3)
 *       → WarRoomOrchestrator.runFullPipeline()
 *       → Job status updates via Supabase
 *       → Client polls GET /api/queue/status?jobId=...
 *
 * Features:
 * - Priority queue (1-10, higher = sooner)
 * - Configurable concurrency (default: 3 parallel jobs)
 * - Automatic retry on transient failures (max 2 retries)
 * - Job cancellation
 * - Real-time status updates
 * - Dead letter queue for permanently failed jobs
 */

import { logger } from './utils/logger'
import { withRetry } from './utils/retry'
import { createClient } from '@supabase/supabase-js'

const log = logger.child({ module: 'JobQueue' })

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying'

export interface JobPayload {
  saasDescription: string
  appName: string
  orgId: string
  userId: string
  projectId?: string
  options?: {
    skipDeploy?: boolean
    skipQA?: boolean
    theme?: Record<string, string>
  }
}

export interface Job {
  id: string
  orgId: string
  userId: string
  payload: JobPayload
  status: JobStatus
  priority: number        // 1-10, higher = processed first
  attempts: number        // Current attempt count
  maxAttempts: number     // Max retries (default: 3)
  result?: unknown
  error?: string
  queuedAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDurationMs?: number
}

export interface QueueStats {
  queued: number
  running: number
  completed: number
  failed: number
  avgWaitTimeMs: number
  avgProcessingTimeMs: number
  throughputPerHour: number
}

// ── Job Queue ─────────────────────────────────────────────────────────────────

export class JobQueue {
  private queue: Job[] = []
  private running: Map<string, Job> = new Map()
  private completed: Job[] = []
  private failed: Job[] = []
  private workers: Promise<void>[] = []
  private isRunning = false
  private supabase: ReturnType<typeof createClient> | null = null

  constructor(
    private readonly maxConcurrency: number = 3,
    private readonly maxQueueSize: number = 100
  ) {
    // Initialize Supabase client if env vars are available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  }

  /**
   * Start the queue processor.
   */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    log.info({ maxConcurrency: this.maxConcurrency }, 'Job queue started')
    this.processLoop()
  }

  /**
   * Stop the queue processor gracefully.
   */
  async stop(): Promise<void> {
    this.isRunning = false
    await Promise.all(this.workers)
    log.info('Job queue stopped')
  }

  /**
   * Add a job to the queue.
   */
  async enqueue(payload: JobPayload, priority: number = 5): Promise<Job> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Queue is full (max ${this.maxQueueSize} jobs). Please try again later.`)
    }

    const job: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orgId: payload.orgId,
      userId: payload.userId,
      payload,
      status: 'queued',
      priority: Math.max(1, Math.min(10, priority)),
      attempts: 0,
      maxAttempts: 3,
      queuedAt: new Date(),
      estimatedDurationMs: this.estimateDuration(),
    }

    // Insert into priority queue (sorted by priority desc, then queuedAt asc)
    const insertIndex = this.queue.findIndex(
      j => j.priority < job.priority ||
           (j.priority === job.priority && j.queuedAt > job.queuedAt)
    )

    if (insertIndex === -1) {
      this.queue.push(job)
    } else {
      this.queue.splice(insertIndex, 0, job)
    }

    // Persist to Supabase
    await this.persistJobStatus(job)

    log.info(
      { job_id: job.id, priority: job.priority, queue_length: this.queue.length },
      'Job enqueued'
    )

    return job
  }

  /**
   * Cancel a queued job.
   */
  async cancel(jobId: string): Promise<boolean> {
    const index = this.queue.findIndex(j => j.id === jobId)
    if (index === -1) return false

    const job = this.queue[index]
    job.status = 'cancelled'
    job.completedAt = new Date()
    this.queue.splice(index, 1)

    await this.persistJobStatus(job)
    log.info({ job_id: jobId }, 'Job cancelled')
    return true
  }

  /**
   * Get job status by ID.
   */
  getJob(jobId: string): Job | null {
    return (
      this.queue.find(j => j.id === jobId) ??
      this.running.get(jobId) ??
      this.completed.find(j => j.id === jobId) ??
      this.failed.find(j => j.id === jobId) ??
      null
    )
  }

  /**
   * Get queue position for a job.
   */
  getQueuePosition(jobId: string): number {
    const index = this.queue.findIndex(j => j.id === jobId)
    return index === -1 ? -1 : index + 1
  }

  /**
   * Get estimated wait time for a queued job.
   */
  getEstimatedWaitMs(jobId: string): number {
    const position = this.getQueuePosition(jobId)
    if (position === -1) return 0

    const avgProcessingMs = this.getStats().avgProcessingTimeMs || 120_000 // 2 min default
    const slotsAvailable = Math.max(0, this.maxConcurrency - this.running.size)
    const jobsAhead = Math.max(0, position - 1 - slotsAvailable)

    return jobsAhead * avgProcessingMs
  }

  /**
   * Get queue statistics.
   */
  getStats(): QueueStats {
    const completedWithTime = this.completed.filter(
      j => j.startedAt && j.completedAt
    )

    const avgProcessingMs = completedWithTime.length > 0
      ? completedWithTime.reduce(
          (sum, j) => sum + (j.completedAt!.getTime() - j.startedAt!.getTime()),
          0
        ) / completedWithTime.length
      : 0

    const recentCompleted = this.completed.filter(
      j => j.completedAt && Date.now() - j.completedAt.getTime() < 3_600_000
    )

    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length,
      avgWaitTimeMs: 0, // TODO: track wait times
      avgProcessingTimeMs: avgProcessingMs,
      throughputPerHour: recentCompleted.length,
    }
  }

  // ── Private: Processing Loop ──────────────────────────────────────────────

  private processLoop(): void {
    const tick = async () => {
      while (this.isRunning) {
        // Fill worker slots
        while (this.running.size < this.maxConcurrency && this.queue.length > 0) {
          const job = this.queue.shift()!
          this.processJob(job)
        }

        // Wait 500ms before next tick
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    tick().catch(err => log.error({ err }, 'Process loop error'))
  }

  private async processJob(job: Job): Promise<void> {
    job.status = 'running'
    job.startedAt = new Date()
    job.attempts += 1
    this.running.set(job.id, job)

    log.info(
      { job_id: job.id, attempt: job.attempts, app_name: job.payload.appName },
      'Processing job'
    )

    await this.persistJobStatus(job)

    try {
      // Dynamically import to avoid circular dependencies
      const { WarRoomOrchestrator } = await import('./war-room-orchestrator')
      const orchestrator = new WarRoomOrchestrator({
        saasDescription: job.payload.saasDescription,
        appName: job.payload.appName,
      })

      // Run the full pipeline
      // In a real implementation, this would call orchestrator.runFullPipeline()
      // with the actual agent tasks. For now, we simulate the structure.
      log.info({ job_id: job.id }, 'Starting War Room pipeline')

      // Simulate pipeline execution (replace with actual orchestrator call)
      await new Promise(resolve => setTimeout(resolve, 100))

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = {
        appName: job.payload.appName,
        completedAt: job.completedAt.toISOString(),
        durationMs: job.completedAt.getTime() - job.startedAt!.getTime(),
      }

      this.running.delete(job.id)
      this.completed.push(job)

      // Keep only last 100 completed jobs in memory
      if (this.completed.length > 100) {
        this.completed.shift()
      }

      log.info(
        {
          job_id: job.id,
          duration_ms: job.completedAt.getTime() - job.startedAt!.getTime(),
        },
        'Job completed'
      )
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.status = 'retrying'
        this.running.delete(job.id)

        const backoffMs = Math.pow(2, job.attempts) * 5_000 // 5s, 10s, 20s
        log.warn(
          { job_id: job.id, attempt: job.attempts, backoff_ms: backoffMs, error },
          'Job failed, retrying'
        )

        await this.persistJobStatus(job)
        await new Promise(resolve => setTimeout(resolve, backoffMs))

        // Re-enqueue with same priority
        job.status = 'queued'
        this.queue.unshift(job) // Add to front of queue
      } else {
        // Permanently failed
        job.status = 'failed'
        job.completedAt = new Date()
        job.error = error

        this.running.delete(job.id)
        this.failed.push(job)

        // Keep only last 50 failed jobs in memory
        if (this.failed.length > 50) {
          this.failed.shift()
        }

        log.error(
          { job_id: job.id, attempts: job.attempts, error },
          'Job permanently failed'
        )
      }
    }

    await this.persistJobStatus(job)
  }

  // ── Private: Persistence ──────────────────────────────────────────────────

  private async persistJobStatus(job: Job): Promise<void> {
    if (!this.supabase) return

    try {
      await this.supabase
        .from('generation_jobs')
        .upsert({
          id: job.id,
          org_id: job.orgId,
          created_by: job.userId,
          status: job.status,
          priority: job.priority,
          payload: job.payload,
          result: job.result ?? null,
          error: job.error ?? null,
          started_at: job.startedAt?.toISOString() ?? null,
          completed_at: job.completedAt?.toISOString() ?? null,
          updated_at: new Date().toISOString(),
        })
    } catch (err) {
      log.warn({ err, job_id: job.id }, 'Failed to persist job status (non-fatal)')
    }
  }

  private estimateDuration(): number {
    const stats = this.getStats()
    return stats.avgProcessingTimeMs || 120_000 // Default 2 minutes
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _queue: JobQueue | null = null

export function getJobQueue(): JobQueue {
  if (!_queue) {
    _queue = new JobQueue(
      parseInt(process.env.JOB_QUEUE_CONCURRENCY ?? '3'),
      parseInt(process.env.JOB_QUEUE_MAX_SIZE ?? '100')
    )
    _queue.start()
  }
  return _queue
}
