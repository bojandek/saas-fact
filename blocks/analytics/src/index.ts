/**
 * Analytics Block
 * Track user events, funnels, retention, churn, and NPS
 */

import { createClient } from '@supabase/supabase-js'
import { getChurnCalculator, type ChurnMetrics, type ChurnAnalysis } from './churn-calculator'

export interface AnalyticsEvent {
  id?: string
  tenant_id: string
  user_id: string
  event_name: string
  properties?: Record<string, any>
  timestamp?: string
}

export interface FunnelStep {
  name: string
  count: number
  conversionRate?: number
}

// Re-export churn types
export type { ChurnMetrics, ChurnAnalysis }

export class AnalyticsManager {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }

  /**
   * Track event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    const { error } = await this.supabase.from('analytics_events').insert({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    })

    if (error) throw error
  }

  /**
   * Track page view
   */
  async pageView(
    tenantId: string,
    userId: string,
    page: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.track({
      tenant_id: tenantId,
      user_id: userId,
      event_name: 'page_view',
      properties: { page, ...properties },
    })
  }

  /**
   * Track user action
   */
  async trackAction(
    tenantId: string,
    userId: string,
    action: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.track({
      tenant_id: tenantId,
      user_id: userId,
      event_name: action,
      properties,
    })
  }

  /**
   * Get funnel metrics
   */
  async getFunnelAnalytics(
    tenantId: string,
    steps: string[],
    timeWindowDays: number = 7
  ): Promise<FunnelStep[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeWindowDays)

    const funnelSteps: FunnelStep[] = []
    let previousCount = 0

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      const { data, error } = await this.supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('event_name', step)
        .gte('timestamp', startDate.toISOString())

      if (error) throw error

      const count = data?.length || 0
      const conversionRate =
        i === 0 ? 100 : previousCount > 0 ? (count / previousCount) * 100 : 0

      funnelSteps.push({
        name: step,
        count,
        conversionRate,
      })

      previousCount = count
    }

    return funnelSteps
  }

  /**
   * Get retention cohort
   */
  async getRetentionCohort(
    tenantId: string,
    event: string,
    period: 'day' | 'week' | 'month' = 'week'
  ) {
    const { data, error } = await this.supabase.rpc('calculate_retention_cohort', {
      p_tenant_id: tenantId,
      p_event: event,
      p_period: period,
    })

    if (error) throw error
    return data
  }

  /**
   * Get churn metrics - REAL CALCULATION FROM DATABASE
   */
  async getChurnMetrics(tenantId: string, daysWindow: number = 30): Promise<ChurnMetrics | null> {
    const churnCalculator = getChurnCalculator()
    return await churnCalculator.calculateChurnRate(tenantId, daysWindow)
  }

  /**
   * Get full churn analysis with risk segmentation
   */
  async getChurnAnalysis(tenantId: string): Promise<ChurnAnalysis | null> {
    const churnCalculator = getChurnCalculator()
    return await churnCalculator.getFullAnalysis(tenantId)
  }

  /**
   * Get churn trends
   */
  async getChurnTrends(
    tenantId: string
  ): Promise<{ lastMonth: number; thisMonth: number; trend: 'improving' | 'declining' | 'stable' }> {
    const churnCalculator = getChurnCalculator()
    return await churnCalculator.analyzeChurnTrends(tenantId)
  }

  /**
   * Get user session info
   */
  async getUserSessionStats(tenantId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('analytics_events')
      .select('timestamp')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) throw error

    const sessions = []
    let currentSession = [data[0]]

    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].timestamp)
      const curr = new Date(data[i].timestamp)
      const diffMinutes = (prev.getTime() - curr.getTime()) / (1000 * 60)

      if (diffMinutes > 30) {
        // New session
        sessions.push(currentSession)
        currentSession = [data[i]]
      } else {
        currentSession.push(data[i])
      }
    }

    return {
      totalSessions: sessions.length,
      avgSessionLength: sessions.length > 0 ? currentSession.length / sessions.length : 0,
      lastActive: data[0]?.timestamp,
    }
  }

  /**
   * Custom query for custom metrics
   */
  async customQuery(
    tenantId: string,
    query: string,
    params: Record<string, any> = {}
  ) {
    const { data, error } = await this.supabase.rpc('execute_analytics_query', {
      p_tenant_id: tenantId,
      p_query: query,
      p_params: params,
    })

    if (error) throw error
    return data
  }
}

export const analytics = new AnalyticsManager()

// Also export churn calculator directly
export { getChurnCalculator } from './churn-calculator'
