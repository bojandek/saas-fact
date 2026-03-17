import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, SaasDescriptionSchema } from '../../../lib/api-helpers'
import { LandingPageGenerator } from '../../../../factory-brain/src/landing-page-generator'

export const POST = withAuth(
  withValidation(SaasDescriptionSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const landingPageGenerator = new LandingPageGenerator()
    const content = await landingPageGenerator.generateContent(body.description)
    return NextResponse.json(content)
  })
)
