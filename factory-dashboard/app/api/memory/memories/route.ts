/**
 * GET /api/memory/memories?page=1&page_size=20&project_id=xxx
 * List all memories (paginated).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, errorResponse } from '../../../../lib/api-helpers'

export const GET = withAuth(async (req: NextRequest, _userId: string) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
    const projectId = searchParams.get('project_id') ?? undefined

    const { getAllMemories } = await import('../../../../../factory-brain/src/memory')
    const result = await getAllMemories(page, pageSize, projectId)

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to get memories', 500)
  }
})
