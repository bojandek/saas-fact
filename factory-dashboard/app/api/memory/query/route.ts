/**
 * POST /api/memory/query
 * Query the Always-On Memory system with a natural language question.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation, errorResponse } from '../../../../lib/api-helpers'

const QuerySchema = z.object({
  question: z.string().min(1, 'Question is required').max(1_000),
  project_id: z.string().optional(),
  match_threshold: z.number().min(0).max(1).optional().default(0.6),
  max_memories: z.number().int().min(1).max(20).optional().default(8),
})

export const POST = withAuth(async (req, _userId) => {
  return withValidation(QuerySchema, req, async (body) => {
    try {
      const { queryMemory } = await import('../../../../../factory-brain/src/memory')

      const result = await queryMemory(body.question, {
        matchThreshold: body.match_threshold,
        maxMemories: body.max_memories,
        projectId: body.project_id,
      })

      return NextResponse.json({
        success: true,
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources,
        memories_used: result.memories_used.map(m => ({
          id: m.id,
          summary: m.summary,
          source: m.source,
          source_type: m.source_type,
          topics: m.topics,
          similarity: m.similarity,
          importance: m.importance,
        })),
        consolidations_used: result.consolidations_used.map(c => ({
          id: c.id,
          insight: c.insight,
          similarity: c.similarity,
        })),
      })
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Query failed', 500)
    }
  })
})
