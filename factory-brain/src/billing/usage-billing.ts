/**
 * usage-billing.ts
 *
 * Stripe usage-based billing for SaaS Factory.
 * Charges are metered per agent execution, not flat-rate.
 *
 * Pricing model:
 *   - FREE tier:    5 generations/month (no charge)
 *   - PRO tier:     $0.50 per generation (Stripe metered billing)
 *   - AGENCY tier:  $0.25 per generation (volume discount)
 *   - ENTERPRISE:   Custom pricing, invoiced monthly
 *
 * Each "generation" = one full War Room pipeline execution
 * (Architect + Assembler + QA + Legal + Growth + Compliance agents)
 */

import Stripe from 'stripe'
import { logger } from '../utils/logger'

// ── Types ──────────────────────────────────────────────────────────────────────

export type BillingTier = 'free' | 'pro' | 'agency' | 'enterprise'

export interface UsageRecord {
  orgId: string
  userId: string
  tier: BillingTier
  agentType: string
  tokensUsed: number
  costUsd: number
  projectName: string
  timestamp: Date
  stripeSubscriptionItemId?: string
}

export interface BillingConfig {
  stripeSecretKey: string
  webhookSecret: string
  prices: {
    pro: string        // Stripe price ID for PRO metered
    agency: string     // Stripe price ID for AGENCY metered
  }
}

export interface UsageSummary {
  orgId: string
  tier: BillingTier
  periodStart: Date
  periodEnd: Date
  totalGenerations: number
  totalTokens: number
  totalCostUsd: number
  freeGenerationsUsed: number
  freeGenerationsLimit: number
  billableGenerations: number
  estimatedInvoiceUsd: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FREE_TIER_LIMIT = 5 // generations per month

const PRICE_PER_GENERATION: Record<BillingTier, number> = {
  free: 0,
  pro: 0.50,
  agency: 0.25,
  enterprise: 0, // invoiced separately
}

// ── UsageBillingService ────────────────────────────────────────────────────────

export class UsageBillingService {
  private stripe: Stripe
  private config: BillingConfig
  private billingLog: UsageRecord[] = [] // In-memory buffer, flush to DB periodically

  constructor(config: BillingConfig) {
    this.config = config
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
  }

  /**
   * Record a generation event and bill the org if applicable.
   * Call this at the END of a successful War Room pipeline run.
   */
  async recordGeneration(params: {
    orgId: string
    userId: string
    tier: BillingTier
    projectName: string
    tokensUsed: number
    costUsd: number
    stripeSubscriptionItemId?: string
  }): Promise<{ billed: boolean; amount: number; error?: string }> {
    const record: UsageRecord = {
      ...params,
      agentType: 'war-room-pipeline',
      timestamp: new Date(),
    }

    this.billingLog.push(record)

    // Free tier: check monthly limit
    if (params.tier === 'free') {
      const monthlyCount = await this.getMonthlyGenerationCount(params.orgId)
      if (monthlyCount > FREE_TIER_LIMIT) {
        logger.warn({ orgId: params.orgId, count: monthlyCount }, 'Free tier limit exceeded')
        return {
          billed: false,
          amount: 0,
          error: `Free tier limit of ${FREE_TIER_LIMIT} generations/month exceeded. Upgrade to PRO.`,
        }
      }
      return { billed: false, amount: 0 }
    }

    // Enterprise: no metered billing
    if (params.tier === 'enterprise') {
      logger.info({ orgId: params.orgId, project: params.projectName }, 'Enterprise generation recorded')
      return { billed: true, amount: 0 }
    }

    // PRO / AGENCY: report to Stripe metered billing
    if (params.stripeSubscriptionItemId) {
      try {
        await this.stripe.subscriptionItems.createUsageRecord(
          params.stripeSubscriptionItemId,
          {
            quantity: 1,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment',
          }
        )

        const amount = PRICE_PER_GENERATION[params.tier]
        logger.info(
          { orgId: params.orgId, tier: params.tier, amount },
          'Stripe usage record created'
        )
        return { billed: true, amount }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown Stripe error'
        logger.error({ orgId: params.orgId, error }, 'Failed to create Stripe usage record')
        return { billed: false, amount: 0, error }
      }
    }

    return { billed: false, amount: 0, error: 'No Stripe subscription item ID provided' }
  }

  /**
   * Get usage summary for an org in the current billing period.
   */
  async getUsageSummary(orgId: string, tier: BillingTier): Promise<UsageSummary> {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const monthlyRecords = this.billingLog.filter(
      (r) => r.orgId === orgId && r.timestamp >= periodStart
    )

    const totalGenerations = monthlyRecords.length
    const totalTokens = monthlyRecords.reduce((sum, r) => sum + r.tokensUsed, 0)
    const totalCostUsd = monthlyRecords.reduce((sum, r) => sum + r.costUsd, 0)

    const freeGenerationsUsed = Math.min(totalGenerations, FREE_TIER_LIMIT)
    const billableGenerations = tier === 'free'
      ? 0
      : Math.max(0, totalGenerations - (tier === 'pro' ? 0 : 0))

    const pricePerGen = PRICE_PER_GENERATION[tier]
    const estimatedInvoiceUsd = billableGenerations * pricePerGen

    return {
      orgId,
      tier,
      periodStart,
      periodEnd,
      totalGenerations,
      totalTokens,
      totalCostUsd,
      freeGenerationsUsed,
      freeGenerationsLimit: FREE_TIER_LIMIT,
      billableGenerations,
      estimatedInvoiceUsd,
    }
  }

  /**
   * Check if an org is allowed to run a generation based on their tier.
   */
  async checkGenerationAllowed(
    orgId: string,
    tier: BillingTier
  ): Promise<{ allowed: boolean; reason?: string; upgradeUrl?: string }> {
    if (tier !== 'free') {
      return { allowed: true }
    }

    const monthlyCount = await this.getMonthlyGenerationCount(orgId)
    if (monthlyCount >= FREE_TIER_LIMIT) {
      return {
        allowed: false,
        reason: `You've used ${monthlyCount}/${FREE_TIER_LIMIT} free generations this month.`,
        upgradeUrl: '/pricing',
      }
    }

    return { allowed: true }
  }

  /**
   * Handle Stripe webhook events for subscription changes.
   */
  async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ handled: boolean; event?: string }> {
    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret
      )
    } catch (err) {
      logger.error({ err }, 'Stripe webhook signature verification failed')
      return { handled: false }
    }

    logger.info({ type: event.type }, 'Stripe webhook received')

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await this.handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await this.handleSubscriptionCancelled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        logger.info(
          { customerId: invoice.customer, amount: invoice.amount_paid },
          'Invoice payment succeeded'
        )
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        logger.warn(
          { customerId: invoice.customer, amount: invoice.amount_due },
          'Invoice payment failed — consider downgrading org to free tier'
        )
        break
      }

      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe webhook event')
    }

    return { handled: true, event: event.type }
  }

  /**
   * Create a Stripe checkout session for upgrading to PRO or AGENCY.
   */
  async createCheckoutSession(params: {
    orgId: string
    userId: string
    tier: 'pro' | 'agency'
    successUrl: string
    cancelUrl: string
    customerEmail?: string
  }): Promise<{ url: string; sessionId: string }> {
    const priceId = params.tier === 'pro'
      ? this.config.prices.pro
      : this.config.prices.agency

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      metadata: {
        orgId: params.orgId,
        userId: params.userId,
        tier: params.tier,
      },
      subscription_data: {
        metadata: {
          orgId: params.orgId,
          tier: params.tier,
        },
      },
    })

    return {
      url: session.url!,
      sessionId: session.id,
    }
  }

  /**
   * Create a Stripe customer portal session for managing subscriptions.
   */
  async createPortalSession(params: {
    stripeCustomerId: string
    returnUrl: string
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    })

    return { url: session.url }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getMonthlyGenerationCount(orgId: string): Promise<number> {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return this.billingLog.filter(
      (r) => r.orgId === orgId && r.timestamp >= periodStart
    ).length
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const orgId = subscription.metadata?.orgId
    const tier = subscription.metadata?.tier as BillingTier

    if (!orgId || !tier) {
      logger.warn({ subscriptionId: subscription.id }, 'Subscription missing orgId or tier metadata')
      return
    }

    logger.info({ orgId, tier, status: subscription.status }, 'Subscription updated')
    // In production: update org tier in database
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    const orgId = subscription.metadata?.orgId

    if (!orgId) return

    logger.info({ orgId }, 'Subscription cancelled — downgrading to free tier')
    // In production: update org tier to 'free' in database
  }
}

// ── Singleton factory ──────────────────────────────────────────────────────────

let _instance: UsageBillingService | null = null

export function getUsageBillingService(): UsageBillingService {
  if (!_instance) {
    _instance = new UsageBillingService({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      prices: {
        pro: process.env.STRIPE_PRICE_PRO ?? '',
        agency: process.env.STRIPE_PRICE_AGENCY ?? '',
      },
    })
  }
  return _instance
}
