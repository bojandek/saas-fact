import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation, apiError } from '../../../../lib/api-helpers'

const CancelSchema = z.object({
  jobId: z.string(),
})

export async function POST(request: Request) {
  return withAuth(request, async (userId) => {
    return withValidation(request, CancelSchema, async (body) => {
      try {
        const { getJobQueue } = await import('../../../../../factory-brain/src/job-queue')
        const queue = getJobQueue()

        const job = queue.getJob(body.jobId)
        if (!job) return apiError('Job not found', 404)
        if (job.userId !== userId) return apiError('Forbidden', 403)
        if (job.status !== 'queued') return apiError('Only queued jobs can be cancelled', 400)

        const cancelled = await queue.cancel(body.jobId)
        return NextResponse.json({ success: cancelled, jobId: body.jobId })
      } catch {
        return apiError('Failed to cancel job', 500)
      }
    })
  })
}
