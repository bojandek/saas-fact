import { NextResponse } from 'next/server'
import { withAuth, apiError } from '../../../../lib/api-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (userId) => {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return apiError('jobId query parameter is required', 400)
    }

    try {
      const { getJobQueue } = await import('../../../../../factory-brain/src/job-queue')
      const queue = getJobQueue()
      const job = queue.getJob(jobId)

      if (!job) {
        return apiError('Job not found', 404)
      }

      // Security: only the job owner can see it
      if (job.userId !== userId) {
        return apiError('Forbidden', 403)
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        queuePosition: job.status === 'queued' ? queue.getQueuePosition(job.id) : null,
        estimatedWaitMs: job.status === 'queued' ? queue.getEstimatedWaitMs(job.id) : null,
        attempts: job.attempts,
        result: job.result ?? null,
        error: job.error ?? null,
        queuedAt: job.queuedAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        durationMs: job.startedAt && job.completedAt
          ? job.completedAt.getTime() - job.startedAt.getTime()
          : null,
      })
    } catch (error) {
      return apiError('Failed to get job status', 500)
    }
  })
}
