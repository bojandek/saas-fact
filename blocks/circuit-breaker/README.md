# Circuit Breaker Pattern

Production-grade circuit breaker implementation for resilient error handling and fallbacks.

## Features

- ✅ **State Management**: CLOSED → OPEN → HALF_OPEN state transitions
- ✅ **Automatic Recovery**: Configurable timeout for HALF_OPEN state
- ✅ **Fallback Strategies**: Custom fallback functions for graceful degradation
- ✅ **Metrics Tracking**: Request counts, failure rates, state history
- ✅ **Circuit Pool**: Manage multiple breakers simultaneously
- ✅ **Adapters**: Pre-built adapters for Stripe and Supabase

## Installation

```bash
pnpm add @saas-factory/blocks-circuit-breaker
```

## Basic Usage

### Simple Circuit Breaker

```typescript
import { CircuitBreaker } from '@saas-factory/blocks-circuit-breaker'

const breaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 2,    // Close after 2 successes
  timeout: 60000,         // Wait 60s before trying again
  fallback: async (error) => {
    // Return cached or default value
    return getCachedData()
  }
})

// Execute protected operation
try {
  const result = await breaker.execute(async () => {
    return await externalService.call()
  })
} catch (error) {
  // Handle circuit open or other errors
}
```

### Using Global Pool

```typescript
import { registerGlobalBreaker, getGlobalBreaker } from '@saas-factory/blocks-circuit-breaker'

// Register breaker
registerGlobalBreaker('stripe', {
  failureThreshold: 5,
  timeout: 120000,
})

// Use breaker
const breaker = getGlobalBreaker('stripe')
await breaker.execute(async () => {
  // Stripe payment logic
})
```

## Stripe Adapter

```typescript
import { StripeAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'

const stripe = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY,
  circuitBreakerConfig: {
    failureThreshold: 5,
    timeout: 120000, // Longer timeout for payment operations
  }
})

// Create payment intent with circuit breaker
const intent = await stripe.createPaymentIntent({
  amount: 5000,
  currency: 'usd',
  customer: customerId,
})

// Check health
const status = stripe.getStatus()
console.log(status.state) // 'CLOSED', 'OPEN', or 'HALF_OPEN'
```

## Supabase Adapter

```typescript
import { SupabaseAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'

const db = new SupabaseAdapter({
  circuitBreakerConfig: {
    failureThreshold: 10,
    timeout: 180000, // DB operations are slower
  }
})

// Execute query with circuit breaker + caching
const users = await db.query(
  'users:all',
  async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
    return data
  },
  {
    cache: true,
    cacheTTL: 60000 // Cache for 1 minute
  }
)

// Invalidate cache on data change
db.invalidate('users:all')

// Check if circuit is open (before making requests)
if (db.isCircuitOpen()) {
  console.log('Database circuit is open, using fallback')
}
```

## States & Transitions

```
CLOSED (normal operation)
  ↓ (after 5 failures)
OPEN (rejecting requests)
  ↓ (after 60s timeout)
HALF_OPEN (testing recovery)
  ↓ (success) ↓ (failure)
CLOSED      OPEN
```

## Monitoring

```typescript
const metrics = breaker.getMetrics()
console.log({
  totalRequests: metrics.totalRequests,
  successfulRequests: metrics.successfulRequests,
  failedRequests: metrics.failedRequests,
  consecutiveFailures: metrics.consecutiveFailures,
  state: breaker.getState(),
})
```

## Best Practices

1. **Use Different Thresholds**: Adjust for service criticality
   - Critical services: failureThreshold = 3
   - Non-critical: failureThreshold = 10

2. **Set Appropriate Timeouts**: Based on service response time
   - API calls: 60s
   - Payment processing: 120s
   - Database: 180s

3. **Implement Fallbacks**: Always have graceful degradation
   ```typescript
   fallback: async (error) => {
     // Return cached data
     // Return degraded response
     // Queue for async processing
   }
   ```

4. **Monitor Circuit State**: Alert on state changes
   ```typescript
   onStateChange: (state) => {
     monitoring.recordCircuitState('stripe', state)
   }
   ```

5. **Use Pools for Multiple Services**:
   ```typescript
   pool.registerBreaker('stripe', stripeConfig)
   pool.registerBreaker('sendgrid', emailConfig)
   pool.registerBreaker('supabase', dbConfig)
   ```

## Error Handling

```typescript
import { CircuitBreakerOpenError } from '@saas-factory/blocks-circuit-breaker'

try {
  await breaker.execute(operation)
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit is open - service is down
    return getCachedResponse()
  }
  // Other errors
  throw error
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { CircuitBreaker } from '@saas-factory/blocks-circuit-breaker'

describe('Payment Processing', () => {
  it('should fallback when stripe is down', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      fallback: async () => ({ id: 'cached' })
    })

    const fn = jest.fn().mockRejectedValue(new Error('Stripe down'))

    await expect(breaker.execute(fn)).rejects.toThrow()
    await expect(breaker.execute(fn)).resolves.toEqual({ id: 'cached' })
  })
})
```

## Production Deployment

1. **Monitor circuit state** with observability block
2. **Alert on state changes** (especially to OPEN)
3. **Use appropriate thresholds** for your SLA
4. **Implement fallbacks** for all critical services
5. **Test failure scenarios** in staging

See [Production Deployment Guide](../../PRODUCTION_DEPLOYMENT.md) for integration with monitoring and alerting.
