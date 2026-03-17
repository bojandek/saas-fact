/**
 * No-Code Export API Route
 * Converts a SaaS Factory blueprint to a target No-Code platform format.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { platform, blueprint } = parsed.data

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
