import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, SaasDescriptionSchema } from '../../../lib/api-helpers'
import { ArchitectAgent } from '../../../../factory-brain/src/architect-agent'

export const POST = withAuth(
  withValidation(SaasDescriptionSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const architectAgent = new ArchitectAgent()
    const blueprint = await architectAgent.generateBlueprint(body.description)
    return NextResponse.json(blueprint)
  })
)
