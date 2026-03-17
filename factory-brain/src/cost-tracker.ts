/**
import { logger } from './utils/logger'
 * Cost Tracker - AI API Usage & Cost Monitoring
 *
 * Intercepts all OpenAI and Anthropic API calls to track token usage
 * and calculate costs per project, per tenant, and per agent.
 *
 * Pricing (as of 2025):
 *   - GPT-4o-mini:         $0.15 / 1M input tokens,  $0.60 / 1M output tokens
 *   - GPT-4o:              $2.50 / 1M input tokens,  $10.00 / 1M output tokens
 *   - Claude 3.5 Sonnet:   $3.00 / 1M input tokens,  $15.00 / 1M output tokens
 *   - Claude 3 Haiku:      $0.25 / 1M input tokens,  $1.25 / 1M output tokens
 */

export interface ModelPricing {
  inputPer1M: number  // USD per 1M input tokens
  outputPer1M: number // USD per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini':                { inputPer1M: 0.15,  outputPer1M: 0.60  },
  'gpt-4o':                     { inputPer1M: 2.50,  outputPer1M: 10.00 },
  'gpt-4.1-mini':               { inputPer1M: 0.40,  outputPer1M: 1.60  },
  'gpt-4.1':                    { inputPer1M: 2.00,  outputPer1M: 8.00  },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-3-haiku-20240307':    { inputPer1M: 0.25,  outputPer1M: 1.25  },
  'claude-3-opus-20240229':     { inputPer1M: 15.00, outputPer1M: 75.00 },
  'gemini-2.5-flash':           { inputPer1M: 0.075, outputPer1M: 0.30  },
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
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
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M
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
    const costUSD = calculateCost(params.model, params.usage)

    const record: CostRecord = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      projectId: params.projectId,
      tenantId: params.tenantId,
      agentName: params.agentName,
      model: params.model,
      usage: params.usage,
      costUSD,
    }

    this.records.push(record)

    if (process.env.NODE_ENV !== 'test') {
      logger.info(
        `[CostTracker] ${params.agentName} | ${params.model} | ` +
        `${params.usage.totalTokens} tokens | $${costUSD.toFixed(6)}`
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
 * Convenience wrapper: extract token usage from OpenAI response
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

/**
 * Convenience wrapper: extract token usage from Anthropic response
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

// Export singleton instance
export const costTracker = CostTracker.getInstance()
