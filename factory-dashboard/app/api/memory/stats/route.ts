/**
 * GET /api/memory/stats
 * Get memory system statistics.
 */

import { NextResponse } from 'next/server'
import { withAuth, errorResponse } from '@/lib/api-helpers'

export const GET = withAuth(async (_req, _userId) => {
  try {
    const { getMemoryStats } = await import('@factory-brain/memory')
    const stats = await getMemoryStats()
    return NextResponse.json({ success: true, stats })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to get stats', 500)
  }
})
