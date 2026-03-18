"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueue = void 0;
exports.getJobQueue = getJobQueue;
const logger_1 = require("./utils/logger");
const supabase_js_1 = require("@supabase/supabase-js");
const log = logger_1.logger.child({ module: 'JobQueue' });
// ── Job Queue ─────────────────────────────────────────────────────────────────
class JobQueue {
    constructor(maxConcurrency = 3, maxQueueSize = 100) {
        this.maxConcurrency = maxConcurrency;
        this.maxQueueSize = maxQueueSize;
        this.queue = [];
        this.running = new Map();
        this.completed = [];
        this.failed = [];
        this.workers = [];
        this.isRunning = false;
        this.supabase = null;
        // Initialize Supabase client if env vars are available
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            this.supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        }
    }
    /**
     * Start the queue processor.
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        log.info({ maxConcurrency: this.maxConcurrency }, 'Job queue started');
        this.processLoop();
    }
    /**
     * Stop the queue processor gracefully.
     */
    async stop() {
        this.isRunning = false;
        await Promise.all(this.workers);
        log.info('Job queue stopped');
    }
    /**
     * Add a job to the queue.
     */
    async enqueue(payload, priority = 5) {
        if (this.queue.length >= this.maxQueueSize) {
            throw new Error(`Queue is full (max ${this.maxQueueSize} jobs). Please try again later.`);
        }
        const job = {
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
        };
        // Insert into priority queue (sorted by priority desc, then queuedAt asc)
        const insertIndex = this.queue.findIndex(j => j.priority < job.priority ||
            (j.priority === job.priority && j.queuedAt > job.queuedAt));
        if (insertIndex === -1) {
            this.queue.push(job);
        }
        else {
            this.queue.splice(insertIndex, 0, job);
        }
        // Persist to Supabase
        await this.persistJobStatus(job);
        log.info({ job_id: job.id, priority: job.priority, queue_length: this.queue.length }, 'Job enqueued');
        return job;
    }
    /**
     * Cancel a queued job.
     */
    async cancel(jobId) {
        const index = this.queue.findIndex(j => j.id === jobId);
        if (index === -1)
            return false;
        const job = this.queue[index];
        job.status = 'cancelled';
        job.completedAt = new Date();
        this.queue.splice(index, 1);
        await this.persistJobStatus(job);
        log.info({ job_id: jobId }, 'Job cancelled');
        return true;
    }
    /**
     * Get job status by ID.
     */
    getJob(jobId) {
        return (this.queue.find(j => j.id === jobId) ??
            this.running.get(jobId) ??
            this.completed.find(j => j.id === jobId) ??
            this.failed.find(j => j.id === jobId) ??
            null);
    }
    /**
     * Get queue position for a job.
     */
    getQueuePosition(jobId) {
        const index = this.queue.findIndex(j => j.id === jobId);
        return index === -1 ? -1 : index + 1;
    }
    /**
     * Get estimated wait time for a queued job.
     */
    getEstimatedWaitMs(jobId) {
        const position = this.getQueuePosition(jobId);
        if (position === -1)
            return 0;
        const avgProcessingMs = this.getStats().avgProcessingTimeMs || 120000; // 2 min default
        const slotsAvailable = Math.max(0, this.maxConcurrency - this.running.size);
        const jobsAhead = Math.max(0, position - 1 - slotsAvailable);
        return jobsAhead * avgProcessingMs;
    }
    /**
     * Get queue statistics.
     */
    getStats() {
        const completedWithTime = this.completed.filter(j => j.startedAt && j.completedAt);
        const avgProcessingMs = completedWithTime.length > 0
            ? completedWithTime.reduce((sum, j) => sum + (j.completedAt.getTime() - j.startedAt.getTime()), 0) / completedWithTime.length
            : 0;
        const recentCompleted = this.completed.filter(j => j.completedAt && Date.now() - j.completedAt.getTime() < 3600000);
        return {
            queued: this.queue.length,
            running: this.running.size,
            completed: this.completed.length,
            failed: this.failed.length,
            avgWaitTimeMs: completedWithTime.length > 0
                ? completedWithTime.reduce((sum, j) => sum + (j.startedAt.getTime() - j.queuedAt.getTime()), 0) / completedWithTime.length
                : 0,
            avgProcessingTimeMs: avgProcessingMs,
            throughputPerHour: recentCompleted.length,
        };
    }
    // ── Private: Processing Loop ──────────────────────────────────────────────
    processLoop() {
        const tick = async () => {
            while (this.isRunning) {
                // Fill worker slots
                while (this.running.size < this.maxConcurrency && this.queue.length > 0) {
                    const job = this.queue.shift();
                    this.processJob(job);
                }
                // Wait 500ms before next tick
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        };
        tick().catch(err => log.error({ err }, 'Process loop error'));
    }
    async processJob(job) {
        job.status = 'running';
        job.startedAt = new Date();
        job.attempts += 1;
        this.running.set(job.id, job);
        log.info({ job_id: job.id, attempt: job.attempts, app_name: job.payload.appName }, 'Processing job');
        await this.persistJobStatus(job);
        try {
            // Use AutonomousGenerator — the real pipeline engine
            const { AutonomousGenerator } = await Promise.resolve().then(() => __importStar(require('./autonomous-generator.js')));
            const generator = new AutonomousGenerator();
            log.info({ job_id: job.id }, 'Starting AutonomousGenerator pipeline');
            const result = await generator.generate({
                description: job.payload.saasDescription,
                appName: job.payload.appName,
                orgId: job.payload.orgId,
                skipDeploy: job.payload.options?.skipDeploy ?? false,
                skipQA: job.payload.options?.skipQA ?? false,
                onProgress: (event) => {
                    log.info({ job_id: job.id, step: event.step, status: event.status, elapsed_ms: event.elapsedMs }, event.message);
                    // Persist progress update so clients can poll it
                    job.result = { ...(job.result ?? {}), lastStep: event };
                    this.persistJobStatus(job).catch(() => { });
                },
            });
            if (!result.success) {
                throw new Error(result.error ?? 'AutonomousGenerator returned failure');
            }
            job.status = 'completed';
            job.completedAt = new Date();
            job.result = {
                appName: result.appName,
                appPath: result.appPath,
                niche: result.niche,
                deployUrl: result.deployUrl,
                totalCostUsd: result.totalCostUsd,
                totalDurationMs: result.totalDurationMs,
                stepsCompleted: result.steps.filter(s => s.status === 'completed').length,
                completedAt: job.completedAt.toISOString(),
                durationMs: job.completedAt.getTime() - job.startedAt.getTime(),
            };
            this.running.delete(job.id);
            this.completed.push(job);
            // Keep only last 100 completed jobs in memory
            if (this.completed.length > 100) {
                this.completed.shift();
            }
            log.info({
                job_id: job.id,
                duration_ms: job.completedAt.getTime() - job.startedAt.getTime(),
            }, 'Job completed');
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            if (job.attempts < job.maxAttempts) {
                // Retry with exponential backoff
                job.status = 'retrying';
                this.running.delete(job.id);
                const backoffMs = Math.pow(2, job.attempts) * 5000; // 5s, 10s, 20s
                log.warn({ job_id: job.id, attempt: job.attempts, backoff_ms: backoffMs, error }, 'Job failed, retrying');
                await this.persistJobStatus(job);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                // Re-enqueue with same priority
                job.status = 'queued';
                this.queue.unshift(job); // Add to front of queue
            }
            else {
                // Permanently failed
                job.status = 'failed';
                job.completedAt = new Date();
                job.error = error;
                this.running.delete(job.id);
                this.failed.push(job);
                // Keep only last 50 failed jobs in memory
                if (this.failed.length > 50) {
                    this.failed.shift();
                }
                log.error({ job_id: job.id, attempts: job.attempts, error }, 'Job permanently failed');
            }
        }
        await this.persistJobStatus(job);
    }
    // ── Private: Persistence ──────────────────────────────────────────────────
    async persistJobStatus(job) {
        if (!this.supabase)
            return;
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
            });
        }
        catch (err) {
            log.warn({ err, job_id: job.id }, 'Failed to persist job status (non-fatal)');
        }
    }
    estimateDuration() {
        const stats = this.getStats();
        return stats.avgProcessingTimeMs || 120000; // Default 2 minutes
    }
}
exports.JobQueue = JobQueue;
// ── Singleton ─────────────────────────────────────────────────────────────────
let _queue = null;
function getJobQueue() {
    if (!_queue) {
        _queue = new JobQueue(parseInt(process.env.JOB_QUEUE_CONCURRENCY ?? '3'), parseInt(process.env.JOB_QUEUE_MAX_SIZE ?? '100'));
        _queue.start();
    }
    return _queue;
}
//# sourceMappingURL=job-queue.js.map