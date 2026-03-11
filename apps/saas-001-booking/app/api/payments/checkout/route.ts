import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@saas-factory/auth'
import { getOrCreateStripeCustomer } from '@saas-factory/payments'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 }
      )
    }

    // Get user session
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user
    const email = user.email || ''
    const name = user.user_metadata?.name || email

    // Get tenant_id from user metadata
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      email,
      name,
      userData.tenant_id
    )

    if (!customer.id) {
      return NextResponse.json(
        { error: 'Failed to create Stripe customer' },
        { status: 500 }
      )
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        tenant_id: userData.tenant_id,
        user_id: user.id,
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { checkoutUrl: checkoutSession.url },
      { status: 200 }
    )
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
