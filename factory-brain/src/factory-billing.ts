/**
 * SaaS Factory - Billing & Monetization System
 *
 * Defines the pricing model for the Factory tool itself (not for generated SaaS apps).
 * Uses a Freemium + Pay-per-Export model with optional Agency subscription.
 *
 * Tiers:
 *  - Free:    3 exports/month, community blocks only, watermarked output
 *  - Pro:     Unlimited exports, all blocks, priority generation, $29/month
 *  - Agency:  Everything in Pro + white-label, team seats, API access, $99/month
 */

import { z } from 'zod'

// ─── Pricing Plans ──────────────────────────────────────────────────────────

export const FACTORY_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      exportsPerMonth: 3,
      agentRunsPerMonth: 10,
      blocksAccess: 'community' as const,
      teamSeats: 1,
      apiAccess: false,
      whiteLabel: false,
      priorityGeneration: false,
      watermark: true,
    },
    features: [
      '3 SaaS exports per month',
      '10 AI agent runs per month',
      'Community blocks only',
      'Single user',
      'Watermarked output',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29,
    priceYearly: 290, // ~17% discount
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
    limits: {
      exportsPerMonth: -1, // unlimited
      agentRunsPerMonth: 500,
      blocksAccess: 'all' as const,
      teamSeats: 1,
      apiAccess: false,
      whiteLabel: false,
      priorityGeneration: true,
      watermark: false,
    },
    features: [
      'Unlimited SaaS exports',
      '500 AI agent runs per month',
      'All premium blocks',
      'Priority generation queue',
      'No watermark',
      'Export to GitHub',
    ],
  },

  agency: {
    id: 'agency',
    name: 'Agency',
    priceMonthly: 99,
    priceYearly: 990, // ~17% discount
    stripePriceIdMonthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? '',
    stripePriceIdYearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID ?? '',
    limits: {
      exportsPerMonth: -1,
      agentRunsPerMonth: -1, // unlimited
      blocksAccess: 'all' as const,
      teamSeats: 10,
      apiAccess: true,
      whiteLabel: true,
      priorityGeneration: true,
      watermark: false,
    },
    features: [
      'Everything in Pro',
      'Unlimited AI agent runs',
      '10 team seats',
      'REST API access',
      'White-label output',
      'Custom block development',
      'Priority support',
    ],
  },
} as const

export type PlanId = keyof typeof FACTORY_PLANS
export type FactoryPlan = (typeof FACTORY_PLANS)[PlanId]

// ─── Usage Tracking ──────────────────────────────────────────────────────────

export const UsageRecordSchema = z.object({
  userId: z.string(),
  planId: z.enum(['free', 'pro', 'agency']),
  periodStart: z.date(),
  periodEnd: z.date(),
  exportsUsed: z.number().int().min(0),
  agentRunsUsed: z.number().int().min(0),
})

export type UsageRecord = z.infer<typeof UsageRecordSchema>

// ─── Billing Service ─────────────────────────────────────────────────────────

export class FactoryBillingService {
  /**
   * Check if a user can perform an action based on their plan limits
   */
  canPerformAction(
    usage: UsageRecord,
    action: 'export' | 'agentRun'
  ): { allowed: boolean; reason?: string; upgradeUrl?: string } {
    const plan = FACTORY_PLANS[usage.planId]

    if (action === 'export') {
      const limit = plan.limits.exportsPerMonth
      if (limit === -1) return { allowed: true }
      if (usage.exportsUsed >= limit) {
        return {
          allowed: false,
          reason: `You've used all ${limit} exports for this month on the ${plan.name} plan.`,
          upgradeUrl: '/pricing',
        }
      }
    }

    if (action === 'agentRun') {
      const limit = plan.limits.agentRunsPerMonth
      if (limit === -1) return { allowed: true }
      if (usage.agentRunsUsed >= limit) {
        return {
          allowed: false,
          reason: `You've used all ${limit} AI agent runs for this month on the ${plan.name} plan.`,
          upgradeUrl: '/pricing',
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Get the recommended upgrade plan for a user
   */
  getUpgradeRecommendation(currentPlanId: PlanId): FactoryPlan | null {
    if (currentPlanId === 'free') return FACTORY_PLANS.pro
    if (currentPlanId === 'pro') return FACTORY_PLANS.agency
    return null
  }

  /**
   * Calculate remaining usage for a billing period
   */
  getRemainingUsage(usage: UsageRecord): {
    exportsRemaining: number | 'unlimited'
    agentRunsRemaining: number | 'unlimited'
    percentUsed: { exports: number; agentRuns: number }
  } {
    const plan = FACTORY_PLANS[usage.planId]

    const exportsRemaining =
      plan.limits.exportsPerMonth === -1
        ? 'unlimited'
        : Math.max(0, plan.limits.exportsPerMonth - usage.exportsUsed)

    const agentRunsRemaining =
      plan.limits.agentRunsPerMonth === -1
        ? 'unlimited'
        : Math.max(0, plan.limits.agentRunsPerMonth - usage.agentRunsUsed)

    const exportPercent =
      plan.limits.exportsPerMonth === -1
        ? 0
        : Math.min(100, (usage.exportsUsed / plan.limits.exportsPerMonth) * 100)

    const agentRunPercent =
      plan.limits.agentRunsPerMonth === -1
        ? 0
        : Math.min(100, (usage.agentRunsUsed / plan.limits.agentRunsPerMonth) * 100)

    return {
      exportsRemaining,
      agentRunsRemaining,
      percentUsed: {
        exports: Math.round(exportPercent),
        agentRuns: Math.round(agentRunPercent),
      },
    }
  }

  /**
   * Check if a feature is available on a plan
   */
  hasFeature(
    planId: PlanId,
    feature: keyof FactoryPlan['limits']
  ): boolean {
    const plan = FACTORY_PLANS[planId]
    const value = plan.limits[feature]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return true
    return false
  }

  /**
   * Get annual savings compared to monthly billing
   */
  getAnnualSavings(planId: PlanId): number {
    const plan = FACTORY_PLANS[planId]
    const monthlyTotal = plan.priceMonthly * 12
    return monthlyTotal - plan.priceYearly
  }
}

// Singleton instance
export const factoryBilling = new FactoryBillingService()
