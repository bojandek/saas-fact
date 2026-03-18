/**
 * Stripe Webhook Handler for SaaS Factory billing events.
 * Route: POST /api/webhooks/stripe
 *
 * This route is intentionally NOT protected by auth middleware
 * (Stripe sends webhooks without user sessions).
 * Security is enforced via HMAC signature verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUsageBillingService } from '../../../../../factory-brain/src/billing/usage-billing'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    )
  }

  try {
    const billingService = getUsageBillingService()
    const result = await billingService.handleWebhook(rawBody, signature)

    if (!result.handled) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ received: true, event: result.event })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
