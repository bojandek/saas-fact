/**
 * POST /api/memory/consolidate
 * Manually trigger a consolidation cycle.
 */

import { NextResponse } from 'next/server'
import { withAuth, errorResponse } from '../../../../lib/api-helpers'

export const POST = withAuth(async (_req, _userId) => {
  try {
    const { runConsolidationCycle } = await import('../../../../../factory-brain/src/memory')
    const result = await runConsolidationCycle(2, 10)

    if (!result) {
      return NextResponse.json({
        success: true,
        message: 'Not enough unconsolidated memories (minimum 2 required)',
        consolidated: false,
      })
    }

    return NextResponse.json({
      success: true,
      consolidated: true,
      memories_processed: result.memories_processed,
      insight: result.insight,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Consolidation failed', 500)
  }
})
