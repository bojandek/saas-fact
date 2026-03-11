import { stripe } from '../../lib/stripe-client'
import { createServerClient } from '@saas-factory/auth'
import { cookies } from 'next/headers'
import type { Stripe } from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET')
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  try {
    const data = event.data.object as Stripe.Subscription

    switch (event.type) {
      case 'customer.subscription.created': {
        const customer = await stripe.customers.retrieve(data.customer as string)
        const tenantId = customer.metadata?.tenant_id

        if (!tenantId) break

        const periodStart = new Date(data.current_period_start * 1000).toISOString()
        const periodEnd = new Date(data.current_period_end * 1000).toISOString()

        await supabase.from('subscriptions').insert({
          tenant_id: tenantId,
          stripe_subscription_id: data.id,
          status: data.status as any,
          plan_name: data.items.data[0]?.price.nickname || null,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: data.cancel_at_period_end || false,
        })

        const plan = data.items.data[0]?.price.nickname?.toLowerCase() || 'free'
        await supabase
          .from('tenants')
          .update({
            plan: plan as any,
            stripe_customer_id: data.customer,
          })
          .eq('id', tenantId)
        break
      }

      case 'customer.subscription.updated': {
        const periodStart = new Date(data.current_period_start * 1000).toISOString()
        const periodEnd = new Date(data.current_period_end * 1000).toISOString()

        await supabase
          .from('subscriptions')
          .update({
            status: data.status as any,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: data.cancel_at_period_end || false,
          })
          .eq('stripe_subscription_id', data.id)
        break
      }

      case 'customer.subscription.deleted': {
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', data.id)
        break
      }
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
