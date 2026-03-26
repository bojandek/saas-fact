// @ts-nocheck
/**
 * PostSimulationReportAgent — MiroFish Enhancement #3
 *
 * After simulation completes, this agent has deep access to the entire
 * simulated world and generates a comprehensive, actionable report.
 *
 * Inspired by MiroFish's ReportAgent which has a rich toolset to interact
 * with the post-simulation environment and write detailed prediction reports.
 *
 * Sections generated:
 * 1. Executive Summary
 * 2. Market Segmentation Analysis
 * 3. Churn Risk Assessment
 * 4. Feature Adoption Insights
 * 5. Revenue Projections
 * 6. Behavioral Patterns
 * 7. Actionable Recommendations
 * 8. Confidence & Methodology
 */

import { getLLMClient, CLAUDE_MODELS } from '../../../factory-brain/src/llm/client'
import { z } from 'zod'
import { logger } from '../../factory-brain/src/utils/logger'
import { withRetry } from '../../factory-brain/src/utils/retry'
import type { TemporalMemoryStore } from './temporal-memory'
import type { Persona } from './persona-generator'

const log = logger.child({ module: 'PostSimulationReportAgent' })

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimulationSummary {
  simulation_id: string
  saas_description: string
  total_agents: number
  simulation_rounds: number
  time_horizon_days: number
  final_metrics: {
    avg_engagement: number
    avg_churn_risk: number
    avg_satisfaction: number
    total_ltv: number
    high_churn_count: number
    churned_count: number
    top_features: Array<{ feature: string; usage: number }>
  }
  personas?: Persona[]
}

export const ReportSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  key_findings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export type ReportSection = z.infer<typeof ReportSectionSchema>

export const SimulationReportSchema = z.object({
  report_id: z.string(),
  simulation_id: z.string(),
  generated_at: z.string().datetime(),
  saas_description: z.string(),
  executive_summary: z.string(),
  sections: z.array(ReportSectionSchema),
  top_recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.enum(['retention', 'acquisition', 'product', 'pricing', 'onboarding', 'support']),
    recommendation: z.string(),
    expected_impact: z.string(),
    effort: z.enum(['low', 'medium', 'high']),
  })),
  predicted_outcomes: z.object({
    month_3_churn_rate: z.number().min(0).max(1),
    month_6_churn_rate: z.number().min(0).max(1),
    month_12_churn_rate: z.number().min(0).max(1),
    predicted_mrr_growth: z.number(),
    nps_estimate: z.number().min(-100).max(100),
    product_market_fit_score: z.number().min(0).max(1),
  }),
  confidence_score: z.number().min(0).max(1),
  methodology_notes: z.string(),
  generation_time_ms: z.number(),
})

export type SimulationReport = z.infer<typeof SimulationReportSchema>

// ── Report Agent ──────────────────────────────────────────────────────────────

export class PostSimulationReportAgent {
  private llm = getLLMClient()

  constructor() {
    this.llm = getLLMClient()
  }

  /**
   * Generate a comprehensive post-simulation report.
   */
  async generateReport(
    summary: SimulationSummary,
    memoryStore?: TemporalMemoryStore
  ): Promise<SimulationReport> {
    const startTime = Date.now()
    log.info({ simulation_id: summary.simulation_id }, 'Generating post-simulation report')

    // Build rich context from memory store
    const memoryContext = memoryStore ? this.buildMemoryContext(memoryStore) : null

    // Generate all sections in parallel
    const [
      executiveSummary,
      segmentationSection,
      churnSection,
      featureSection,
      revenueSection,
      behaviorSection,
      recommendations,
      predictedOutcomes,
    ] = await Promise.all([
      this.generateExecutiveSummary(summary, memoryContext),
      this.generateSegmentationSection(summary, memoryContext),
      this.generateChurnSection(summary, memoryContext),
      this.generateFeatureSection(summary, memoryContext),
      this.generateRevenueSection(summary, memoryContext),
      this.generateBehaviorSection(summary, memoryContext),
      this.generateRecommendations(summary, memoryContext),
      this.generatePredictedOutcomes(summary, memoryContext),
    ])

    const report: SimulationReport = {
      report_id: `report-${summary.simulation_id}-${Date.now()}`,
      simulation_id: summary.simulation_id,
      generated_at: new Date().toISOString(),
      saas_description: summary.saas_description,
      executive_summary: executiveSummary,
      sections: [
        segmentationSection,
        churnSection,
        featureSection,
        revenueSection,
        behaviorSection,
      ],
      top_recommendations: recommendations,
      predicted_outcomes: predictedOutcomes,
      confidence_score: this.calculateConfidence(summary),
      methodology_notes: this.buildMethodologyNotes(summary),
      generation_time_ms: Date.now() - startTime,
    }

    log.info(
      {
        report_id: report.report_id,
        sections: report.sections.length,
        recommendations: report.top_recommendations.length,
        generation_time_ms: report.generation_time_ms,
      },
      'Report generation complete'
    )

    return report
  }

  // ── Section Generators ──────────────────────────────────────────────────────

  private async generateExecutiveSummary(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<string> {
    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Write a 3-4 sentence executive summary for a SaaS market simulation report.

Product: ${summary.saas_description}
Agents simulated: ${summary.total_agents}
Rounds: ${summary.simulation_rounds} (${summary.time_horizon_days} days)
Final avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
Final avg churn risk: ${(summary.final_metrics.avg_churn_risk * 100).toFixed(1)}%
Final avg satisfaction: ${(summary.final_metrics.avg_satisfaction * 100).toFixed(1)}%
High churn count: ${summary.final_metrics.high_churn_count} / ${summary.total_agents}
${memoryContext ? `\nKey patterns observed:\n${memoryContext}` : ''}

Write a professional, data-driven executive summary. Be specific with numbers.`,
        }],
        temperature: 0.4,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )
    return response.choices[0].message.content ?? ''
  }

  private async generateSegmentationSection(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<ReportSection> {
    const personaContext = summary.personas
      ? `Persona types: ${[...new Set(summary.personas.map(p => p.adoption_style))].join(', ')}\n` +
        `Industries: ${[...new Set(summary.personas.map(p => p.industry))].slice(0, 5).join(', ')}\n` +
        `Company sizes: ${[...new Set(summary.personas.map(p => p.company_size))].join(', ')}`
      : ''

    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Analyze market segmentation for this SaaS simulation.

Product: ${summary.saas_description}
${personaContext}
Avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
Avg churn risk: ${(summary.final_metrics.avg_churn_risk * 100).toFixed(1)}%

Return JSON with:
- content: 2-3 paragraph analysis
- key_findings: array of 3-4 specific findings
- confidence: 0.0-1.0

JSON only, no markdown.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      title: 'Market Segmentation Analysis',
      content: parsed.content ?? '',
      key_findings: parsed.key_findings ?? [],
      confidence: parsed.confidence ?? 0.7,
    }
  }

  private async generateChurnSection(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<ReportSection> {
    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Analyze churn risk patterns from this SaaS simulation.

Product: ${summary.saas_description}
Total agents: ${summary.total_agents}
High churn risk (>70%): ${summary.final_metrics.high_churn_count} agents
Churned: ${summary.final_metrics.churned_count} agents
Churn rate: ${((summary.final_metrics.churned_count / summary.total_agents) * 100).toFixed(1)}%
Avg churn risk: ${(summary.final_metrics.avg_churn_risk * 100).toFixed(1)}%
${memoryContext ? `\nObserved patterns:\n${memoryContext}` : ''}

Return JSON with:
- content: 2-3 paragraph churn analysis with specific numbers
- key_findings: array of 3-4 churn risk findings
- confidence: 0.0-1.0

JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      title: 'Churn Risk Assessment',
      content: parsed.content ?? '',
      key_findings: parsed.key_findings ?? [],
      confidence: parsed.confidence ?? 0.75,
    }
  }

  private async generateFeatureSection(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<ReportSection> {
    const topFeatures = summary.final_metrics.top_features
      .slice(0, 8)
      .map(f => `${f.feature}: ${f.usage} uses`)
      .join('\n')

    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Analyze feature adoption from this SaaS simulation.

Product: ${summary.saas_description}
Top features by usage:
${topFeatures || 'No feature data available'}

Return JSON with:
- content: 2-3 paragraph feature adoption analysis
- key_findings: array of 3-4 feature insights
- confidence: 0.0-1.0

JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      title: 'Feature Adoption Insights',
      content: parsed.content ?? '',
      key_findings: parsed.key_findings ?? [],
      confidence: parsed.confidence ?? 0.7,
    }
  }

  private async generateRevenueSection(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<ReportSection> {
    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Analyze revenue projections from this SaaS simulation.

Product: ${summary.saas_description}
Total agents: ${summary.total_agents}
Total simulated LTV: $${summary.final_metrics.total_ltv.toFixed(2)}
Avg LTV per user: $${(summary.final_metrics.total_ltv / summary.total_agents).toFixed(2)}
Avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
Churn rate: ${((summary.final_metrics.churned_count / summary.total_agents) * 100).toFixed(1)}%

Return JSON with:
- content: 2-3 paragraph revenue analysis with projections
- key_findings: array of 3-4 revenue insights
- confidence: 0.0-1.0

JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      title: 'Revenue Projections',
      content: parsed.content ?? '',
      key_findings: parsed.key_findings ?? [],
      confidence: parsed.confidence ?? 0.65,
    }
  }

  private async generateBehaviorSection(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<ReportSection> {
    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Analyze behavioral patterns from this SaaS simulation.

Product: ${summary.saas_description}
Avg satisfaction: ${(summary.final_metrics.avg_satisfaction * 100).toFixed(1)}%
Avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
${memoryContext ? `\nObserved behavioral patterns:\n${memoryContext}` : ''}

Return JSON with:
- content: 2-3 paragraph behavioral analysis
- key_findings: array of 3-4 behavioral insights
- confidence: 0.0-1.0

JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      title: 'Behavioral Patterns',
      content: parsed.content ?? '',
      key_findings: parsed.key_findings ?? [],
      confidence: parsed.confidence ?? 0.7,
    }
  }

  private async generateRecommendations(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<SimulationReport['top_recommendations']> {
    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Generate 6-8 actionable recommendations based on this SaaS simulation.

Product: ${summary.saas_description}
Key metrics:
- Avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
- Avg churn risk: ${(summary.final_metrics.avg_churn_risk * 100).toFixed(1)}%
- Avg satisfaction: ${(summary.final_metrics.avg_satisfaction * 100).toFixed(1)}%
- High churn users: ${summary.final_metrics.high_churn_count} / ${summary.total_agents}
- Top features: ${summary.final_metrics.top_features.slice(0, 5).map(f => f.feature).join(', ')}
${memoryContext ? `\nPatterns:\n${memoryContext}` : ''}

Return JSON with "recommendations" array. Each item:
- priority: "critical" | "high" | "medium" | "low"
- category: "retention" | "acquisition" | "product" | "pricing" | "onboarding" | "support"
- recommendation: specific, actionable recommendation (1-2 sentences)
- expected_impact: what improvement to expect (e.g. "Reduce churn by 15-20%")
- effort: "low" | "medium" | "high"

Sort by priority (critical first). JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return parsed.recommendations ?? []
  }

  private async generatePredictedOutcomes(
    summary: SimulationSummary,
    memoryContext: string | null
  ): Promise<SimulationReport['predicted_outcomes']> {
    const baseChurnRate = summary.final_metrics.churned_count / summary.total_agents
    const avgChurnRisk = summary.final_metrics.avg_churn_risk

    const response = await withRetry(
      () => this.llm.chat({
        model: CLAUDE_MODELS.HAIKU,
        messages: [{
          role: 'user',
          content: `Predict outcomes for this SaaS product based on simulation data.

Product: ${summary.saas_description}
Simulation churn rate: ${(baseChurnRate * 100).toFixed(1)}%
Avg churn risk: ${(avgChurnRisk * 100).toFixed(1)}%
Avg engagement: ${(summary.final_metrics.avg_engagement * 100).toFixed(1)}%
Avg satisfaction: ${(summary.final_metrics.avg_satisfaction * 100).toFixed(1)}%

Return JSON with:
- month_3_churn_rate: 0.0-1.0
- month_6_churn_rate: 0.0-1.0
- month_12_churn_rate: 0.0-1.0
- predicted_mrr_growth: percentage as decimal (e.g. 0.15 = 15% growth)
- nps_estimate: -100 to 100
- product_market_fit_score: 0.0-1.0

Be realistic based on the data. JSON only.`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      month_3_churn_rate: parsed.month_3_churn_rate ?? baseChurnRate * 0.3,
      month_6_churn_rate: parsed.month_6_churn_rate ?? baseChurnRate * 0.6,
      month_12_churn_rate: parsed.month_12_churn_rate ?? baseChurnRate,
      predicted_mrr_growth: parsed.predicted_mrr_growth ?? 0.1,
      nps_estimate: parsed.nps_estimate ?? 20,
      product_market_fit_score: parsed.product_market_fit_score ?? 0.5,
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildMemoryContext(memoryStore: TemporalMemoryStore): string {
    const atRisk = memoryStore.getAtRiskAgents(0.7, 5)
    const topEngaged = memoryStore.getTopEngagedAgents(5)
    const metrics = memoryStore.getAggregatedMetrics()

    const lines: string[] = []

    if (atRisk.length > 0) {
      lines.push(`At-risk agents (top ${atRisk.length}):`)
      for (const agent of atRisk) {
        const recentEvents = agent.events.slice(-2).map(e => e.description).join('; ')
        lines.push(`  - ${agent.agent_id}: churn_risk=${(agent.churn_risk * 100).toFixed(0)}%, recent: ${recentEvents}`)
      }
    }

    if (topEngaged.length > 0) {
      lines.push(`Top engaged agents:`)
      for (const agent of topEngaged) {
        lines.push(`  - ${agent.agent_id}: engagement=${(agent.engagement_level * 100).toFixed(0)}%, goals=${agent.goals_achieved.length}`)
      }
    }

    if (metrics.top_features.length > 0) {
      lines.push(`Most used features: ${metrics.top_features.slice(0, 5).map(f => `${f.feature}(${f.usage})`).join(', ')}`)
    }

    return lines.join('\n')
  }

  private calculateConfidence(summary: SimulationSummary): number {
    // More agents and more rounds = higher confidence
    const agentScore = Math.min(1, summary.total_agents / 100)
    const roundScore = Math.min(1, summary.simulation_rounds / 30)
    return Math.round((agentScore * 0.5 + roundScore * 0.5) * 100) / 100
  }

  private buildMethodologyNotes(summary: SimulationSummary): string {
    return [
      `This report was generated from a ${summary.simulation_rounds}-round market simulation`,
      `with ${summary.total_agents} AI agents over a ${summary.time_horizon_days}-day time horizon.`,
      `Each agent was initialized with a unique behavioral profile and accumulated temporal memory`,
      `across simulation rounds. Predictions are probabilistic and should be validated with real user data.`,
      `Confidence score: ${(this.calculateConfidence(summary) * 100).toFixed(0)}% (based on simulation scale).`,
    ].join(' ')
  }

  /**
   * Format report as Markdown for display or export.
   */
  formatAsMarkdown(report: SimulationReport): string {
    const lines: string[] = [
      `# Simulation Report: ${report.saas_description}`,
      `*Generated: ${new Date(report.generated_at).toLocaleString()} | Simulation: ${report.simulation_id}*`,
      `*Confidence: ${(report.confidence_score * 100).toFixed(0)}%*`,
      '',
      '## Executive Summary',
      report.executive_summary,
      '',
    ]

    for (const section of report.sections) {
      lines.push(`## ${section.title}`)
      lines.push(section.content)
      lines.push('')
      lines.push('**Key Findings:**')
      for (const finding of section.key_findings) {
        lines.push(`- ${finding}`)
      }
      lines.push('')
    }

    lines.push('## Top Recommendations')
    for (const rec of report.top_recommendations) {
      const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[rec.priority]
      lines.push(`### ${priorityEmoji} [${rec.priority.toUpperCase()}] ${rec.category}`)
      lines.push(rec.recommendation)
      lines.push(`*Expected impact: ${rec.expected_impact} | Effort: ${rec.effort}*`)
      lines.push('')
    }

    lines.push('## Predicted Outcomes')
    lines.push(`| Metric | Value |`)
    lines.push(`|--------|-------|`)
    lines.push(`| 3-Month Churn Rate | ${(report.predicted_outcomes.month_3_churn_rate * 100).toFixed(1)}% |`)
    lines.push(`| 6-Month Churn Rate | ${(report.predicted_outcomes.month_6_churn_rate * 100).toFixed(1)}% |`)
    lines.push(`| 12-Month Churn Rate | ${(report.predicted_outcomes.month_12_churn_rate * 100).toFixed(1)}% |`)
    lines.push(`| Predicted MRR Growth | ${(report.predicted_outcomes.predicted_mrr_growth * 100).toFixed(1)}% |`)
    lines.push(`| NPS Estimate | ${report.predicted_outcomes.nps_estimate} |`)
    lines.push(`| Product-Market Fit Score | ${(report.predicted_outcomes.product_market_fit_score * 100).toFixed(0)}% |`)
    lines.push('')
    lines.push('---')
    lines.push(`*${report.methodology_notes}*`)

    return lines.join('\n')
  }
}
