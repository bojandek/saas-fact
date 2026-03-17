import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withValidation, RagQuerySchema } from '../../../lib/api-helpers'
import { RAGSystem } from '../../../../factory-brain/src/rag'

export const POST = withAuth(
  withValidation(RagQuerySchema, async (_req: NextRequest, { body }) => {
    const ragSystem = new RAGSystem()
    const results = await ragSystem.search(body.query, body.category, body.limit)
    return NextResponse.json(results)
  })
)
