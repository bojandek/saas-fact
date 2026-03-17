import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, ThemeInputSchema } from '../../../lib/api-helpers'
import { ThemeGenerator } from '../../../../packages/ui/src/lib/theme-generator'

export const POST = withAuth(
  withValidation(ThemeInputSchema, async (req: NextRequest, { body }) => {
    // Rate limit: 10 requests per minute per IP
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const { description } = body
    const themeGenerator = new ThemeGenerator()
    const theme = await themeGenerator.generateTheme(description)
    return NextResponse.json(theme)
  })
)
