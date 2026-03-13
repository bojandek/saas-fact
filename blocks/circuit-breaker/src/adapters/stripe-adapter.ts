/**
 * Stripe Integration with Circuit Breaker
 * Handles payment operations with automatic fallbacks
 */

import { CircuitBreaker, CircuitBreakerConfig } from '../index'
import Stripe from 'stripe'

export interface StripeAdapterConfig {
  apiKey: string
  circuitBreakerConfig?: CircuitBreakerConfig
}

/**
 * Stripe Adapter - Wraps Stripe client with circuit breaker protection
 */
export class StripeAdapter {
  private stripe: Stripe
  private breaker: CircuitBreaker
  private fallbackCache: Map<string, any> = new Map()

  constructor(config: StripeAdapterConfig) {
    this.stripe = new Stripe(config.apiKey)

    this.breaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 120000, // 2 minutes for payment operations
      onFailure: (error) => {
        console.error('[StripeAdapter] Operation failed:', error.message)
      },
      fallback: async (error) => {
        console.warn('[StripeAdapter] Using fallback for operation')
        throw error // Payment operations shouldn't fallback to stale data
      },
      ...config.circuitBreakerConfig,
    })
  }

  /**
   * Safe charge creation with circuit breaker
   */
  async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams
  ): Promise<Stripe.PaymentIntent> {
    return this.breaker.execute(async () => {
      const intent = await this.stripe.paymentIntents.create(params)

      // Cache for fallback reference
      this.fallbackCache.set(`intent:${intent.id}`, intent)

      return intent
    }, 'createPaymentIntent')
  }

  /**
   * Safe charge confirmation
   */
  async confirmPaymentIntent(
    intentId: string,
    params: Stripe.PaymentIntentConfirmParams
  ): Promise<Stripe.PaymentIntent> {
    return this.breaker.execute(async () => {
      const intent = await this.stripe.paymentIntents.confirm(intentId, params)
      this.fallbackCache.set(`intent:${intentId}`, intent)
      return intent
    }, 'confirmPaymentIntent')
  }

  /**
   * Safe customer creation
   */
  async createCustomer(
    params: Stripe.CustomerCreateParams
  ): Promise<Stripe.Customer> {
    return this.breaker.execute(async () => {
      const customer = await this.stripe.customers.create(params)
      this.fallbackCache.set(`customer:${customer.id}`, customer)
      return customer
    }, 'createCustomer')
  }

  /**
   * Safe subscription creation
   */
  async createSubscription(
    params: Stripe.SubscriptionCreateParams
  ): Promise<Stripe.Subscription> {
    return this.breaker.execute(async () => {
      const subscription = await this.stripe.subscriptions.create(params)
      this.fallbackCache.set(`subscription:${subscription.id}`, subscription)
      return subscription
    }, 'createSubscription')
  }

  /**
   * Retrieve cached payment intent (fallback)
   */
  getCachedPaymentIntent(intentId: string): Stripe.PaymentIntent | null {
    return this.fallbackCache.get(`intent:${intentId}`) || null
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    const metrics = this.breaker.getMetrics()
    return {
      state: this.breaker.getState(),
      metrics,
      isHealthy: this.breaker.isClosed(),
    }
  }

  /**
   * Check circuit breaker and throw if open
   */
  checkHealth(): void {
    if (this.breaker.isOpen()) {
      throw new Error('Stripe service is temporarily unavailable (circuit open)')
    }
  }
}
