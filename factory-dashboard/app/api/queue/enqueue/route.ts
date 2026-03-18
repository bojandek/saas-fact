import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation, apiError } from '../../../../lib/api-helpers'

const EnqueueSchema = z.object({
  saasDescription: z.string().min(10).max(2000),
  appName: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'App name must be lowercase alphanumeric with hyphens'),
  orgId: z.string().min(1).max(100).optional(),
  priority: z.number().int().min(1).max(10).optional().default(5),
  options: z.object({
    skipDeploy: z.boolean().optional(),
    skipQA: z.boolean().optional(),
    theme: z.record(z.string()).optional(),
  }).optional(),
})

export async function POST(request: Request) {
  return withAuth(request, async (userId) => {
    return withValidation(request, EnqueueSchema, async (body) => {
      try {
        const { getJobQueue } = await import('../../../../../factory-brain/src/job-queue')
        const queue = getJobQueue()

        const job = await queue.enqueue(
          {
            saasDescription: body.saasDescription,
            appName: body.appName,
            orgId: body.orgId ?? userId,
            userId,
            options: body.options,
          },
          body.priority
        )

        const stats = queue.getStats()
        const estimatedWaitMs = queue.getEstimatedWaitMs(job.id)

        return NextResponse.json({
          success: true,
          jobId: job.id,
          status: job.status,
          queuePosition: queue.getQueuePosition(job.id),
          estimatedWaitMs,
          estimatedWaitMinutes: Math.ceil(estimatedWaitMs / 60_000),
          queueStats: {
            queued: stats.queued,
            running: stats.running,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enqueue job'
        if (message.includes('Queue is full')) {
          return apiError(message, 429)
        }
        return apiError(message, 500)
      }
    })
  })
}
