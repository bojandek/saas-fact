import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation } from '../../../lib/api-helpers'
import { QaAgent } from '../../../../factory-brain/src/qa-agent'

const QaTestsInputSchema = z.object({
  saasDescription: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  generatedTheme: z.record(z.unknown()),
  generatedBlueprint: z.record(z.unknown()),
  generatedLandingPage: z.record(z.unknown()),
  generatedGrowthPlan: z.record(z.unknown()),
  context: z.record(z.unknown()).optional(),
})

export const POST = withAuth(
  withValidation(QaTestsInputSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const { saasDescription, appName, generatedTheme, generatedBlueprint, generatedLandingPage, generatedGrowthPlan, context } = body
    const qaAgent = new QaAgent(context)
    const { tests, messages, context: newContext } = await qaAgent.generateTests({
      saasDescription,
      appName,
      generatedTheme,
      generatedBlueprint,
      generatedLandingPage,
      generatedGrowthPlan,
      context,
    })
    return NextResponse.json({ tests, messages, context: newContext })
  })
)
