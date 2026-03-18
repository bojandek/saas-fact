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
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export interface JobPayload {
    saasDescription: string;
    appName: string;
    orgId: string;
    userId: string;
    projectId?: string;
    options?: {
        skipDeploy?: boolean;
        skipQA?: boolean;
        theme?: Record<string, string>;
    };
}
export interface Job {
    id: string;
    orgId: string;
    userId: string;
    payload: JobPayload;
    status: JobStatus;
    priority: number;
    attempts: number;
    maxAttempts: number;
    result?: unknown;
    error?: string;
    queuedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    estimatedDurationMs?: number;
}
export interface QueueStats {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    avgWaitTimeMs: number;
    avgProcessingTimeMs: number;
    throughputPerHour: number;
}
export declare class JobQueue {
    private readonly maxConcurrency;
    private readonly maxQueueSize;
    private queue;
    private running;
    private completed;
    private failed;
    private workers;
    private isRunning;
    private supabase;
    constructor(maxConcurrency?: number, maxQueueSize?: number);
    /**
     * Start the queue processor.
     */
    start(): void;
    /**
     * Stop the queue processor gracefully.
     */
    stop(): Promise<void>;
    /**
     * Add a job to the queue.
     */
    enqueue(payload: JobPayload, priority?: number): Promise<Job>;
    /**
     * Cancel a queued job.
     */
    cancel(jobId: string): Promise<boolean>;
    /**
     * Get job status by ID.
     */
    getJob(jobId: string): Job | null;
    /**
     * Get queue position for a job.
     */
    getQueuePosition(jobId: string): number;
    /**
     * Get estimated wait time for a queued job.
     */
    getEstimatedWaitMs(jobId: string): number;
    /**
     * Get queue statistics.
     */
    getStats(): QueueStats;
    private processLoop;
    private processJob;
    private persistJobStatus;
    private estimateDuration;
}
export declare function getJobQueue(): JobQueue;
//# sourceMappingURL=job-queue.d.ts.map