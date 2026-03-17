/**
 * POST /api/billing/checkout
 * Creates a Stripe checkout session for upgrading to PRO or AGENCY tier.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUsageBillingService } from '@saas-factory/factory-brain/billing/usage-billing'

const CheckoutSchema = z.object({
  tier: z.enum(['pro', 'agency']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = request.headers.get('x-user-id')
  const orgId = request.headers.get('x-org-id')

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { tier, successUrl, cancelUrl } = parsed.data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const billingService = getUsageBillingService()
    const session = await billingService.createCheckoutSession({
      orgId,
      userId,
      tier,
      successUrl: successUrl ?? `${baseUrl}/pricing?success=true`,
      cancelUrl: cancelUrl ?? `${baseUrl}/pricing?cancelled=true`,
    })

    return NextResponse.json({ url: session.url, sessionId: session.sessionId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
