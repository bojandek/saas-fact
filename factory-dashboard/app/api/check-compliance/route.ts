import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation } from '../../../lib/api-helpers'
import { ComplianceCheckerAgent } from '../../../../factory-brain/src/compliance-checker-agent'

const ComplianceInputSchema = z.object({
  saasDescription: z.string().min(10).max(2000),
  generatedTheme: z.record(z.unknown()).optional(),
  generatedBlueprint: z.record(z.unknown()).optional(),
  generatedLandingPage: z.record(z.unknown()).optional(),
  generatedGrowthPlan: z.record(z.unknown()).optional(),
})

export const POST = withAuth(
  withValidation(ComplianceInputSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const { saasDescription, generatedTheme, generatedBlueprint, generatedLandingPage, generatedGrowthPlan } = body
    const complianceCheckerAgent = new ComplianceCheckerAgent()
    const results = await complianceCheckerAgent.checkCompliance(
      saasDescription,
      generatedTheme,
      generatedBlueprint,
      generatedLandingPage,
      generatedGrowthPlan
    )
    return NextResponse.json(results)
  })
)
