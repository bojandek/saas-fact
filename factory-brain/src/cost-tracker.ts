import { logger } from './utils/logger'

/**
 * Cost Tracker - AI API Usage & Cost Monitoring
 *
 * Tracks token usage and calculates costs for all AI API calls.
 * Primary provider: Anthropic Claude
 * Embeddings: Voyage AI
 * Audio transcription: OpenAI Whisper (fallback)
 *
 * Pricing (as of 2025):
 *   - claude-haiku-4-5:    $0.80 / 1M input,  $4.00 / 1M output
 *   - claude-sonnet-4-5:   $3.00 / 1M input,  $15.00 / 1M output
 *   - claude-opus-4-5:     $15.00 / 1M input, $75.00 / 1M output
 *   - voyage-3:            $0.06 / 1M tokens
 *   - whisper-1:           $0.006 / minute (approximated as input tokens)
 */

export interface ModelPricing {
  inputPer1M: number  // USD per 1M input tokens
  outputPer1M: number // USD per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── Claude 4.x (primary models) ──────────────────────────────────────────
  'claude-haiku-4-5':           { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'claude-sonnet-4-5':          { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-opus-4-5':            { inputPer1M: 15.00, outputPer1M: 75.00 },
  // ── Claude 3.x (legacy aliases) ──────────────────────────────────────────
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-3-haiku-20240307':    { inputPer1M: 0.25,  outputPer1M: 1.25  },
  'claude-3-opus-20240229':     { inputPer1M: 15.00, outputPer1M: 75.00 },
  // ── Voyage AI (embeddings) ────────────────────────────────────────────────
  'voyage-3':                   { inputPer1M: 0.06,  outputPer1M: 0.00  },
  'voyage-3-large':             { inputPer1M: 0.12,  outputPer1M: 0.00  },
  'voyage-3-lite':              { inputPer1M: 0.02,  outputPer1M: 0.00  },
  'voyage-code-3':              { inputPer1M: 0.06,  outputPer1M: 0.00  },
  // ── OpenAI (Whisper audio transcription only) ─────────────────────────────
  'whisper-1':                  { inputPer1M: 0.006, outputPer1M: 0.00  },
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  // Legacy aliases for compatibility
  promptTokens?: number
  completionTokens?: number
}

export interface CostRecord {
  id: string
  timestamp: Date
  projectId?: string
  tenantId?: string
  agentName: string
  model: string
  usage: TokenUsage
  costUSD: number
}

export interface CostSummary {
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  recordCount: number
  byAgent: Record<string, { costUSD: number; tokens: number }>
  byModel: Record<string, { costUSD: number; tokens: number }>
}

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    logger.warn(`[CostTracker] Unknown model: ${model}. Cost calculation skipped.`)
    return 0
  }
  // Support both inputTokens and legacy promptTokens
  const inputTokens = usage.inputTokens ?? usage.promptTokens ?? 0
  const outputTokens = usage.outputTokens ?? usage.completionTokens ?? 0
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M
  return inputCost + outputCost
}

/**
 * CostTracker - Singleton service for tracking AI API costs
 */
export class CostTracker {
  private static instance: CostTracker
  private records: CostRecord[] = []

  private constructor() {}

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker()
    }
    return CostTracker.instance
  }

  /**
   * Record a completed AI API call
   */
  record(params: {
    agentName: string
    model: string
    usage: TokenUsage
    projectId?: string
    tenantId?: string
  }): CostRecord {
    // Normalize usage — support both inputTokens and promptTokens
    const normalizedUsage: TokenUsage = {
      inputTokens: params.usage.inputTokens ?? params.usage.promptTokens ?? 0,
      outputTokens: params.usage.outputTokens ?? params.usage.completionTokens ?? 0,
      totalTokens: params.usage.totalTokens ?? 0,
    }
    if (!normalizedUsage.totalTokens) {
      normalizedUsage.totalTokens = normalizedUsage.inputTokens + normalizedUsage.outputTokens
    }

    const costUSD = calculateCost(params.model, normalizedUsage)

    const record: CostRecord = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      projectId: params.projectId,
      tenantId: params.tenantId,
      agentName: params.agentName,
      model: params.model,
      usage: normalizedUsage,
      costUSD,
    }

    this.records.push(record)

    if (process.env.NODE_ENV !== 'test') {
      logger.info(
        `[CostTracker] ${params.agentName} | ${params.model} | ` +
        `${normalizedUsage.totalTokens} tokens | $${costUSD.toFixed(6)}`
      )
    }

    return record
  }

  /**
   * Get cost summary for a specific project
   */
  getSummary(filter?: { projectId?: string; tenantId?: string }): CostSummary {
    let filtered = this.records

    if (filter?.projectId) {
      filtered = filtered.filter((r) => r.projectId === filter.projectId)
    }
    if (filter?.tenantId) {
      filtered = filtered.filter((r) => r.tenantId === filter.tenantId)
    }

    const byAgent: Record<string, { costUSD: number; tokens: number }> = {}
    const byModel: Record<string, { costUSD: number; tokens: number }> = {}

    let totalCostUSD = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    for (const record of filtered) {
      totalCostUSD += record.costUSD
      totalInputTokens += record.usage.inputTokens
      totalOutputTokens += record.usage.outputTokens

      // By agent
      if (!byAgent[record.agentName]) {
        byAgent[record.agentName] = { costUSD: 0, tokens: 0 }
      }
      byAgent[record.agentName].costUSD += record.costUSD
      byAgent[record.agentName].tokens += record.usage.totalTokens

      // By model
      if (!byModel[record.model]) {
        byModel[record.model] = { costUSD: 0, tokens: 0 }
      }
      byModel[record.model].costUSD += record.costUSD
      byModel[record.model].tokens += record.usage.totalTokens
    }

    return {
      totalCostUSD,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      recordCount: filtered.length,
      byAgent,
      byModel,
    }
  }

  /**
   * Get all records (optionally filtered)
   */
  getRecords(filter?: { projectId?: string; tenantId?: string }): CostRecord[] {
    if (!filter) return [...this.records]
    return this.records.filter((r) => {
      if (filter.projectId && r.projectId !== filter.projectId) return false
      if (filter.tenantId && r.tenantId !== filter.tenantId) return false
      return true
    })
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records = []
  }

  /**
   * Format cost as human-readable string
   */
  static formatCost(costUSD: number): string {
    if (costUSD < 0.01) return `$${(costUSD * 100).toFixed(4)}¢`
    return `$${costUSD.toFixed(4)}`
  }
}

/**
 * Convenience wrapper: extract token usage from Anthropic Claude response
 * (primary usage extractor)
 */
export function extractAnthropicUsage(response: {
  usage?: { input_tokens?: number; output_tokens?: number }
}): TokenUsage {
  const usage = response.usage || {}
  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  }
}

/**
 * Convenience wrapper: extract token usage from OpenAI response
 * (kept for Whisper compatibility)
 */
export function extractOpenAIUsage(response: {
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}): TokenUsage {
  const usage = response.usage || {}
  const inputTokens = usage.prompt_tokens || 0
  const outputTokens = usage.completion_tokens || 0
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens || inputTokens + outputTokens,
  }
}

// Export singleton instance
export const costTracker = CostTracker.getInstance()
