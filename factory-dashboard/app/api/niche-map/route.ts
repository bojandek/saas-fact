/**
 * POST /api/niche-map
 *
 * Maps a niche string to a full SaaS blueprint.
 * Used by the CLI and the dashboard UI.
 *
 * Body: { niche: string }
 * Response: NicheBlueprint
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { NicheMapper } from '../../../../factory-brain/src/niche-mapper'
import { logger } from '../../../../factory-brain/src/utils/logger'

const log = logger.child({ route: 'POST /api/niche-map' })

const NicheMapSchema = z.object({
  niche: z.string().min(2).max(100),
})

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = NicheMapSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { niche } = parsed.data
  log.info({ niche, userId }, 'Niche map request')

  try {
    const mapper = new NicheMapper()
    const blueprint = await mapper.mapNiche(niche)
    return NextResponse.json(blueprint)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ err, niche }, 'Niche mapping failed')
    return NextResponse.json({ error }, { status: 500 })
  }
}
