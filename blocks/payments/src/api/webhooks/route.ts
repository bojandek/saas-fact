import { stripe } from '../../lib/stripe-client';
import type { Stripe } from 'stripe';
import { createServerClient } from '@saas-factory/auth';
import { createSubscription, updateSubscription, getSubscriptionByStripeId, getTenantByStripeCustomerId } from '@saas-factory/db';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return new Response(`Webhook signature verification failed.`, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const tenant = await getTenantByStripeCustomerId(customerId);
        if (!tenant) {
          console.warn(`Tenant not found for Stripe customer ID: ${customerId}`);
          return new Response('Tenant not found', { status: 404 });
        }

        const existingSubscription = await getSubscriptionByStripeId(subscription.id);

        const subscriptionData = {
          tenant_id: tenant.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan_name: subscription.items.data[0]?.price?.lookup_key || subscription.items.data[0]?.price?.id,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        if (existingSubscription) {
          await updateSubscription(existingSubscription.id, subscriptionData);
          console.log(`Updated subscription ${subscription.id} for tenant ${tenant.id}`);
        } else {
          await createSubscription(subscriptionData as any);
          console.log(`Created subscription ${subscription.id} for tenant ${tenant.id}`);
        }
        break;
      case 'customer.created':
        const customer = event.data.object as Stripe.Customer;
        // Optionally update tenant with stripe_customer_id if not already set
        // This might be handled during initial tenant creation, but good to have a fallback
        console.log('Customer created:', customer.id);
        break;
      default:
        console.log(`Unhandled event type [${event.type}]`);
    }
  } catch (error) {
    console.error('Error processing Stripe webhook event:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
