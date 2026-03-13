/**
 * Feature Flags Block
 * Gradual rollout, A/B testing, per-user targeting
 */

import { createClient } from '@supabase/supabase-js'

export interface FeatureFlag {
  id: string
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage: number // 0-100
  targetAudience?: 'beta_users' | 'premium' | 'all'
  variants?: { [key: string]: number } // A/B test variants with percentages
  rules?: FeatureRule[]
  created_at: string
  updated_at: string
}

export interface FeatureRule {
  id: string
  condition: 'user_id' | 'email' | 'plan' | 'custom'
  value: string | string[]
  action: 'enable' | 'disable'
}

export class FeatureFlagManager {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }

  /**
   * Check if feature is enabled for user
   */
  async isEnabled(
    featureName: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const { data: flag } = await this.supabase
      .from('feature_flags')
      .select('*')
      .eq('name', featureName)
      .eq('enabled', true)
      .single()

    if (!flag) return false

    // Check rollout percentage
    if (userId && flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId)
      if (hash % 100 >= flag.rolloutPercentage) {
        return false
      }
    }

    // Check rules
    if (flag.rules && flag.rules.length > 0 && userId) {
      const ruleMatches = this.evaluateRules(flag.rules, userId, context)
      if (ruleMatches === false) return false
    }

    // Check audience targeting
    if (flag.targetAudience && context?.plan) {
      if (flag.targetAudience === 'premium' && context.plan !== 'premium') {
        return false
      }
    }

    return true
  }

  /**
   * Get variant for A/B testing
   */
  async getVariant(
    featureName: string,
    userId: string
  ): Promise<string | null> {
    const { data: flag } = await this.supabase
      .from('feature_flags')
      .select('variants')
      .eq('name', featureName)
      .single()

    if (!flag?.variants) return null

    const hash = this.hashUserId(userId)
    let accumulated = 0

    for (const [variant, percentage] of Object.entries(flag.variants)) {
      accumulated += percentage
      if (hash % 100 < accumulated) {
        return variant
      }
    }

    return null
  }

  /**
   * Simple hash for consistent variant assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Evaluate feature rules
   */
  private evaluateRules(
    rules: FeatureRule[],
    userId: string,
    context?: Record<string, any>
  ): boolean | null {
    for (const rule of rules) {
      let matches = false

      if (rule.condition === 'user_id') {
        matches = rule.value === userId
      } else if (rule.condition === 'email' && context?.email) {
        matches = rule.value === context.email
      } else if (rule.condition === 'plan' && context?.plan) {
        matches = rule.value === context.plan
      }

      if (matches) {
        return rule.action === 'enable'
      }
    }

    return null
  }
}

export const featureFlags = new FeatureFlagManager()
