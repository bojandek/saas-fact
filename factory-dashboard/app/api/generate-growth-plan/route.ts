import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, SaasDescriptionSchema } from '../../../lib/api-helpers'
import { GrowthHackerAgent } from '../../../../factory-brain/src/growth-hacker-agent'

export const POST = withAuth(
  withValidation(SaasDescriptionSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const growthHackerAgent = new GrowthHackerAgent()
    const plan = await growthHackerAgent.generateGrowthPlan(body.description)
    return NextResponse.json(plan)
  })
)
