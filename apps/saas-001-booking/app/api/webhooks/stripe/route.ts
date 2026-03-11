import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@saas-factory/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = (subscription.items.data[0]?.price.id as string) || ''

      // Get customer to find tenant_id in metadata
      const customer = await stripe.customers.retrieve(customerId)
      const tenantId = (customer.metadata?.tenant_id as string) || ''

      if (!tenantId) {
        console.error('No tenant_id in customer metadata')
        return NextResponse.json(
          { error: 'No tenant_id found' },
          { status: 400 }
        )
      }

      // Get price to find plan name
      const price = await stripe.prices.retrieve(priceId)
      const planName = (price.nickname || 'custom') as string

      // Upsert subscription in database
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            tenant_id: tenantId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan_name: planName,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
            updated_at: new Date(),
          },
          {
            onConflict: 'stripe_subscription_id',
          }
        )

      if (error) {
        console.error('Failed to upsert subscription:', error)
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }

      // Update tenant plan based on subscription status
      if (subscription.status === 'active') {
        await supabase
          .from('tenants')
          .update({
            plan: planName || 'pro',
            updated_at: new Date(),
          })
          .eq('id', tenantId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Get customer to find tenant_id
      const customer = await stripe.customers.retrieve(customerId)
      const tenantId = (customer.metadata?.tenant_id as string) || ''

      if (!tenantId) {
        console.error('No tenant_id in customer metadata')
        return NextResponse.json(
          { error: 'No tenant_id found' },
          { status: 400 }
        )
      }

      // Mark subscription as canceled
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Failed to update subscription:', error)
        return NextResponse.json(
          { error: 'Failed to cancel subscription' },
          { status: 500 }
        )
      }

      // Reset tenant plan to free
      await supabase
        .from('tenants')
        .update({
          plan: 'free',
          updated_at: new Date(),
        })
        .eq('id', tenantId)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
