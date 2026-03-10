import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@saas-factory/ui';

let stripePromise: Promise<any>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

interface CheckoutButtonProps {
  priceId: string;
}

export function CheckoutButton({ priceId }: CheckoutButtonProps) {
  const handleCheckout = async () => {
    const stripe = await getStripe();
    const { error } = await stripe!.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: window.location.origin,
    });

    if (error) {
      console.error(error);
    }
  };

  return (
    <Button onClick={handleCheckout}>
      Subscribe
    </Button>
  );
}
