import { describe, it, expect, beforeEach } from 'vitest'
import {
  CostTracker,
  calculateCost,
  extractOpenAIUsage,
  extractAnthropicUsage,
  MODEL_PRICING,
} from './cost-tracker'

describe('calculateCost', () => {
  it('should calculate cost for gpt-4o-mini correctly', () => {
    const cost = calculateCost('gpt-4o-mini', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000,
    })
    // $0.15 input + $0.60 output = $0.75
    expect(cost).toBeCloseTo(0.75, 4)
  })

  it('should calculate cost for claude-3-5-sonnet correctly', () => {
    const cost = calculateCost('claude-3-5-sonnet-20241022', {
      inputTokens: 1_000,
      outputTokens: 500,
      totalTokens: 1_500,
    })
    // $3.00/M * 0.001 + $15.00/M * 0.0005 = $0.003 + $0.0075 = $0.0105
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it('should return 0 for unknown model', () => {
    const cost = calculateCost('unknown-model-xyz', {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    })
    expect(cost).toBe(0)
  })
})

describe('CostTracker', () => {
  let tracker: CostTracker

  beforeEach(() => {
    tracker = CostTracker.getInstance()
    tracker.clear()
  })

  it('should record a cost entry', () => {
    const record = tracker.record({
      agentName: 'ArchitectAgent',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
      projectId: 'proj-001',
    })

    expect(record.agentName).toBe('ArchitectAgent')
    expect(record.costUSD).toBeGreaterThan(0)
    expect(record.projectId).toBe('proj-001')
  })

  it('should return correct summary', () => {
    tracker.record({
      agentName: 'ArchitectAgent',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      projectId: 'proj-001',
    })
    tracker.record({
      agentName: 'QaAgent',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 800, outputTokens: 300, totalTokens: 1100 },
      projectId: 'proj-001',
    })

    const summary = tracker.getSummary({ projectId: 'proj-001' })
    expect(summary.recordCount).toBe(2)
    expect(summary.totalTokens).toBe(2600)
    expect(summary.byAgent['ArchitectAgent']).toBeDefined()
    expect(summary.byAgent['QaAgent']).toBeDefined()
    expect(summary.byModel['gpt-4o-mini']).toBeDefined()
  })

  it('should filter by project', () => {
    tracker.record({
      agentName: 'Agent1',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      projectId: 'proj-A',
    })
    tracker.record({
      agentName: 'Agent2',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
      projectId: 'proj-B',
    })

    const summaryA = tracker.getSummary({ projectId: 'proj-A' })
    expect(summaryA.recordCount).toBe(1)
    expect(summaryA.totalTokens).toBe(150)
  })
})

describe('extractOpenAIUsage', () => {
  it('should extract usage from OpenAI response', () => {
    const response = {
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    }
    const usage = extractOpenAIUsage(response)
    expect(usage.inputTokens).toBe(100)
    expect(usage.outputTokens).toBe(50)
    expect(usage.totalTokens).toBe(150)
  })

  it('should handle missing usage gracefully', () => {
    const usage = extractOpenAIUsage({})
    expect(usage.inputTokens).toBe(0)
    expect(usage.outputTokens).toBe(0)
    expect(usage.totalTokens).toBe(0)
  })
})

describe('extractAnthropicUsage', () => {
  it('should extract usage from Anthropic response', () => {
    const response = {
      usage: { input_tokens: 200, output_tokens: 80 },
    }
    const usage = extractAnthropicUsage(response)
    expect(usage.inputTokens).toBe(200)
    expect(usage.outputTokens).toBe(80)
    expect(usage.totalTokens).toBe(280)
  })
})
