import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

export type StripeEvent = Stripe.Event
export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription

/**
 * Pronalaženje ili kreiranje Stripe customer-a
 */
export const getOrCreateStripeCustomer = async (
  email: string,
  name: string,
  tenantId: string
): Promise<StripeCustomer> => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (customers.data.length > 0 && customers.data[0].metadata.tenant_id === tenantId) {
    return customers.data[0]
  }

  return await stripe.customers.create({
    email,
    name,
    metadata: {
      tenant_id: tenantId,
    },
  })
}

/**
 * Pronalaženje subscription-a za customer-a
 */
export const getCustomerSubscription = async (
  customerId: string
): Promise<StripeSubscription | null> => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  return subscriptions.data[0] || null
}
