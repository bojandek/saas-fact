/**
 * Real Churn Rate Calculation
 * Calculates actual churn from historical subscription and user activity data
 */

import { createClient } from '@supabase/supabase-js'

export interface ChurnMetrics {
  churnRate: number // Percentage 0-100
  churningUsers: number
  totalUsers: number
  activeUsers: number
  newUsers: number
  timeWindow: string
  calculatedAt: Date
  details: {
    mrr: number // Monthly Recurring Revenue
    mrrChurn: number
    downgradeCount: number
    cancellationCount: number
    inactivityCount: number
  }
}

export interface ChurnAnalysis {
  metrics: ChurnMetrics
  riskSegments: {
    highRisk: string[] // User IDs at high risk
    mediumRisk: string[]
    lowRisk: string[]
  }
  trends: {
    lastMonth: number
    thisMonth: number
    trend: 'improving' | 'declining' | 'stable'
  }
}

class ChurnCalculator {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    this.supabase = createClient(url, key)
  }

  /**
   * Calculate churn rate for specific time window
   * Churn = (Churned Users / Starting Users) * 100
   */
  async calculateChurnRate(
    tenantId: string,
    daysWindow: number = 30
  ): Promise<ChurnMetrics | null> {
    try {
      const now = new Date()
      const windowStart = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000)
      const previousWindowStart = new Date(windowStart.getTime() - daysWindow * 24 * 60 * 60 * 1000)

      // Get subscriptions at window start
      const { data: initialSubs, error: initialError } = await this.supabase
        .from('subscriptions')
        .select('id, user_id, status, plan_id')
        .eq('tenant_id', tenantId)
        .lte('created_at', windowStart.toISOString())
        .in('status', ['active', 'past_due', 'incomplete'])

      if (initialError) {
        throw new Error(`Failed to fetch initial subscriptions: ${initialError.message}`)
      }

      // Get subscriptions at window end
      const { data: finalSubs, error: finalError } = await this.supabase
        .from('subscriptions')
        .select('id, user_id, status, plan_id')
        .eq('tenant_id', tenantId)
        .lte('created_at', now.toISOString())
        .in('status', ['active', 'past_due', 'incomplete'])

      if (finalError) {
        throw new Error(`Failed to fetch final subscriptions: ${finalError.message}`)
      }

      // Get churned subscriptions (canceled or did not renew)
      const { data: churnedSubs, error: churnError } = await this.supabase
        .from('subscriptions')
        .select('id, user_id, status, cancel_at, plan_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'canceled')
        .gte('cancel_at', windowStart.toISOString())
        .lte('cancel_at', now.toISOString())

      if (churnError) {
        throw new Error(`Failed to fetch churned subscriptions: ${churnError.message}`)
      }

      // Get downgraded subscriptions
      const { data: downgradeSubs, error: downgradeError } = await this.supabase
        .rpc('get_downgraded_subscriptions', {
          p_tenant_id: tenantId,
          p_start_date: windowStart.toISOString(),
          p_end_date: now.toISOString(),
        })

      if (downgradeError) {
        console.warn('Could not fetch downgrade data:', downgradeError)
      }

      // Get inactive users (no activity in last 14 days)
      const inactivityCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const { data: inactiveUsers, error: inactivityError } = await this.supabase
        .from('analytics_events')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .lt('timestamp', inactivityCutoff.toISOString())
        .groupBy('user_id')

      if (inactivityError) {
        console.warn('Could not fetch inactivity data:', inactivityError)
      }

      // Calculate metrics
      const totalInitial = initialSubs?.length || 0
      const totalFinal = finalSubs?.length || 0
      const churned = churnedSubs?.length || 0
      const downgrades = downgradeSubs?.churn_count || 0
      const inactive = inactiveUsers?.length || 0

      const netChurn = churned + downgrades
      const churnRate = totalInitial > 0 ? (netChurn / totalInitial) * 100 : 0

      // Get MRR and MRR churn
      const { data: mrrData } = await this.calculateMRR(tenantId)
      const { data: mrrChurnData } = await this.calculateMRRChurn(tenantId, windowStart)

      return {
        churnRate: Math.min(100, Math.max(0, churnRate)),
        churningUsers: netChurn,
        totalUsers: totalInitial,
        activeUsers: totalFinal,
        newUsers: (totalFinal || 0) - (totalInitial || 0) + churned,
        timeWindow: `${daysWindow} days`,
        calculatedAt: now,
        details: {
          mrr: mrrData || 0,
          mrrChurn: mrrChurnData || 0,
          downgradeCount: downgrades,
          cancellationCount: churned,
          inactivityCount: inactive,
        },
      }
    } catch (error) {
      console.error('[ChurnCalculator] Error calculating churn:', error)
      return null
    }
  }

  /**
   * Get users at risk of churning (low activity, etc)
   */
  async getChurnRiskSegmentation(tenantId: string): Promise<{
    highRisk: string[]
    mediumRisk: string[]
    lowRisk: string[]
  }> {
    try {
      const now = new Date()
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // High risk: No activity in 14 days AND has active subscription
      const { data: highRiskUsers } = await this.supabase.rpc('get_high_risk_churn_users', {
        p_tenant_id: tenantId,
        p_inactive_threshold: twoWeeksAgo.toISOString(),
      })

      // Medium risk: Sporadic activity
      const { data: mediumRiskUsers } = await this.supabase.rpc('get_medium_risk_churn_users', {
        p_tenant_id: tenantId,
        p_inactive_threshold: oneMonthAgo.toISOString(),
      })

      // Low risk: Regular activity
      const { data: allActiveUsers } = await this.supabase
        .from('subscriptions')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')

      const lowRiskSet = new Set((allActiveUsers || []).map((s) => s.user_id))
      const highRiskSet = new Set(highRiskUsers?.map((u) => u.user_id) || [])
      const mediumRiskSet = new Set(mediumRiskUsers?.map((u) => u.user_id) || [])

      // Remove overlap
      highRiskSet.forEach((u) => lowRiskSet.delete(u))
      mediumRiskSet.forEach((u) => lowRiskSet.delete(u))
      mediumRiskSet.forEach((u) => highRiskSet.delete(u))

      return {
        highRisk: Array.from(highRiskSet),
        mediumRisk: Array.from(mediumRiskSet),
        lowRisk: Array.from(lowRiskSet),
      }
    } catch (error) {
      console.error('[ChurnCalculator] Error getting risk segmentation:', error)
      return { highRisk: [], mediumRisk: [], lowRisk: [] }
    }
  }

  /**
   * Analyze churn trends (this month vs last month)
   */
  async analyzeChurnTrends(tenantId: string): Promise<{
    lastMonth: number
    thisMonth: number
    trend: 'improving' | 'declining' | 'stable'
  }> {
    try {
      const now = new Date()
      const thisMonthMetrics = await this.calculateChurnRate(tenantId, 30)
      const lastMonthMetrics = await this.calculateChurnRate(tenantId, 60)

      if (!thisMonthMetrics || !lastMonthMetrics) {
        return { lastMonth: 0, thisMonth: 0, trend: 'stable' }
      }

      const thisMonthChurn = thisMonthMetrics.churnRate
      const lastMonthChurn = lastMonthMetrics.churnRate - thisMonthChurn // Previous month

      const isDeclining = thisMonthChurn > lastMonthChurn
      const isImproving = thisMonthChurn < lastMonthChurn
      const isStable = Math.abs(thisMonthChurn - lastMonthChurn) < 1

      let trend: 'improving' | 'declining' | 'stable' = 'stable'
      if (isDeclining) trend = 'declining'
      else if (isImproving) trend = 'improving'

      return {
        lastMonth: Math.round(lastMonthChurn * 10) / 10,
        thisMonth: Math.round(thisMonthChurn * 10) / 10,
        trend,
      }
    } catch (error) {
      console.error('[ChurnCalculator] Error analyzing trends:', error)
      return { lastMonth: 0, thisMonth: 0, trend: 'stable' }
    }
  }

  /**
   * Calculate Monthly Recurring Revenue
   */
  private async calculateMRR(tenantId: string): Promise<{ data: number }> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_tenant_mrr', {
          p_tenant_id: tenantId,
        })

      return { data: data || 0 }
    } catch {
      return { data: 0 }
    }
  }

  /**
   * Calculate MRR Churn
   */
  private async calculateMRRChurn(
    tenantId: string,
    startDate: Date
  ): Promise<{ data: number }> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_mrr_churn', {
          p_tenant_id: tenantId,
          p_start_date: startDate.toISOString(),
        })

      return { data: data || 0 }
    } catch {
      return { data: 0 }
    }
  }

  /**
   * Get full analysis
   */
  async getFullAnalysis(tenantId: string): Promise<ChurnAnalysis | null> {
    try {
      const [metrics, riskSegments, trends] = await Promise.all([
        this.calculateChurnRate(tenantId, 30),
        this.getChurnRiskSegmentation(tenantId),
        this.analyzeChurnTrends(tenantId),
      ])

      if (!metrics) {
        return null
      }

      return {
        metrics,
        riskSegments,
        trends,
      }
    } catch (error) {
      console.error('[ChurnCalculator] Error getting full analysis:', error)
      return null
    }
  }
}

// Singleton instance
let churnCalculatorInstance: ChurnCalculator | null = null

export function getChurnCalculator(): ChurnCalculator {
  if (!churnCalculatorInstance) {
    churnCalculatorInstance = new ChurnCalculator()
  }
  return churnCalculatorInstance
}
