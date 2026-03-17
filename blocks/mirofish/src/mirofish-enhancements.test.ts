/**
 * Tests for MiroFish Enhancements
 * - PersonaGenerator
 * - TemporalMemoryStore
 * - PostSimulationReportAgent (formatting only, no LLM calls)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TemporalMemoryStore } from './temporal-memory'
import { personaToAgentConfig, type Persona } from './persona-generator'
import { PostSimulationReportAgent, type SimulationReport } from './report-agent'

// ── TemporalMemoryStore Tests ─────────────────────────────────────────────────

describe('TemporalMemoryStore', () => {
  let store: TemporalMemoryStore

  beforeEach(() => {
    store = new TemporalMemoryStore('test-sim-001')
  })

  it('should initialize an agent with correct starting state', () => {
    const state = store.initAgent('agent-001', {
      engagement_level: 0.7,
      churn_risk: 0.2,
      satisfaction_score: 0.8,
      persona_id: 'persona-001',
    })

    expect(state.agent_id).toBe('agent-001')
    expect(state.engagement_level).toBe(0.7)
    expect(state.churn_risk).toBe(0.2)
    expect(state.satisfaction_score).toBe(0.8)
    expect(state.persona_id).toBe('persona-001')
    expect(state.current_round).toBe(0)
    expect(state.events).toHaveLength(0)
    expect(state.engagement_history).toHaveLength(1)
    expect(state.engagement_history[0]).toBe(0.7)
  })

  it('should apply round updates and track history', () => {
    store.initAgent('agent-002', {
      engagement_level: 0.5,
      churn_risk: 0.3,
    })

    const updated = store.applyRoundUpdate({
      agent_id: 'agent-002',
      round: 1,
      day: 7,
      events: [
        {
          event_type: 'feature_used',
          description: 'Used dashboard feature',
          impact_on_engagement: 0.1,
          impact_on_churn_risk: -0.05,
          metadata: { feature: 'dashboard' },
        },
      ],
      engagement_delta: 0.1,
      churn_risk_delta: -0.05,
      satisfaction_delta: 0.05,
      revenue_delta: 50,
    })

    expect(updated.engagement_level).toBeCloseTo(0.6, 2)
    expect(updated.churn_risk).toBeCloseTo(0.25, 2)
    expect(updated.satisfaction_score).toBeCloseTo(0.65, 2)
    expect(updated.lifetime_value_accumulated).toBe(50)
    expect(updated.current_round).toBe(1)
    expect(updated.events).toHaveLength(1)
    expect(updated.engagement_history).toHaveLength(2)
    expect(updated.features_used['dashboard']).toBe(1)
  })

  it('should clamp values to [0, 1] range', () => {
    store.initAgent('agent-003', {
      engagement_level: 0.95,
      churn_risk: 0.05,
    })

    const updated = store.applyRoundUpdate({
      agent_id: 'agent-003',
      round: 1,
      day: 7,
      events: [],
      engagement_delta: 0.5, // Would exceed 1.0
      churn_risk_delta: -0.5, // Would go below 0.0
      satisfaction_delta: 0,
      revenue_delta: 0,
    })

    expect(updated.engagement_level).toBe(1.0)
    expect(updated.churn_risk).toBe(0.0)
  })

  it('should track goals achieved without duplicates', () => {
    store.initAgent('agent-004', {
      engagement_level: 0.6,
      churn_risk: 0.2,
    })

    store.applyRoundUpdate({
      agent_id: 'agent-004',
      round: 1,
      day: 7,
      events: [
        {
          event_type: 'goal_achieved',
          description: 'Completed onboarding',
          impact_on_engagement: 0.2,
          impact_on_churn_risk: -0.1,
        },
      ],
      engagement_delta: 0.2,
      churn_risk_delta: -0.1,
      satisfaction_delta: 0.1,
      revenue_delta: 0,
    })

    // Apply same goal again
    store.applyRoundUpdate({
      agent_id: 'agent-004',
      round: 2,
      day: 14,
      events: [
        {
          event_type: 'goal_achieved',
          description: 'Completed onboarding', // duplicate
          impact_on_engagement: 0,
          impact_on_churn_risk: 0,
        },
      ],
      engagement_delta: 0,
      churn_risk_delta: 0,
      satisfaction_delta: 0,
      revenue_delta: 0,
    })

    const state = store.getState('agent-004')
    expect(state?.goals_achieved).toHaveLength(1) // No duplicate
    expect(state?.goals_achieved[0]).toBe('Completed onboarding')
  })

  it('should limit events to last 50', () => {
    store.initAgent('agent-005', {
      engagement_level: 0.5,
      churn_risk: 0.3,
    })

    // Add 60 events
    for (let i = 0; i < 60; i++) {
      store.applyRoundUpdate({
        agent_id: 'agent-005',
        round: i,
        day: i,
        events: [{
          event_type: 'feature_used',
          description: `Used feature ${i}`,
          impact_on_engagement: 0,
          impact_on_churn_risk: 0,
        }],
        engagement_delta: 0,
        churn_risk_delta: 0,
        satisfaction_delta: 0,
        revenue_delta: 0,
      })
    }

    const state = store.getState('agent-005')
    expect(state?.events.length).toBeLessThanOrEqual(50)
  })

  it('should return snapshot with recent events', () => {
    store.initAgent('agent-006', {
      engagement_level: 0.7,
      churn_risk: 0.15,
    })

    for (let i = 0; i < 8; i++) {
      store.applyRoundUpdate({
        agent_id: 'agent-006',
        round: i,
        day: i * 7,
        events: [{
          event_type: 'feature_used',
          description: `Event ${i}`,
          impact_on_engagement: 0.01,
          impact_on_churn_risk: -0.01,
        }],
        engagement_delta: 0.01,
        churn_risk_delta: -0.01,
        satisfaction_delta: 0,
        revenue_delta: 10,
      })
    }

    const snapshot = store.getSnapshot('agent-006', 5)
    expect(snapshot).not.toBeNull()
    expect(snapshot?.recent_events).toHaveLength(5)
    expect(snapshot?.recent_events[4].description).toBe('Event 7')
  })

  it('should compute aggregated metrics correctly', () => {
    store.initAgent('agent-a', { engagement_level: 0.8, churn_risk: 0.1 })
    store.initAgent('agent-b', { engagement_level: 0.4, churn_risk: 0.8 })
    store.initAgent('agent-c', { engagement_level: 0.6, churn_risk: 0.5 })

    const metrics = store.getAggregatedMetrics()

    expect(metrics.avg_engagement).toBeCloseTo(0.6, 1)
    expect(metrics.avg_churn_risk).toBeCloseTo(0.467, 1)
    expect(metrics.high_churn_count).toBe(1) // only agent-b > 0.7
  })

  it('should identify at-risk agents', () => {
    store.initAgent('safe', { engagement_level: 0.9, churn_risk: 0.1 })
    store.initAgent('risky', { engagement_level: 0.3, churn_risk: 0.85 })
    store.initAgent('medium', { engagement_level: 0.5, churn_risk: 0.5 })

    const atRisk = store.getAtRiskAgents(0.7)
    expect(atRisk).toHaveLength(1)
    expect(atRisk[0].agent_id).toBe('risky')
  })

  it('should build agent context string', () => {
    store.initAgent('ctx-agent', {
      engagement_level: 0.75,
      churn_risk: 0.2,
      satisfaction_score: 0.85,
    })

    store.applyRoundUpdate({
      agent_id: 'ctx-agent',
      round: 1,
      day: 7,
      events: [{
        event_type: 'goal_achieved',
        description: 'Completed setup',
        impact_on_engagement: 0.1,
        impact_on_churn_risk: -0.05,
      }],
      engagement_delta: 0.1,
      churn_risk_delta: -0.05,
      satisfaction_delta: 0.05,
      revenue_delta: 100,
    })

    const context = store.buildAgentContext('ctx-agent')
    expect(context).toContain('Round: 1')
    expect(context).toContain('Engagement:')
    expect(context).toContain('Goals achieved: Completed setup')
  })

  it('should export and import memories', () => {
    store.initAgent('exp-1', { engagement_level: 0.6, churn_risk: 0.3 })
    store.initAgent('exp-2', { engagement_level: 0.8, churn_risk: 0.1 })

    const exported = store.export()
    expect(exported).toHaveLength(2)

    const newStore = new TemporalMemoryStore('test-sim-002')
    newStore.import(exported)
    expect(newStore.size).toBe(2)
    expect(newStore.getState('exp-1')?.engagement_level).toBe(0.6)
  })
})

// ── PersonaGenerator Tests (pure functions only) ──────────────────────────────

describe('personaToAgentConfig', () => {
  const mockPersona: Persona = {
    id: 'persona-001',
    name: 'Sarah Chen',
    age: 34,
    occupation: 'Product Manager',
    company_size: 'startup',
    industry: 'fintech',
    tech_savviness: 0.8,
    budget_sensitivity: 0.6,
    adoption_style: 'early_adopter',
    primary_goal: 'Streamline team workflows',
    pain_points: ['Too many manual processes', 'Lack of integrations'],
    motivations: ['Save time', 'Improve team productivity'],
    objections: ['Price too high', 'Complex setup'],
    communication_style: 'analytical',
    decision_authority: 'influencer',
    churn_triggers: ['Poor support', 'Missing features'],
    loyalty_drivers: ['Great UX', 'Regular updates'],
    initial_engagement: 0.75,
    initial_churn_risk: 0.15,
    purchase_propensity: 0.7,
    feature_priorities: ['automation', 'integrations', 'reporting', 'collaboration'],
  }

  it('should convert persona to agent config', () => {
    const config = personaToAgentConfig(mockPersona)

    expect(config.agentId).toBe('persona-001')
    expect(config.role).toBe('optimizer') // early_adopter -> optimizer
    expect(config.isActive).toBe(true)
    expect(config.specialization).toEqual(['automation', 'integrations', 'reporting', 'collaboration'])
  })

  it('should map adoption styles to correct roles', () => {
    const adoptionRoleMap: Array<[Persona['adoption_style'], string]> = [
      ['innovator', 'predictor'],
      ['early_adopter', 'optimizer'],
      ['early_majority', 'simulator'],
      ['late_majority', 'analyzer'],
      ['laggard', 'validator'],
    ]

    for (const [adoptionStyle, expectedRole] of adoptionRoleMap) {
      const persona = { ...mockPersona, adoption_style: adoptionStyle }
      const config = personaToAgentConfig(persona)
      expect(config.role).toBe(expectedRole)
    }
  })

  it('should scale temperature based on tech savviness', () => {
    const lowTech = personaToAgentConfig({ ...mockPersona, tech_savviness: 0.0 })
    const highTech = personaToAgentConfig({ ...mockPersona, tech_savviness: 1.0 })

    expect(highTech.temperatureParam).toBeGreaterThan(lowTech.temperatureParam)
    expect(lowTech.temperatureParam).toBeGreaterThanOrEqual(0.5)
    expect(highTech.temperatureParam).toBeLessThanOrEqual(1.0)
  })

  it('should store persona in agent memory', () => {
    const config = personaToAgentConfig(mockPersona)
    expect((config.agentMemory as Record<string, unknown>).persona).toEqual(mockPersona)
    expect((config.agentMemory as Record<string, unknown>).temporal_memories).toEqual([])
  })
})

// ── PostSimulationReportAgent Tests (formatting only) ────────────────────────

describe('PostSimulationReportAgent.formatAsMarkdown', () => {
  it('should format a report as valid Markdown', () => {
    const agent = new PostSimulationReportAgent()

    const mockReport: SimulationReport = {
      report_id: 'report-test-001',
      simulation_id: 'sim-test-001',
      generated_at: new Date().toISOString(),
      saas_description: 'A booking SaaS for restaurants',
      executive_summary: 'The simulation showed strong engagement with moderate churn risk.',
      sections: [
        {
          title: 'Market Segmentation Analysis',
          content: 'The market is dominated by SMB restaurant owners.',
          key_findings: ['60% are SMB', 'High price sensitivity'],
          confidence: 0.8,
        },
      ],
      top_recommendations: [
        {
          priority: 'critical',
          category: 'retention',
          recommendation: 'Implement proactive churn prevention emails.',
          expected_impact: 'Reduce churn by 20%',
          effort: 'low',
        },
        {
          priority: 'high',
          category: 'onboarding',
          recommendation: 'Add interactive onboarding wizard.',
          expected_impact: 'Improve activation rate by 30%',
          effort: 'medium',
        },
      ],
      predicted_outcomes: {
        month_3_churn_rate: 0.08,
        month_6_churn_rate: 0.15,
        month_12_churn_rate: 0.25,
        predicted_mrr_growth: 0.12,
        nps_estimate: 35,
        product_market_fit_score: 0.68,
      },
      confidence_score: 0.75,
      methodology_notes: 'Based on 30-round simulation with 100 agents.',
      generation_time_ms: 5000,
    }

    const markdown = agent.formatAsMarkdown(mockReport)

    expect(markdown).toContain('# Simulation Report: A booking SaaS for restaurants')
    expect(markdown).toContain('## Executive Summary')
    expect(markdown).toContain('The simulation showed strong engagement')
    expect(markdown).toContain('## Market Segmentation Analysis')
    expect(markdown).toContain('60% are SMB')
    expect(markdown).toContain('## Top Recommendations')
    expect(markdown).toContain('🔴 [CRITICAL] retention')
    expect(markdown).toContain('🟠 [HIGH] onboarding')
    expect(markdown).toContain('## Predicted Outcomes')
    expect(markdown).toContain('8.0%') // month_3_churn_rate
    expect(markdown).toContain('35') // NPS
    expect(markdown).toContain('68%') // PMF score
  })
})
