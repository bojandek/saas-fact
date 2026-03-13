/**
 * Always-On Memory Engine for Factory Brain
 * Persistent reasoning system that continuously learns and improves
 * Acts as the "brain" - maintains context, makes decisions, learns from interactions
 */

import { createClient } from '@supabase/supabase-js'

interface MemoryState {
  id: string
  session_id: string
  context: Record<string, any>
  reasoning_chain: ReasoningStep[]
  active_projects: string[]
  learned_patterns: Pattern[]
  decision_rules: DecisionRule[]
  feedback_history: Feedback[]
  created_at: string
  updated_at: string
  last_activity: string
}

interface ReasoningStep {
  timestamp: string
  input: string
  reasoning: string
  output: any
  confidence: number
  sources: string[]
}

interface Pattern {
  name: string
  description: string
  frequency: number
  effectiveness: number
  context_triggers: string[]
  recommendations: string[]
  last_used: string
}

interface DecisionRule {
  id: string
  condition: string
  action: string
  priority: number
  conditions_met: number
  success_rate: number
}

interface Feedback {
  timestamp: string
  decision_id: string
  feedback: 'positive' | 'negative' | 'neutral'
  improvement_suggestions: string
}

interface ContextWindow {
  current_project?: string
  user_preferences: Record<string, any>
  active_problems: string[]
  available_patterns: Pattern[]
  recent_decisions: any[]
  time_context: string
}

/**
 * Always-On Memory Engine
 * Maintains continuous reasoning state and learns from interactions
 */
export class AlwaysOnMemoryEngine {
  private supabase: ReturnType<typeof createClient>
  private memoryState: MemoryState | null = null
  private reasoningChain: ReasoningStep[] = []
  private contextWindow: ContextWindow
  private learningInterval: NodeJS.Timer | null = null
  private decisionCache: Map<string, any> = new Map()

  constructor(private sessionId: string) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    )
    this.contextWindow = {
      user_preferences: {},
      active_problems: [],
      available_patterns: [],
      recent_decisions: [],
      time_context: new Date().toISOString(),
    }
  }

  /**
   * Initialize memory engine and restore previous state
   */
  async initialize(): Promise<void> {
    // Load existing memory state
    const { data, error } = await this.supabase
      .from('memory_states')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error && error.code !== 'PGRST116') throw error

    if (data && data.length > 0) {
      this.memoryState = data[0] as MemoryState
      this.reasoningChain = this.memoryState.reasoning_chain || []
      this.contextWindow = {
        ...this.contextWindow,
        user_preferences: this.memoryState.context,
        active_problems: this.memoryState.active_projects,
      }
    } else {
      // Create new memory state
      this.memoryState = {
        id: `memory_${Date.now()}`,
        session_id: this.sessionId,
        context: {},
        reasoning_chain: [],
        active_projects: [],
        learned_patterns: [],
        decision_rules: [],
        feedback_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      }
    }

    // Start continuous learning loop
    this.startLearningCycle()
  }

  /**
   * Process input through reasoning engine
   */
  async reason(input: string, context: Record<string, any> = {}): Promise<ReasoningStep> {
    const step: ReasoningStep = {
      timestamp: new Date().toISOString(),
      input,
      reasoning: '',
      output: null,
      confidence: 0,
      sources: [],
    }

    try {
      // 1. Analyze input against stored patterns
      const matchedPatterns = this.matchPatterns(input, context)
      step.sources.push(...matchedPatterns.map(p => p.name))

      // 2. Apply decision rules based on context
      const applicableRules = this.applyDecisionRules(input, context, matchedPatterns)

      // 3. Generate reasoning chain
      step.reasoning = await this.generateReasoning(
        input,
        matchedPatterns,
        applicableRules,
        context
      )

      // 4. Calculate confidence based on pattern match quality
      step.confidence = this.calculateConfidence(matchedPatterns, applicableRules)

      // 5. Generate output
      step.output = {
        recommendation: applicableRules.length > 0 ? applicableRules[0].action : input,
        patterns_matched: matchedPatterns.length,
        confidence: step.confidence,
      }

      // Store reasoning step
      if (this.memoryState) {
        this.reasoningChain.push(step)
        // Keep only last 100 reasoning steps
        if (this.reasoningChain.length > 100) {
          this.reasoningChain.shift()
        }
        this.memoryState.reasoning_chain = this.reasoningChain
        this.memoryState.last_activity = new Date().toISOString()
      }

      return step
    } catch (error) {
      console.error('Reasoning error:', error)
      throw error
    }
  }

  /**
   * Match input against learned patterns
   */
  private matchPatterns(
    input: string,
    context: Record<string, any>
  ): Pattern[] {
    if (!this.memoryState) return []

    return this.memoryState.learned_patterns
      .map(pattern => ({
        ...pattern,
        score: this.calculatePatternScore(input, pattern, context),
      }))
      .filter(p => p.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) as any[]
  }

  /**
   * Calculate pattern matching score
   */
  private calculatePatternScore(
    input: string,
    pattern: Pattern,
    context: Record<string, any>
  ): number {
    let score = 0

    // Check context triggers
    const triggersMatched = pattern.context_triggers.filter(trigger =>
      input.toLowerCase().includes(trigger.toLowerCase())
    ).length

    score += (triggersMatched / pattern.context_triggers.length) * 0.6

    // Check user preferences alignment
    const userContextMatch = Object.entries(context).filter(
      ([key, value]) =>
        pattern.context_triggers.some(t =>
          t.toLowerCase().includes(key.toLowerCase())
        )
    ).length

    score += (userContextMatch / Object.keys(context).length) * 0.4

    // Boost score based on pattern effectiveness
    score *= pattern.effectiveness

    return Math.min(score, 1)
  }

  /**
   * Apply decision rules based on context
   */
  private applyDecisionRules(
    input: string,
    context: Record<string, any>,
    patterns: Pattern[]
  ): DecisionRule[] {
    if (!this.memoryState) return []

    const applicable: DecisionRule[] = []

    for (const rule of this.memoryState.decision_rules) {
      // Check if rule condition is met
      if (this.evaluateCondition(rule.condition, input, context, patterns)) {
        applicable.push(rule)
      }
    }

    return applicable.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Evaluate rule condition
   */
  private evaluateCondition(
    condition: string,
    input: string,
    context: Record<string, any>,
    patterns: Pattern[]
  ): boolean {
    const lowerInput = input.toLowerCase()

    // Simple keyword matching
    if (condition.includes('|')) {
      return condition.split('|').some(c => lowerInput.includes(c.trim().toLowerCase()))
    }

    if (condition.includes('&')) {
      return condition.split('&').every(c => lowerInput.includes(c.trim().toLowerCase()))
    }

    return lowerInput.includes(condition.toLowerCase())
  }

  /**
   * Generate reasoning explanation
   */
  private async generateReasoning(
    input: string,
    patterns: Pattern[],
    rules: DecisionRule[],
    context: Record<string, any>
  ): Promise<string> {
    const reasoningParts: string[] = [
      `Analyzing: "${input}"`,
      `Context: ${Object.keys(context).join(', ') || 'none'}`,
    ]

    if (patterns.length > 0) {
      reasoningParts.push(
        `Matched patterns: ${patterns.map(p => p.name).join(', ')}`
      )
    }

    if (rules.length > 0) {
      reasoningParts.push(
        `Applying rules: ${rules.map(r => r.action).join('; ')}`
      )
    }

    reasoningParts.push('Decision made based on historical learning and pattern recognition')

    return reasoningParts.join(' → ')
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(patterns: Pattern[], rules: DecisionRule[]): number {
    if (patterns.length === 0 && rules.length === 0) return 0.3

    const patternConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.effectiveness, 0) / patterns.length
        : 0

    const ruleConfidence =
      rules.length > 0
        ? rules.reduce((sum, r) => sum + r.success_rate, 0) / rules.length
        : 0

    return Math.max(patternConfidence * 0.6 + ruleConfidence * 0.4, 0.2)
  }

  /**
   * Record decision with feedback
   */
  async recordDecision(
    decisionId: string,
    action: string,
    feedback: 'positive' | 'negative' | 'neutral',
    notes?: string
  ): Promise<void> {
    if (!this.memoryState) return

    // Record feedback
    const feedbackEntry: Feedback = {
      timestamp: new Date().toISOString(),
      decision_id: decisionId,
      feedback,
      improvement_suggestions: notes || '',
    }

    this.memoryState.feedback_history.push(feedbackEntry)

    // Update rules based on feedback
    await this.updateRulesBasedOnFeedback(action, feedback)

    // Save to database
    await this.saveMemoryState()
  }

  /**
   * Update decision rules based on feedback
   */
  private async updateRulesBasedOnFeedback(
    action: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    if (!this.memoryState) return

    for (const rule of this.memoryState.decision_rules) {
      if (rule.action === action) {
        if (feedback === 'positive') {
          rule.success_rate = Math.min(rule.success_rate + 0.05, 1.0)
          rule.priority = Math.min(rule.priority + 1, 10)
        } else if (feedback === 'negative') {
          rule.success_rate = Math.max(rule.success_rate - 0.05, 0.0)
          rule.priority = Math.max(rule.priority - 1, 0)
        }
        rule.conditions_met++
      }
    }
  }

  /**
   * Learn new pattern from interaction
   */
  async learnPattern(
    name: string,
    description: string,
    triggers: string[],
    recommendation: string
  ): Promise<void> {
    if (!this.memoryState) return

    const pattern: Pattern = {
      name,
      description,
      frequency: 1,
      effectiveness: 0.5,
      context_triggers: triggers,
      recommendations: [recommendation],
      last_used: new Date().toISOString(),
    }

    this.memoryState.learned_patterns.push(pattern)
    await this.saveMemoryState()
  }

  /**
   * Update pattern effectiveness based on usage
   */
  async updatePatternEffectiveness(patternName: string, successful: boolean): Promise<void> {
    if (!this.memoryState) return

    const pattern = this.memoryState.learned_patterns.find(p => p.name === patternName)
    if (pattern) {
      pattern.frequency++
      if (successful) {
        pattern.effectiveness = Math.min(pattern.effectiveness + 0.05, 1.0)
      } else {
        pattern.effectiveness = Math.max(pattern.effectiveness - 0.03, 0.1)
      }
      pattern.last_used = new Date().toISOString()
      await this.saveMemoryState()
    }
  }

  /**
   * Get current context window
   */
  getContextWindow(): ContextWindow {
    return {
      ...this.contextWindow,
      time_context: new Date().toISOString(),
    }
  }

  /**
   * Update context with new information
   */
  updateContext(key: string, value: any): void {
    this.contextWindow.user_preferences[key] = value
    if (this.memoryState) {
      this.memoryState.context[key] = value
    }
  }

  /**
   * Start continuous learning cycle
   */
  private startLearningCycle(): void {
    // Run learning analysis every 5 minutes
    this.learningInterval = setInterval(() => {
      this.analyzeLearning()
    }, 5 * 60 * 1000)
  }

  /**
   * Analyze learning progress and optimize rules
   */
  private async analyzeLearning(): Promise<void> {
    if (!this.memoryState) return

    // Analyze reasoning chain for patterns
    const recentSteps = this.reasoningChain.slice(-20)

    // Calculate trend in confidence
    const avgConfidenceTrend =
      recentSteps.length > 0
        ? recentSteps.reduce((sum, s) => sum + s.confidence, 0) / recentSteps.length
        : 0

    // If confidence is low, diversify decision rules
    if (avgConfidenceTrend < 0.4 && this.memoryState.decision_rules.length < 20) {
      // Suggest new rules needed
      console.log('Low confidence detected - considering new patterns')
    }

    // Clean up low-effectiveness patterns
    this.memoryState.learned_patterns = this.memoryState.learned_patterns.filter(
      p => p.effectiveness > 0.2 || p.frequency < 3
    )

    // Verify rules performance
    const poorPerformingRules = this.memoryState.decision_rules.filter(
      r => r.success_rate < 0.3 && r.conditions_met > 5
    )

    if (poorPerformingRules.length > 0) {
      console.log(`Found ${poorPerformingRules.length} underperforming rules`)
      // Mark for review
    }

    await this.saveMemoryState()
  }

  /**
   * Save memory state to database
   */
  private async saveMemoryState(): Promise<void> {
    if (!this.memoryState) return

    this.memoryState.updated_at = new Date().toISOString()

    const { error } = await this.supabase
      .from('memory_states')
      .upsert(this.memoryState, {
        onConflict: 'id',
      })

    if (error) console.error('Failed to save memory state:', error)
  }

  /**
   * Get memory insights
   */
  async getInsights(): Promise<{
    total_interactions: number
    average_confidence: number
    top_patterns: Pattern[]
    effective_rules: DecisionRule[]
    learning_progress: number
  }> {
    if (!this.memoryState) {
      return {
        total_interactions: 0,
        average_confidence: 0,
        top_patterns: [],
        effective_rules: [],
        learning_progress: 0,
      }
    }

    const avgConfidence =
      this.reasoningChain.length > 0
        ? this.reasoningChain.reduce((sum, s) => sum + s.confidence, 0) /
          this.reasoningChain.length
        : 0

    const topPatterns = [...this.memoryState.learned_patterns]
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5)

    const effectiveRules = [...this.memoryState.decision_rules]
      .filter(r => r.success_rate > 0.6)
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 5)

    // Calculate learning progress (0-100)
    const learningProgress = Math.min(
      (this.reasoningChain.length / 50) * 10 +
      (this.memoryState.learned_patterns.length / 10) * 40 +
      (this.memoryState.decision_rules.length / 10) * 30 +
      (avgConfidence * 20),
      100
    )

    return {
      total_interactions: this.reasoningChain.length,
      average_confidence: avgConfidence,
      top_patterns: topPatterns,
      effective_rules: effectiveRules,
      learning_progress,
    }
  }

  /**
   * Cleanup - stop learning cycle
   */
  async cleanup(): Promise<void> {
    if (this.learningInterval) {
      clearInterval(this.learningInterval)
    }
    await this.saveMemoryState()
  }
}

export type {
  MemoryState,
  ReasoningStep,
  Pattern,
  DecisionRule,
  Feedback,
  ContextWindow,
}
