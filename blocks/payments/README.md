# @saas-factory/blocks-payments

Stripe payments block for subscriptions.

## Usage

```tsx
import { CheckoutButton } from '@saas-factory/blocks-payments';

<CheckoutButton priceId="price_123" />
```

## Webhooks

Add to `app/api/webhooks/route.ts`:

```ts
export { POST } from '@saas-factory/blocks-payments/api/webhooks/route';
```

## Env Vars

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

