import { NextResponse } from 'next/server'
import { withAuth, apiError } from '../../../../lib/api-helpers'

export async function GET(request: Request) {
  return withAuth(request, async () => {
    try {
      const { getJobQueue } = await import('../../../../../factory-brain/src/job-queue')
      const queue = getJobQueue()
      const stats = queue.getStats()

      return NextResponse.json({
        ...stats,
        avgWaitMinutes: Math.ceil(stats.avgWaitTimeMs / 60_000),
        avgProcessingMinutes: Math.ceil(stats.avgProcessingTimeMs / 60_000),
      })
    } catch {
      return apiError('Failed to get queue stats', 500)
    }
  })
}
