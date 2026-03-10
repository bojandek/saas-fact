import { stripe } from '../../lib/stripe-client';
import type { Stripe } from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed.`, { status: 400 });
  }

  // Handle subscription events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Sync with Supabase DB
      console.log('Subscription event:', event.data.object);
      break;
    default:
      console.log(`Unhandled event type [${event.type}]`);
  }

  return new Response('OK', { status: 200 });
}
