// @ts-nocheck
/**
 * TemporalMemory — MiroFish Enhancement #2
 *
 * Per-agent temporal memory that updates across simulation rounds.
 * Each simulated user agent remembers what happened in previous rounds:
 * - What features they used
 * - How their satisfaction changed
 * - What events triggered engagement or churn risk
 * - Their evolving relationship with the product
 *
 * Inspired by MiroFish's use of Zep Cloud for long-term agent memory.
 * Implemented with in-memory storage + optional Supabase persistence.
 */

import { z } from 'zod'
import { logger } from '../../factory-brain/src/utils/logger'

const log = logger.child({ module: 'TemporalMemory' })

// ── Schemas ───────────────────────────────────────────────────────────────────

export const MemoryEventSchema = z.object({
  round: z.number().int().nonnegative(),
  day: z.number().int().nonnegative(),
  event_type: z.enum([
    'feature_used',
    'support_contacted',
    'upgrade_considered',
    'downgrade_considered',
    'churn_risk_increased',
    'churn_risk_decreased',
    'satisfaction_changed',
    'competitor_evaluated',
    'referral_made',
    'complaint_filed',
    'goal_achieved',
    'onboarding_step',
  ]),
  description: z.string(),
  impact_on_engagement: z.number().min(-1).max(1), // -1=very negative, +1=very positive
  impact_on_churn_risk: z.number().min(-1).max(1),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
})

export type MemoryEvent = z.infer<typeof MemoryEventSchema>

export const AgentMemoryStateSchema = z.object({
  agent_id: z.string(),
  persona_id: z.string().optional(),
  simulation_id: z.string(),
  current_round: z.number().int().nonnegative(),
  // Evolving state
  engagement_level: z.number().min(0).max(1),
  churn_risk: z.number().min(0).max(1),
  satisfaction_score: z.number().min(0).max(1),
  lifetime_value_accumulated: z.number().nonnegative(),
  // Memory
  events: z.array(MemoryEventSchema),
  features_used: z.record(z.number()), // feature -> usage count
  goals_achieved: z.array(z.string()),
  unresolved_pain_points: z.array(z.string()),
  // Relationship trajectory
  engagement_history: z.array(z.number()), // one per round
  churn_risk_history: z.array(z.number()),  // one per round
  satisfaction_history: z.array(z.number()), // one per round
  // Narrative summary (updated each round by LLM)
  memory_summary: z.string().optional(),
  last_updated: z.string().datetime(),
})

export type AgentMemoryState = z.infer<typeof AgentMemoryStateSchema>

export interface RoundUpdate {
  agent_id: string
  round: number
  day: number
  events: Omit<MemoryEvent, 'round' | 'day' | 'timestamp'>[]
  engagement_delta: number
  churn_risk_delta: number
  satisfaction_delta: number
  revenue_delta: number
}

export interface MemorySnapshot {
  agent_id: string
  round: number
  engagement_level: number
  churn_risk: number
  satisfaction_score: number
  recent_events: MemoryEvent[]
  memory_summary?: string
}

// ── TemporalMemoryStore ───────────────────────────────────────────────────────

export class TemporalMemoryStore {
  private memories: Map<string, AgentMemoryState> = new Map()
  private simulationId: string

  constructor(simulationId: string) {
    this.simulationId = simulationId
    log.info({ simulationId }, 'TemporalMemoryStore initialized')
  }

  /**
   * Initialize memory for an agent at the start of simulation.
   */
  initAgent(
    agentId: string,
    initialState: {
      engagement_level: number
      churn_risk: number
      satisfaction_score?: number
      persona_id?: string
    }
  ): AgentMemoryState {
    const state: AgentMemoryState = {
      agent_id: agentId,
      persona_id: initialState.persona_id,
      simulation_id: this.simulationId,
      current_round: 0,
      engagement_level: initialState.engagement_level,
      churn_risk: initialState.churn_risk,
      satisfaction_score: initialState.satisfaction_score ?? 0.6,
      lifetime_value_accumulated: 0,
      events: [],
      features_used: {},
      goals_achieved: [],
      unresolved_pain_points: [],
      engagement_history: [initialState.engagement_level],
      churn_risk_history: [initialState.churn_risk],
      satisfaction_history: [initialState.satisfaction_score ?? 0.6],
      last_updated: new Date().toISOString(),
    }

    this.memories.set(agentId, state)
    return state
  }

  /**
   * Apply a round update to an agent's memory.
   * Clamps all values to [0, 1] range.
   */
  applyRoundUpdate(update: RoundUpdate): AgentMemoryState {
    const state = this.memories.get(update.agent_id)
    if (!state) {
      throw new Error(`Agent ${update.agent_id} not found in memory store`)
    }

    // Apply deltas with clamping
    state.engagement_level = clamp(state.engagement_level + update.engagement_delta, 0, 1)
    state.churn_risk = clamp(state.churn_risk + update.churn_risk_delta, 0, 1)
    state.satisfaction_score = clamp(state.satisfaction_score + update.satisfaction_delta, 0, 1)
    state.lifetime_value_accumulated += Math.max(0, update.revenue_delta)
    state.current_round = update.round

    // Record history
    state.engagement_history.push(state.engagement_level)
    state.churn_risk_history.push(state.churn_risk)
    state.satisfaction_history.push(state.satisfaction_score)

    // Add events
    const now = new Date().toISOString()
    for (const event of update.events) {
      const fullEvent: MemoryEvent = {
        ...event,
        round: update.round,
        day: update.day,
        timestamp: now,
      }

      // Track feature usage
      if (event.event_type === 'feature_used' && event.metadata?.feature) {
        const feature = event.metadata.feature as string
        state.features_used[feature] = (state.features_used[feature] ?? 0) + 1
      }

      // Track goals
      if (event.event_type === 'goal_achieved' && event.description) {
        if (!state.goals_achieved.includes(event.description)) {
          state.goals_achieved.push(event.description)
        }
      }

      state.events.push(fullEvent)
    }

    // Keep only last 50 events to prevent memory bloat
    if (state.events.length > 50) {
      state.events = state.events.slice(-50)
    }

    state.last_updated = new Date().toISOString()
    this.memories.set(update.agent_id, state)

    return state
  }

  /**
   * Get a lightweight snapshot of an agent's current memory state.
   * Used for feeding context to simulation decisions.
   */
  getSnapshot(agentId: string, recentEventsCount = 5): MemorySnapshot | null {
    const state = this.memories.get(agentId)
    if (!state) return null

    return {
      agent_id: agentId,
      round: state.current_round,
      engagement_level: state.engagement_level,
      churn_risk: state.churn_risk,
      satisfaction_score: state.satisfaction_score,
      recent_events: state.events.slice(-recentEventsCount),
      memory_summary: state.memory_summary,
    }
  }

  /**
   * Get the full memory state for an agent.
   */
  getState(agentId: string): AgentMemoryState | null {
    return this.memories.get(agentId) ?? null
  }

  /**
   * Get all agent IDs in this simulation.
   */
  getAllAgentIds(): string[] {
    return Array.from(this.memories.keys())
  }

  /**
   * Get aggregated metrics across all agents for a given round.
   */
  getAggregatedMetrics(round?: number): {
    avg_engagement: number
    avg_churn_risk: number
    avg_satisfaction: number
    total_ltv: number
    high_churn_count: number
    churned_count: number
    top_features: Array<{ feature: string; usage: number }>
  } {
    const states = Array.from(this.memories.values())
    if (states.length === 0) {
      return {
        avg_engagement: 0,
        avg_churn_risk: 0,
        avg_satisfaction: 0,
        total_ltv: 0,
        high_churn_count: 0,
        churned_count: 0,
        top_features: [],
      }
    }

    const avg_engagement = avg(states.map(s => s.engagement_level))
    const avg_churn_risk = avg(states.map(s => s.churn_risk))
    const avg_satisfaction = avg(states.map(s => s.satisfaction_score))
    const total_ltv = states.reduce((sum, s) => sum + s.lifetime_value_accumulated, 0)
    const high_churn_count = states.filter(s => s.churn_risk > 0.7).length
    const churned_count = states.filter(s => s.churn_risk >= 1.0).length

    // Aggregate feature usage
    const featureUsage: Record<string, number> = {}
    for (const state of states) {
      for (const [feature, count] of Object.entries(state.features_used)) {
        featureUsage[feature] = (featureUsage[feature] ?? 0) + count
      }
    }
    const top_features = Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([feature, usage]) => ({ feature, usage }))

    return {
      avg_engagement,
      avg_churn_risk,
      avg_satisfaction,
      total_ltv,
      high_churn_count,
      churned_count,
      top_features,
    }
  }

  /**
   * Get agents sorted by churn risk (highest first).
   * Useful for identifying at-risk users.
   */
  getAtRiskAgents(threshold = 0.7, limit = 10): AgentMemoryState[] {
    return Array.from(this.memories.values())
      .filter(s => s.churn_risk >= threshold)
      .sort((a, b) => b.churn_risk - a.churn_risk)
      .slice(0, limit)
  }

  /**
   * Get agents with highest engagement (potential advocates).
   */
  getTopEngagedAgents(limit = 10): AgentMemoryState[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.engagement_level - a.engagement_level)
      .slice(0, limit)
  }

  /**
   * Build a context string for an agent to use in LLM prompts.
   * Summarizes their journey so far.
   */
  buildAgentContext(agentId: string): string {
    const state = this.memories.get(agentId)
    if (!state) return 'No memory available.'

    const recentEvents = state.events.slice(-5)
    const trend = getTrend(state.engagement_history)
    const churnTrend = getTrend(state.churn_risk_history)

    return [
      `Round: ${state.current_round}`,
      `Engagement: ${(state.engagement_level * 100).toFixed(0)}% (${trend})`,
      `Churn Risk: ${(state.churn_risk * 100).toFixed(0)}% (${churnTrend})`,
      `Satisfaction: ${(state.satisfaction_score * 100).toFixed(0)}%`,
      `Goals achieved: ${state.goals_achieved.join(', ') || 'none yet'}`,
      `Most used features: ${Object.entries(state.features_used)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([f, c]) => `${f}(${c}x)`)
        .join(', ') || 'none'}`,
      recentEvents.length > 0
        ? `Recent events: ${recentEvents.map(e => e.description).join('; ')}`
        : '',
      state.memory_summary ? `Summary: ${state.memory_summary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  /**
   * Clear all memories (for testing or reset).
   */
  clear(): void {
    this.memories.clear()
    log.info({ simulationId: this.simulationId }, 'Memory store cleared')
  }

  /**
   * Export all memories as a serializable array.
   */
  export(): AgentMemoryState[] {
    return Array.from(this.memories.values())
  }

  /**
   * Import memories from a serialized array.
   */
  import(states: AgentMemoryState[]): void {
    for (const state of states) {
      this.memories.set(state.agent_id, state)
    }
    log.info({ count: states.length }, 'Memories imported')
  }

  get size(): number {
    return this.memories.size
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function getTrend(history: number[]): string {
  if (history.length < 2) return 'stable'
  const recent = history.slice(-3)
  const delta = recent[recent.length - 1] - recent[0]
  if (delta > 0.05) return 'improving'
  if (delta < -0.05) return 'declining'
  return 'stable'
}
