# Stripe API Design: Idempotency, Webhooks, Versioning

## Stripe API Philosophy

### Core Design Principles
```typescript
// Stripe's API is designed around:
// 1. Idempotency (safe retries)
// 2. Immutability (state based, not action based)
// 3. Resource-oriented (REST principles)
// 4. Versioning (backward compatibility)
// 5. Webhooks (async event-driven architecture)

interface StripeAPIDesignPrinciples {
  // Principle 1: Idempotency
  idempotency: "Every operation is safe to retry",
  
  // Principle 2: Immutability
  immutability: "Resources are states, not commands",
  
  // Principle 3: Resource-oriented
  resourceOriented: "Objects with clear hierarchies",
  
  // Principle 4: API Versioning
  versioning: "Requests pin to API version",
  
  // Principle 5: Webhooks
  webhooks: "Event-driven hooks for async operations",
}
```

---

## Idempotency: The Foundation of Safe Retries

### Why Idempotency Matters

```
Network failure scenario (without idempotency):
1. Client sends POST /charges → Create charge: $100
2. Server creates charge, processes payment
3. Network dies before response
4. Client retries POST /charges
5. Server creates ANOTHER charge: $100
6. Result: $200 charged (DISASTER)

With idempotency (Stripe model):
1. Client sends POST /charges + Idempotency-Key: "key-12345"
2. Server creates charge: $100, stores key-12345→charge
3. Network dies before response
4. Client retries with same Idempotency-Key
5. Server recognizes key, returns cached charge
6. Result: $100 charged (CORRECT)
```

### Implementing Idempotency

```typescript
// Stripe API idempotency header pattern
interface ChargeCreationRequest {
  amount: number;
  currency: string;
  source: string;
  headers: {
    "Idempotency-Key": string; // Client generates UUID
    "Stripe-Version": string;  // API version pinning
  };
}

// Example: Safe charge creation
const createChargeIdempotent = async () => {
  const idempotencyKey = generateUUID(); // Client generates once
  
  // First attempt
  try {
    const charge = await stripe.charges.create(
      {
        amount: 10000,      // $100.00
        currency: "usd",
        source: "tok_visa",
      },
      {
        idempotencyKey: idempotencyKey, // Include key
      }
    );
    return charge;
  } catch (error) {
    if (error.statusCode === 500 || error.statusCode === 502) {
      // Network error, safe to retry
      // Retry with SAME idempotencyKey
      const charge = await stripe.charges.create(
        {
          amount: 10000,
          currency: "usd",
          source: "tok_visa",
        },
        {
          idempotencyKey: idempotencyKey, // Same key = same result
        }
      );
      return charge;
    }
    throw error;
  }
};
```

### Idempotency Backend Implementation

```typescript
// Implementing idempotency in your SaaS backend

interface IdempotencyCache {
  key: string;
  method: string;      // POST, PUT, etc.
  endpoint: string;
  requestBody: object;
  responseBody: object;
  statusCode: number;
  timestamp: Date;
  ttl: number;         // Cache for 24 hours
}

// Database schema
const idempotencySchema = {
  idempotency_key: { type: "VARCHAR", pk: true },
  method: { type: "VARCHAR" },
  endpoint: { type: "VARCHAR" },
  request_hash: { type: "VARCHAR" },      // Hash to verify same request
  response_body: { type: "JSON" },
  status_code: { type: "INT" },
  created_at: { type: "TIMESTAMP" },
  expires_at: { type: "TIMESTAMP" },      // 24-hour TTL
};

// Middleware implementation
export async function idempotencyMiddleware(req, res, next) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next(); // GET/DELETE don't need idempotency
  }

  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return next(); // No key, proceed normally
  }

  const requestHash = hashRequest(req.method, req.path, req.body);

  // Check cache
  const cached = await db.idempotency.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (cached) {
    // Found cached response
    if (cached.request_hash !== requestHash) {
      // Different request with same key = error
      return res.status(400).json({
        error: "Idempotency-Key used with different request",
      });
    }

    // Same request + key = return cached response
    return res.status(cached.status_code).json(cached.response_body);
  }

  // No cache, proceed with request
  const originalJson = res.json;
  let responseBody: any;

  res.json = function (body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.on("finish", async () => {
    // After response sent, cache it
    if (res.statusCode < 400) {
      // Only cache successful responses
      await db.idempotency.create({
        data: {
          idempotency_key: idempotencyKey,
          method: req.method,
          endpoint: req.path,
          request_hash: requestHash,
          response_body: responseBody,
          status_code: res.statusCode,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
  });

  next();
}
```

---

## Webhooks: Event-Driven Architecture

### Why Webhooks Matter

```
Polling model (inefficient):
Client: "Any updates?" → Server: "No"
Client: "Any updates?" → Server: "No"
Client: "Any updates?" → Server: "Yes! Payment failed"
(10,000 unnecessary requests)

Webhook model (efficient):
Server: "Payment processing..." → 3 seconds later
Server → Client: "payment.failed" webhook
(1 instant notification)
```

### Webhook Event Types

```typescript
// Stripe webhook events

interface StripeWebhookEvent {
  id: string;
  type: string;           // Event type
  created: number;        // Unix timestamp
  data: {
    object: any;          // The resource that changed
    previous_attributes?: any; // What changed
  };
}

// Common SaaS webhook events
const webhookTypes = {
  // Payment events
  "charge.succeeded": "Charge completed successfully",
  "charge.failed": "Charge attempt failed",
  "charge.refunded": "Charge was refunded",
  "charge.dispute.created": "Customer disputed charge",

  // Customer events
  "customer.created": "New customer created",
  "customer.updated": "Customer info changed",
  "customer.deleted": "Customer deleted",

  // Subscription events (critical for SaaS)
  "customer.subscription.created": "Subscription started",
  "customer.subscription.updated": "Subscription changed",
  "customer.subscription.deleted": "Subscription canceled",
  "customer.subscription.trial_will_end": "Trial ending in 3 days",

  // Invoice events
  "invoice.created": "Invoice generated",
  "invoice.payment_succeeded": "Invoice paid",
  "invoice.payment_failed": "Invoice payment failed",
  "invoice.upcoming": "Upcoming invoice preview",
};
```

### Webhook Implementation

```typescript
// pages/api/webhooks/stripe.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  // Verify webhook signature (CRITICAL: prevents spoofing)
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                           // Raw body (not JSON.parse'd)
      req.headers["stripe-signature"] as string,
      webhookSecret
    );
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error}`);
    return res.status(400).send(`Webhook Error: ${error}`);
  }

  // Process webhook based on type
  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { customer, id: subscriptionId, status } = subscription;

  // Update user subscription in DB
  await prisma.subscription.create({
    data: {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customer as string,
      status: status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Send customer welcome email
  await sendEmail({
    to: subscription.billling_details?.email,
    template: "subscription-welcome",
    data: { subscription },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Update subscription in DB
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Record payment
  await prisma.payment.create({
    data: {
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      amount: invoice.total,
      currency: invoice.currency,
      status: "succeeded",
      paidAt: new Date(),
    },
  });

  // Unlock customer access (important for renewal payments)
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (subscription) {
    await prisma.user.update({
      where: { subscriptionId: subscription.id },
      data: { accessLevel: "active" },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Lock customer access if payment fails
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (subscription) {
    await prisma.user.update({
      where: { subscriptionId: subscription.id },
      data: { accessLevel: "suspended" },
    });
  }

  // Send retry email
  await sendEmail({
    to: invoice.receipt_email,
    template: "payment-failed-retry",
    data: { invoice, retryUrl: generateRetryUrl(invoice.id) },
  });
}
```

### Webhook Reliability Patterns

```typescript
// Webhook processing should be idempotent too
interface WebhookProcessing {
  // Pattern 1: Idempotent webhook handlers
  async function handleWebhookIdempotent(event: Stripe.Event) {
    // Check if we've already processed this event
    const processed = await db.webhookLog.findUnique({
      where: { stripeEventId: event.id },
    });

    if (processed) {
      // Already processed, return cached result
      return;
    }

    // Process
    await processWebhook(event);

    // Log as processed
    await db.webhookLog.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        timestamp: new Date(event.created * 1000),
      },
    });
  },

  // Pattern 2: Exponential backoff for failures
  async function handleWebhookWithRetry(event: Stripe.Event) {
    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await processWebhook(event);
        return;
      } catch (error) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s, 16s, 32s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Log failed webhook for manual review
    await db.webhookFailedLog.create({
      data: {
        stripeEventId: event.id,
        error: error.message,
      },
    });
  },
}
```

---

## API Versioning: Backward Compatibility

### Why Versioning Matters

```typescript
// Without versioning:
// 2024: API returns { id, amount, status }
// 2025: API adds new required field { id, amount, status, currency }
// OLD clients: BREAK (missing currency field)

// With versioning (Stripe model):
// 2024: Client pins to "2024-01-01" version
// 2025: New fields added, but old version still works
// Client can upgrade at own pace
```

### Stripe API Versioning Strategy

```typescript
// Version locked per request (header or account-level)

interface APIVersioning {
  // Option 1: Account-level version (default)
  // Set once in Stripe dashboard or via API
  accountDefaultVersion: "2024-01-01",

  // Option 2: Per-request version (override)
  perRequestVersion: {
    headers: {
      "Stripe-Version": "2024-01-01", // Override account default
    },
  },
}

// Example: Making request with specific version
const retrieveCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId, {
    stripeAccount: "acct_1234567890acctid",
    apiVersion: "2024-01-01", // Pin to this version
  });
  return customer;
};

// Version changes are documented
const versionChanges = {
  "2024-01-01": {
    breaking: [
      "Removed deprecated 'card' field from Customer",
      "Renamed 'sources' to 'payment_sources'",
    ],
    new: [
      "Added 'tax_ids' field to Customer",
      "Added customer portal for subscription management",
    ],
  },
  "2023-10-16": {
    breaking: [
      "Changed 'dispute.status' to require explicit actions",
    ],
    new: [
      "Added Radar for fraud prevention",
    ],
  },
};
```

### Implementing Versioning in Your SaaS

```typescript
// Define your API versions
export enum APIVersion {
  V1 = "2024-01-01",
  V2 = "2024-06-01",
}

// Store version in database with integration
interface StripeIntegration {
  accountId: string;
  apiVersion: APIVersion;
}

// Customer relationship
interface Customer {
  id: string;
  userId: string;
  stripeCustomerId: string;
  apiVersion: APIVersion;  // Track which version created this
}

// When processing webhook, use customer's version
export async function handleWebhookByCustomerVersion(event: Stripe.Event) {
  const customerId = event.data.object.customer;
  
  // Get customer's API version
  const customer = await db.customer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  // Process using their version
  const apiVersion = customer.apiVersion;

  if (apiVersion === APIVersion.V1) {
    return handleWebhookV1(event);
  } else if (apiVersion === APIVersion.V2) {
    return handleWebhookV2(event);
  }
}

// Support multiple versions
function handleWebhookV1(event: Stripe.Event) {
  // V1-specific logic
  // Still support deprecated fields
}

function handleWebhookV2(event: Stripe.Event) {
  // V2 logic with new fields
}
```

---

## Request/Response Lifecycle

### Anatomy of a Stripe API Call

```
Client Request:
POST /v1/charges
Content-Type: application/x-www-form-urlencoded
Idempotency-Key: unique-key-12345
Stripe-Version: 2024-01-01
Authorization: Bearer sk_live_xxxxx

amount=10000&currency=usd&customer=cus_1234567890

↓

Server Processing:
1. Verify API key (authentication)
2. Check rate limits (prevent abuse)
3. Look up Idempotency-Key cache
   - If found and valid: return cached response
4. Parse request, validate inputs
5. Update database (charge creation)
6. Trigger webhooks (async)
7. Return response

Server Response:
HTTP/200 OK
Content-Type: application/json

{
  "id": "ch_1A8R7nE5k5m3g0L0Wx0R0v5S",
  "object": "charge",
  "amount": 10000,
  "currency": "usd",
  "customer": "cus_1234567890",
  "status": "succeeded",
  "created": 1234567890
}

↓

Client Receives:
- Response cached under Idempotency-Key
- Ready for retry if needed
```

---

## Error Handling & Retry Strategy

```typescript
// Stripe error types
interface StripeErrorStrategy {
  // Rate limit (429): Retry with exponential backoff
  rateLimitError: {
    statusCode: 429,
    action: "Retry after 1, 2, 4, 8 seconds",
    isRetryable: true,
  },

  // Server error (500, 502, 503): Retry with exponential backoff
  serverError: {
    statusCode: 500,
    action: "Retry up to 3 times",
    isRetryable: true,
  },

  // Validation error (400): Don't retry
  validationError: {
    statusCode: 400,
    action: "Fix request and retry as new request",
    isRetryable: false,
  },

  // Authentication error (401): Don't retry
  authenticationError: {
    statusCode: 401,
    action: "Fix API key and retry",
    isRetryable: false,
  },

  // Idempotency error (409): Safe to retry with new key
  idempotencyError: {
    statusCode: 409,
    action: "Retry with new Idempotency-Key",
    isRetryable: false, // But retry with different key
  },
}

// Retry implementation
async function stripeCallWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error; // Don't retry non-retryable errors
      }

      if (attempt < maxRetries - 1) {
        // Calculate backoff
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError;
}

function isRetryable(error: any): boolean {
  const retryableStatusCodes = [429, 500, 502, 503, 504];
  return retryableStatusCodes.includes(error.statusCode);
}
```

---

## SaaS-Specific Stripe Patterns

### Subscription Lifecycle Management

```typescript
interface SaaSSub​scriptionLifecycle {
  // Trial phase
  trial: {
    duration: 14,
    billing: "Free, no payment needed",
    webhook: "customer.subscription.created",
  },

  // Active phase
  active: {
    billing: "Recurring every billing cycle",
    webhook: "invoice.payment_succeeded",
  },

  // Renewal phase
  renewal: {
    trigger: "7 days before cycle end",
    webhook: "customer.subscription.trial_will_end",
    action: "Send sunset email",
  },

  // Churn phase
  churn: {
    trigger: "Cancel button clicked",
    webhook: "customer.subscription.deleted",
    action: "Retain survey, offer discount",
  },
}

// Implementation
async function handleSubscriptionRenewal(subscription: Stripe.Subscription) {
  const daysRemaining = Math.floor(
    (subscription.current_period_end - Date.now() / 1000) / 86400
  );

  if (daysRemaining <= 7) {
    // Renewal soon, send warning email
    await sendEmail({
      template: "renewal-reminder",
      data: { daysRemaining, subscription },
    });

    // Offer retention discount
    const coupon = await stripe.coupons.create({
      percent_off: 20,
      duration: "once",
      duration_in_months: 1,
    });

    // Send in email
  }
}
```

---

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Idempotency Best Practices](https://stripe.com/docs/api/idempotent_requests)
- [SaaS Billing Patterns](https://www.profitwell.com/blog) (ProfitWell)
