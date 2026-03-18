/**
 * Autonomous Learning Loop
 *
 * Implements a closed feedback loop where the system learns from every
 * generated SaaS project and automatically improves future generations.
 *
 * Architecture:
 *   GeneratedSaaS → OutcomeCollector → PatternExtractor
 *       → KnowledgeUpdater → AgentPromptEnhancer → Better next generation
 *
 * This closes the gap identified in the audit:
 * "ConsolidateAgent exists but is NOT connected to agents —
 *  learned patterns don't affect the next generation."
 */

import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { z } from 'zod'
import { logger } from './utils/logger'
import { withRetry } from './utils/retry'
import * as fs from 'fs/promises'
import * as path from 'path'

const log = logger.child({ module: 'AutonomousLearningLoop' })

// ── Schemas ───────────────────────────────────────────────────────────────────

export const GenerationOutcomeSchema = z.object({
  generation_id: z.string(),
  saas_description: z.string(),
  timestamp: z.string().datetime(),
  // Quality signals
  architect_score: z.number().min(0).max(1).optional(),
  assembler_success: z.boolean(),
  tests_passed: z.number().min(0).max(1).optional(), // ratio
  deploy_success: z.boolean().optional(),
  // User feedback
  user_rating: z.number().min(1).max(5).optional(),
  user_feedback: z.string().optional(),
  // Technical signals
  typescript_errors: z.number().default(0),
  missing_blocks: z.array(z.string()).default([]),
  agent_errors: z.array(z.object({
    agent: z.string(),
    error: z.string(),
    resolved: z.boolean(),
  })).default([]),
  // Generated artifacts
  blocks_used: z.array(z.string()).default([]),
  sql_tables_count: z.number().default(0),
  components_generated: z.number().default(0),
  generation_time_ms: z.number().default(0),
})

export type GenerationOutcome = z.infer<typeof GenerationOutcomeSchema>

export const LearnedPatternSchema = z.object({
  id: z.string(),
  pattern_type: z.enum([
    'block_combination',    // "auth + payments always go together"
    'sql_pattern',          // "booking SaaS always needs calendar table"
    'error_prevention',     // "avoid X when Y"
    'performance_tip',      // "use Z for better performance"
    'ux_pattern',           // "users expect A in B context"
    'agent_improvement',    // "architect should include X in schema"
  ]),
  description: z.string(),
  saas_categories: z.array(z.string()), // which SaaS types this applies to
  confidence: z.number().min(0).max(1),
  occurrence_count: z.number().default(1),
  last_seen: z.string().datetime(),
  applied_to_agents: z.array(z.string()).default([]),
  example_generation_ids: z.array(z.string()).default([]),
})

export type LearnedPattern = z.infer<typeof LearnedPatternSchema>

export const AgentKnowledgeUpdateSchema = z.object({
  agent_name: z.string(),
  update_type: z.enum(['prompt_enhancement', 'rule_addition', 'example_addition', 'warning_addition']),
  content: z.string(),
  source_pattern_ids: z.array(z.string()),
  applied_at: z.string().datetime(),
  confidence: z.number().min(0).max(1),
})

export type AgentKnowledgeUpdate = z.infer<typeof AgentKnowledgeUpdateSchema>

// ── Autonomous Learning Loop ──────────────────────────────────────────────────

export class AutonomousLearningLoop {
  private llm = getLLMClient()
  private patternsPath: string
  private knowledgePath: string
  private outcomesPath: string
  private patterns: Map<string, LearnedPattern> = new Map()
  private isRunning = false

  constructor() {
    this.llm = getLLMClient()
    const baseDir = path.join(process.cwd(), 'factory-brain', 'knowledge')
    this.patternsPath = path.join(baseDir, 'learned-patterns.json')
    this.knowledgePath = path.join(baseDir, 'agent-knowledge-updates.json')
    this.outcomesPath = path.join(baseDir, 'generation-outcomes.json')
  }

  /**
   * Initialize — load existing patterns from disk.
   */
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.patternsPath, 'utf-8')
      const patterns: LearnedPattern[] = JSON.parse(data)
      for (const p of patterns) {
        this.patterns.set(p.id, p)
      }
      log.info({ patterns_loaded: this.patterns.size }, 'Autonomous learning loop initialized')
    } catch {
      log.info('No existing patterns found, starting fresh')
      this.patterns = new Map()
    }
  }

  /**
   * Record the outcome of a generation and trigger learning.
   * Called automatically by WarRoomOrchestrator after each generation.
   */
  async recordOutcome(outcome: GenerationOutcome): Promise<void> {
    log.info(
      { generation_id: outcome.generation_id, success: outcome.assembler_success },
      'Recording generation outcome'
    )

    // Persist outcome
    await this.appendOutcome(outcome)

    // Extract patterns from this outcome
    const newPatterns = await this.extractPatterns(outcome)

    // Merge with existing patterns
    await this.mergePatterns(newPatterns)

    // Update agent knowledge if we have high-confidence patterns
    const highConfidencePatterns = Array.from(this.patterns.values())
      .filter(p => p.confidence >= 0.8 && p.occurrence_count >= 3)

    if (highConfidencePatterns.length > 0) {
      await this.updateAgentKnowledge(highConfidencePatterns)
    }

    log.info(
      { total_patterns: this.patterns.size, high_confidence: highConfidencePatterns.length },
      'Learning cycle complete'
    )
  }

  /**
   * Extract patterns from a single generation outcome using GPT-4o-mini.
   */
  private async extractPatterns(outcome: GenerationOutcome): Promise<LearnedPattern[]> {
    const prompt = `Analyze this SaaS generation outcome and extract reusable patterns.

SaaS Description: "${outcome.saas_description}"
Success: ${outcome.assembler_success}
Blocks used: ${outcome.blocks_used.join(', ') || 'none'}
SQL tables: ${outcome.sql_tables_count}
Components generated: ${outcome.components_generated}
TypeScript errors: ${outcome.typescript_errors}
Missing blocks: ${outcome.missing_blocks.join(', ') || 'none'}
Agent errors: ${outcome.agent_errors.map(e => `${e.agent}: ${e.error}`).join('; ') || 'none'}
User rating: ${outcome.user_rating ?? 'not rated'}
User feedback: ${outcome.user_feedback ?? 'none'}

Extract 1-3 patterns from this outcome. Each pattern should be:
- Generalizable (applicable to future generations, not just this one)
- Actionable (tells an agent what to do differently)
- Specific (not vague advice)

Return JSON array of patterns:
[{
  "pattern_type": "block_combination|sql_pattern|error_prevention|performance_tip|ux_pattern|agent_improvement",
  "description": "specific, actionable pattern description",
  "saas_categories": ["booking", "ecommerce", etc - which SaaS types this applies to],
  "confidence": 0.0-1.0
}]

If no meaningful patterns can be extracted, return [].
JSON only, no markdown.`

    try {
      const parsed = await withRetry(
        () => this.llm.completeJSON({
          prompt,
          model: CLAUDE_MODELS.HAIKU,
          maxTokens: 800,
        }),
        { maxAttempts: 3, baseDelayMs: 500 }
      )

      const rawPatterns: Array<{
        pattern_type: LearnedPattern['pattern_type']
        description: string
        saas_categories: string[]
        confidence: number
      }> = Array.isArray(parsed) ? parsed : (parsed.patterns ?? [])

      return rawPatterns.map(p => ({
        id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pattern_type: p.pattern_type,
        description: p.description,
        saas_categories: p.saas_categories,
        confidence: p.confidence,
        occurrence_count: 1,
        last_seen: new Date().toISOString(),
        applied_to_agents: [],
        example_generation_ids: [outcome.generation_id],
      }))
    } catch (err) {
      log.warn({ err }, 'Pattern extraction failed')
      return []
    }
  }

  /**
   * Merge new patterns with existing ones — deduplicate and increase confidence.
   */
  private async mergePatterns(newPatterns: LearnedPattern[]): Promise<void> {
    for (const newPattern of newPatterns) {
      // Find similar existing pattern
      const similar = await this.findSimilarPattern(newPattern)

      if (similar) {
        // Increase confidence and occurrence count
        similar.occurrence_count += 1
        similar.confidence = Math.min(1, similar.confidence + 0.1)
        similar.last_seen = new Date().toISOString()
        similar.example_generation_ids.push(...newPattern.example_generation_ids)
        // Keep last 10 examples
        if (similar.example_generation_ids.length > 10) {
          similar.example_generation_ids = similar.example_generation_ids.slice(-10)
        }
        this.patterns.set(similar.id, similar)
        log.debug({ pattern_id: similar.id, occurrences: similar.occurrence_count }, 'Pattern reinforced')
      } else {
        // Add new pattern
        this.patterns.set(newPattern.id, newPattern)
        log.debug({ pattern_id: newPattern.id, type: newPattern.pattern_type }, 'New pattern discovered')
      }
    }

    // Persist updated patterns
    await this.savePatterns()
  }

  /**
   * Find a semantically similar existing pattern using simple keyword matching.
   * (In production, this would use vector similarity search.)
   */
  private async findSimilarPattern(newPattern: LearnedPattern): Promise<LearnedPattern | null> {
    const newWords = new Set(newPattern.description.toLowerCase().split(/\s+/))

    let bestMatch: LearnedPattern | null = null
    let bestScore = 0

    for (const existing of this.patterns.values()) {
      if (existing.pattern_type !== newPattern.pattern_type) continue

      const existingWords = new Set(existing.description.toLowerCase().split(/\s+/))
      const intersection = [...newWords].filter(w => existingWords.has(w)).length
      const union = new Set([...newWords, ...existingWords]).size
      const jaccard = intersection / union

      if (jaccard > 0.4 && jaccard > bestScore) {
        bestScore = jaccard
        bestMatch = existing
      }
    }

    return bestMatch
  }

  /**
   * Update agent knowledge files with high-confidence patterns.
   * This is the KEY step that closes the loop — agents read these files.
   */
  private async updateAgentKnowledge(patterns: LearnedPattern[]): Promise<void> {
    const agentUpdates: AgentKnowledgeUpdate[] = []

    for (const pattern of patterns) {
      // Skip if already applied to relevant agents
      const targetAgents = this.getTargetAgents(pattern)
      const unappliedAgents = targetAgents.filter(a => !pattern.applied_to_agents.includes(a))

      if (unappliedAgents.length === 0) continue

      for (const agentName of unappliedAgents) {
        const update: AgentKnowledgeUpdate = {
          agent_name: agentName,
          update_type: this.getUpdateType(pattern),
          content: this.formatPatternForAgent(pattern, agentName),
          source_pattern_ids: [pattern.id],
          applied_at: new Date().toISOString(),
          confidence: pattern.confidence,
        }

        agentUpdates.push(update)
        pattern.applied_to_agents.push(agentName)
      }
    }

    if (agentUpdates.length === 0) return

    // Write updates to knowledge files that agents read
    await this.writeKnowledgeUpdates(agentUpdates)

    // Update patterns to mark as applied
    await this.savePatterns()

    log.info({ updates: agentUpdates.length }, 'Agent knowledge updated from learned patterns')
  }

  /**
   * Determine which agents should receive a pattern.
   */
  private getTargetAgents(pattern: LearnedPattern): string[] {
    const agentMap: Record<LearnedPattern['pattern_type'], string[]> = {
      block_combination: ['architect-agent', 'assembler-agent'],
      sql_pattern: ['architect-agent'],
      error_prevention: ['architect-agent', 'assembler-agent', 'qa-agent'],
      performance_tip: ['architect-agent', 'assembler-agent'],
      ux_pattern: ['assembler-agent'],
      agent_improvement: ['architect-agent'],
    }
    return agentMap[pattern.pattern_type] ?? ['architect-agent']
  }

  /**
   * Determine the type of knowledge update.
   */
  private getUpdateType(pattern: LearnedPattern): AgentKnowledgeUpdate['update_type'] {
    const typeMap: Record<LearnedPattern['pattern_type'], AgentKnowledgeUpdate['update_type']> = {
      block_combination: 'rule_addition',
      sql_pattern: 'example_addition',
      error_prevention: 'warning_addition',
      performance_tip: 'prompt_enhancement',
      ux_pattern: 'prompt_enhancement',
      agent_improvement: 'prompt_enhancement',
    }
    return typeMap[pattern.pattern_type] ?? 'prompt_enhancement'
  }

  /**
   * Format a pattern as an instruction for a specific agent.
   */
  private formatPatternForAgent(pattern: LearnedPattern, agentName: string): string {
    const categoryContext = pattern.saas_categories.length > 0
      ? ` (especially for: ${pattern.saas_categories.join(', ')})`
      : ''

    const prefix: Record<AgentKnowledgeUpdate['update_type'], string> = {
      rule_addition: `RULE${categoryContext}: `,
      example_addition: `EXAMPLE${categoryContext}: `,
      warning_addition: `WARNING${categoryContext}: `,
      prompt_enhancement: `INSIGHT${categoryContext}: `,
    }

    const updateType = this.getUpdateType(pattern)
    return `${prefix[updateType]}${pattern.description} [confidence: ${(pattern.confidence * 100).toFixed(0)}%, seen ${pattern.occurrence_count}x]`
  }

  /**
   * Write knowledge updates to agent-readable files.
   */
  private async writeKnowledgeUpdates(updates: AgentKnowledgeUpdate[]): Promise<void> {
    // Load existing updates
    let existing: AgentKnowledgeUpdate[] = []
    try {
      const data = await fs.readFile(this.knowledgePath, 'utf-8')
      existing = JSON.parse(data)
    } catch {
      existing = []
    }

    // Append new updates
    existing.push(...updates)

    // Keep last 200 updates
    if (existing.length > 200) {
      existing = existing.slice(-200)
    }

    await fs.writeFile(this.knowledgePath, JSON.stringify(existing, null, 2))

    // Also write per-agent knowledge files for easy reading
    const byAgent = new Map<string, AgentKnowledgeUpdate[]>()
    for (const update of existing) {
      const list = byAgent.get(update.agent_name) ?? []
      list.push(update)
      byAgent.set(update.agent_name, list)
    }

    const knowledgeDir = path.dirname(this.knowledgePath)
    for (const [agentName, agentUpdates] of byAgent) {
      const agentFile = path.join(knowledgeDir, `${agentName}-learned-rules.md`)
      const content = this.formatAgentKnowledgeFile(agentName, agentUpdates)
      await fs.writeFile(agentFile, content)
    }
  }

  /**
   * Format agent knowledge as Markdown for easy reading by LLM prompts.
   */
  private formatAgentKnowledgeFile(agentName: string, updates: AgentKnowledgeUpdate[]): string {
    const lines = [
      `# Learned Rules for ${agentName}`,
      `*Auto-generated by Autonomous Learning Loop — Last updated: ${new Date().toISOString()}*`,
      `*${updates.length} rules learned from ${new Set(updates.flatMap(u => u.source_pattern_ids)).size} patterns*`,
      '',
      '> These rules were automatically learned from previous SaaS generations.',
      '> Apply them to improve the quality of future generations.',
      '',
    ]

    // Group by update type
    const byType = new Map<string, AgentKnowledgeUpdate[]>()
    for (const update of updates) {
      const list = byType.get(update.update_type) ?? []
      list.push(update)
      byType.set(update.update_type, list)
    }

    const typeLabels: Record<string, string> = {
      rule_addition: '## Rules',
      warning_addition: '## Warnings',
      example_addition: '## Examples',
      prompt_enhancement: '## Insights',
    }

    for (const [type, typeUpdates] of byType) {
      lines.push(typeLabels[type] ?? `## ${type}`)
      lines.push('')
      // Show most recent and highest confidence first
      const sorted = [...typeUpdates].sort((a, b) => b.confidence - a.confidence).slice(0, 20)
      for (const update of sorted) {
        lines.push(`- ${update.content}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Get current learning statistics.
   */
  getStats(): {
    total_patterns: number
    high_confidence_patterns: number
    pattern_types: Record<string, number>
    top_patterns: LearnedPattern[]
  } {
    const patternList = Array.from(this.patterns.values())
    const byType: Record<string, number> = {}

    for (const p of patternList) {
      byType[p.pattern_type] = (byType[p.pattern_type] ?? 0) + 1
    }

    return {
      total_patterns: patternList.length,
      high_confidence_patterns: patternList.filter(p => p.confidence >= 0.8).length,
      pattern_types: byType,
      top_patterns: patternList
        .sort((a, b) => b.confidence * b.occurrence_count - a.confidence * a.occurrence_count)
        .slice(0, 5),
    }
  }

  /**
   * Get learned rules for a specific agent (to inject into prompts).
   */
  async getAgentRules(agentName: string): Promise<string> {
    const knowledgeDir = path.dirname(this.knowledgePath)
    const agentFile = path.join(knowledgeDir, `${agentName}-learned-rules.md`)

    try {
      return await fs.readFile(agentFile, 'utf-8')
    } catch {
      return '' // No rules yet
    }
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private async savePatterns(): Promise<void> {
    const dir = path.dirname(this.patternsPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      this.patternsPath,
      JSON.stringify(Array.from(this.patterns.values()), null, 2)
    )
  }

  private async appendOutcome(outcome: GenerationOutcome): Promise<void> {
    let outcomes: GenerationOutcome[] = []
    try {
      const data = await fs.readFile(this.outcomesPath, 'utf-8')
      outcomes = JSON.parse(data)
    } catch {
      outcomes = []
    }

    outcomes.push(outcome)
    // Keep last 500 outcomes
    if (outcomes.length > 500) {
      outcomes = outcomes.slice(-500)
    }

    const dir = path.dirname(this.outcomesPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.outcomesPath, JSON.stringify(outcomes, null, 2))
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: AutonomousLearningLoop | null = null

export async function getLearningLoop(): Promise<AutonomousLearningLoop> {
  if (!_instance) {
    _instance = new AutonomousLearningLoop()
    await _instance.initialize()
  }
  return _instance
}
