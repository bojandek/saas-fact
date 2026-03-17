/**
 * No-Code Export API Route
 * Converts a SaaS Factory blueprint to a target No-Code platform format.
 * Protected: requires authentication.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withValidation } from '../../../lib/api-helpers'

const RequestSchema = z.object({
  platform: z.enum(['flutterflow', 'bubble', 'zapier', 'retool']),
  blueprint: z.object({
    appName: z.string().min(1),
    description: z.string(),
    sqlSchema: z.string(),
    apiSpec: z.string(),
    features: z.array(z.string()),
    pricingModel: z.enum(['Freemium', 'Subscription', 'PayAsYouGo', 'Hybrid']),
    techStack: z.array(z.string()),
  }),
})

export const POST = withAuth(
  withValidation(RequestSchema, async (_req: NextRequest, { body }) => {
    const { platform, blueprint } = body

    // Dynamic import to avoid bundling server-side modules in edge runtime
    const { noCodeAdapterFactory } = await import(
      '../../../factory-brain-types'
    )

    const output = noCodeAdapterFactory.convert(platform, blueprint)

    return NextResponse.json({
      platform: output.platform,
      format: output.format,
      content: output.content,
      instructions: output.instructions,
      limitations: output.limitations,
    })
  })
)
