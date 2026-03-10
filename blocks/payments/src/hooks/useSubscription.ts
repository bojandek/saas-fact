import { useState, useEffect } from 'react';
import { stripe } from '../lib/stripe-client';

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current subscription from Supabase or Stripe customer
    setLoading(false);
  }, []);

  return { subscription, loading };
}
