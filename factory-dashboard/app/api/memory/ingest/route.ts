/**
 * POST /api/memory/ingest
 * Ingest text or file content into the Always-On Memory system.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation, errorResponse } from '@/lib/api-helpers'

const IngestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(50_000),
  source: z.string().optional().default('dashboard'),
  project_id: z.string().optional(),
})

export const POST = withAuth(async (req, userId) => {
  return withValidation(IngestSchema, req, async (body) => {
    try {
      // Dynamically import to avoid bundling server-only code
      const { ingestText } = await import('@factory-brain/memory')

      const result = await ingestText(body.text, body.source, body.project_id)

      return NextResponse.json({
        success: true,
        memory_id: result.memory_id,
        summary: result.summary,
        entities: result.entities,
        topics: result.topics,
        importance: result.importance,
        source: result.source,
      })
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Ingest failed', 500)
    }
  })
})
