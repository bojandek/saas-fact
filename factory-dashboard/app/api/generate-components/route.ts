import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation, apiError } from '../../../lib/api-helpers'

const RequestSchema = z.object({
  saasDescription: z.string().min(10).max(1000),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
    borderRadius: z.string(),
  }),
  learnedRules: z.string().optional(),
})

export async function POST(request: Request) {
  return withAuth(request, async (userId) => {
    return withValidation(request, RequestSchema, async (body) => {
      try {
        // Dynamically import to avoid bundling issues
        const { generateSaaSComponents } = await import(
          '../../../../packages/ui/src/lib/llm-component-generator'
        )

        const result = await generateSaaSComponents(
          body.saasDescription,
          body.theme,
          body.learnedRules
        )

        return NextResponse.json({
          success: true,
          userId,
          ...result,
        })
      } catch (error) {
        return apiError('Component generation failed', 500)
      }
    })
  })
}
