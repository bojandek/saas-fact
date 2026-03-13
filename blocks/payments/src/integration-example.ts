/**
 * Complete Integration Example
 * Shows how to use Circuit Breaker, Intelligent Cache, Monitoring, and Zero-Downtime Migrations together
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { StripeAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'
import { SupabaseAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'
import { getCacheManager } from '@saas-factory/blocks-cache'
import { getMonitoringEngine } from '@saas-factory/blocks-observability'

/**
 * Payment Service - Full Production Implementation
 */
export class ProductionPaymentService {
  private stripeAdapter: StripeAdapter
  private dbAdapter: SupabaseAdapter
  private cache = getCacheManager()
  private monitoring = getMonitoringEngine()

  constructor(
    private supabase: ReturnType<typeof createClient>,
    stripeApiKey: string
  ) {
    this.stripeAdapter = new StripeAdapter({
      apiKey: stripeApiKey,
      circuitBreakerConfig: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 120000,
        onStateChange: (state) => {
          console.log(`[Stripe] Circuit: ${state}`)
          // Alert on state changes
          if (state === 'OPEN') {
            this.monitoring.registerAlert({
              id: `stripe_${Date.now()}`,
              name: 'Stripe Circuit Breaker is OPEN',
              condition: () => false,
              severity: 'critical',
              channels: ['slack', 'pagerduty'],
              enabled: true,
            })
          }
        },
      },
    })

    this.dbAdapter = new SupabaseAdapter({
      circuitBreakerConfig: {
        failureThreshold: 10,
        timeout: 180000,
      },
    })
  }

  /**
   * Create payment with full resilience
   */
  async createPayment(
    userId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<{
    intentId: string
    clientSecret: string
    status: 'success' | 'queued' | 'fallback'
  }> {
    const startTime = Date.now()

    try {
      // Get user from cache or DB
      const user = await this.cache.get(
        `user:${userId}`,
        async () => {
          return this.dbAdapter.query(`user:${userId}`, async () => {
            const { data } = await this.supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single()
            return data
          })
        },
        { ttl: 3600, tags: ['users'] }
      )

      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }

      // Get or create Stripe customer
      const customerId = await this.cache.swr(
        `stripe_customer:${userId}`,
        async () => {
          const intent = await this.stripeAdapter.createPaymentIntent({
            amount,
            currency,
            customer: user.stripe_customer_id,
            metadata: {
              userId,
              timestamp: new Date().toISOString(),
            },
          })
          return intent.customer as string
        },
        { ttl: 86400, staleAge: 604800 }
      )

      // Create payment intent
      const intent = await this.stripeAdapter.createPaymentIntent({
        amount,
        currency,
        customer: customerId,
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
        },
      })

      // Record in database with circuit breaker + cache
      await this.dbAdapter.query(
        `payment:${intent.id}`,
        async () => {
          const { error } = await this.supabase.from('payments').insert({
            stripe_intent_id: intent.id,
            user_id: userId,
            amount,
            currency,
            status: 'pending',
            customer_id: customerId,
            created_at: new Date(),
          })

          if (error) throw error
          return { intentId: intent.id }
        },
        { cache: false }
      )

      // Track metrics
      const duration = Date.now() - startTime
      console.log(`[Payment] Created intent ${intent.id} in ${duration}ms`)

      return {
        intentId: intent.id,
        clientSecret: intent.client_secret || '',
        status: 'success',
      }
    } catch (error) {
      // Check if circuits are open
      const stripeOpen = this.stripeAdapter.getStatus().state === 'OPEN'
      const dbOpen = this.dbAdapter.isCircuitOpen()

      if (stripeOpen || dbOpen) {
        console.warn('[Payment] Circuit breaker is open, queuing payment')

        // Queue payment for manual processing
        await this.queuePaymentForManualProcessing(userId, amount, currency)

        return {
          intentId: `queued_${Date.now()}`,
          clientSecret: '',
          status: 'queued',
        }
      }

      // Use fallback cache
      const cachedIntent = this.stripeAdapter.getCachedPaymentIntent(
        `cached_${userId}`
      )

      if (cachedIntent) {
        return {
          intentId: cachedIntent.id,
          clientSecret: cachedIntent.client_secret || '',
          status: 'fallback',
        }
      }

      throw error
    }
  }

  /**
   * Confirm payment with resilience
   */
  async confirmPayment(
    intentId: string,
    paymentMethodId: string
  ): Promise<{
    status: 'succeeded' | 'processing' | 'queued'
    intentId: string
  }> {
    try {
      // Confirm with circuit breaker
      const intent = await this.stripeAdapter.confirmPaymentIntent(intentId, {
        payment_method: paymentMethodId,
      })

      // Update database
      await this.dbAdapter.query(
        `payment:${intentId}:confirm`,
        async () => {
          await this.supabase
            .from('payments')
            .update({
              status: intent.status,
              confirmed_at: new Date(),
            })
            .eq('stripe_intent_id', intentId)
        },
        { cache: false }
      )

      // Invalidate cache
      await this.cache.invalidatePattern(/^user:/)

      return {
        status: intent.status as 'succeeded' | 'processing',
        intentId: intent.id,
      }
    } catch (error) {
      // Queue for manual processing
      await this.queuePaymentForManualProcessing(
        '',
        0,
        'usd',
        intentId
      )

      return {
        status: 'queued',
        intentId,
      }
    }
  }

  /**
   * Get payment with caching & SWR
   */
  async getPayment(intentId: string) {
    return this.cache.swr(
      `payment:${intentId}`,
      async () => {
        return this.dbAdapter.query(
          `payment:${intentId}:get`,
          async () => {
            const { data } = await this.supabase
              .from('payments')
              .select('*')
              .eq('stripe_intent_id', intentId)
              .single()
            return data
          },
          { cache: true }
        )
      },
      { ttl: 300, staleAge: 600 }
    )
  }

  /**
   * Get pricing plans with caching
   */
  async getPricingPlans() {
    return this.cache.get(
      'pricing:plans',
      async () => {
        return this.dbAdapter.query(
          'pricing:plans:get',
          async () => {
            const { data } = await this.supabase
              .from('pricing_plans')
              .select('*')
              .order('price', { ascending: true })
            return data
          }
        )
      },
      { ttl: 86400, tags: ['pricing'] }
    )
  }

  /**
   * Get subscription with fallback
   */
  async getSubscription(userId: string) {
    return this.cache.swr(
      `subscription:${userId}`,
      async () => {
        return this.dbAdapter.query(
          `subscription:${userId}:get`,
          async () => {
            const { data } = await this.supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .single()
            return data
          },
          { cache: true }
        )
      },
      {
        ttl: 300,
        staleAge: 3600, // Serve stale for up to 1 hour
        tags: ['subscriptions'],
      }
    )
  }

  /**
   * Health check
   */
  getHealth() {
    return {
      stripe: this.stripeAdapter.getStatus(),
      db: this.dbAdapter.getStatus(),
      cache: {
        size: this.cache.getLocalCacheSize(),
        hitRatio: this.cache.getHitRatio(),
        metrics: this.cache.getMetrics(),
      },
    }
  }

  // Private helpers
  private async queuePaymentForManualProcessing(
    userId: string,
    amount: number,
    currency: string,
    intentId?: string
  ) {
    try {
      await this.supabase.from('payment_queue').insert({
        user_id: userId || null,
        stripe_intent_id: intentId,
        amount,
        currency,
        status: 'pending',
        created_at: new Date(),
      })

      console.log(`[Payment] Queued payment for manual processing`)
    } catch (error) {
      console.error('[Payment] Failed to queue payment:', error)
    }
  }
}

/**
 * Usage Example
 */
export async function exampleUsage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const payments = new ProductionPaymentService(
    supabase,
    process.env.STRIPE_SECRET_KEY!
  )

  // Get pricing plans (cached)
  const plans = await payments.getPricingPlans()

  // Create payment with full resilience
  const payment = await payments.createPayment('user_123', 5000)

  if (payment.status === 'success') {
    // Confirm payment
    const confirmed = await payments.confirmPayment(
      payment.intentId,
      'pm_card_visa'
    )
    console.log('[Payment] Confirmed:', confirmed)
  } else if (payment.status === 'queued') {
    // Payment was queued due to circuit breaker
    console.log('[Payment] Queued for manual processing')
  }

  // Get health status
  const health = payments.getHealth()
  console.log('[Health]', health)
}
