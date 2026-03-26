// @ts-nocheck
/**
 * ConsolidateAgent — Always-On Memory System
 *
 * Like the human brain during sleep, this agent periodically reviews
 * unconsolidated memories, finds connections between them, and generates
 * cross-cutting insights.
 *
 * Inspired by Google's ConsolidateAgent from the Always-On Memory Agent (ADK).
 * Runs as a cron job (default: every 60 minutes).
 */

import { createClient } from '@supabase/supabase-js'
import { getLLMClient, CLAUDE_MODELS } from '../llm/client'
import { createEmbedding, EMBEDDING_MODELS } from '../llm/embeddings'
import { logger } from '../utils/logger'
import { withRetry } from '../utils/retry'
import type {
  ConsolidationConnection,
  ConsolidationInput,
  Memory,
  StoredConsolidation,
} from './types'

const log = logger.child({ agent: 'ConsolidateAgent' })

// ── Clients ───────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key)
}

const llm = getLLMClient()

// ── Database Operations ───────────────────────────────────────────────────────

async function readUnconsolidatedMemories(limit = 10): Promise<Memory[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('memories')
    .select('id, source, source_type, summary, entities, topics, importance, connections, consolidated, project_id, created_at, updated_at, raw_text')
    .eq('consolidated', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to read unconsolidated memories: ${error.message}`)
  return (data ?? []) as Memory[]
}

async function storeConsolidation(input: ConsolidationInput): Promise<StoredConsolidation> {
  const supabase = getSupabase()
  

  // Generate embedding for the insight
  const embeddingText = `${input.summary} ${input.insight}`
  const embeddingResponse = await withRetry(
    () => createEmbedding({
      model: EMBEDDING_MODELS.VOYAGE,
      input: embeddingText.slice(0, 8000),
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )
  const embedding = embeddingResponse.data[0].embedding

  // Store the consolidation
  const { error: insertError } = await supabase
    .from('memory_consolidations')
    .insert({
      source_ids: input.source_ids,
      summary: input.summary,
      insight: input.insight,
      connections: input.connections,
      embedding,
    })

  if (insertError) throw new Error(`Failed to store consolidation: ${insertError.message}`)

  // Update connections on individual memories
  for (const conn of input.connections) {
    for (const memId of [conn.from_id, conn.to_id]) {
      const { data: memData } = await supabase
        .from('memories')
        .select('connections')
        .eq('id', memId)
        .single()

      if (memData) {
        const existing: ConsolidationConnection[] = memData.connections ?? []
        const linkedTo = memId === conn.from_id ? conn.to_id : conn.from_id
        existing.push({ from_id: conn.from_id, to_id: linkedTo, relationship: conn.relationship })
        await supabase
          .from('memories')
          .update({ connections: existing })
          .eq('id', memId)
      }
    }
  }

  // Mark source memories as consolidated
  const { error: updateError } = await supabase
    .from('memories')
    .update({ consolidated: true })
    .in('id', input.source_ids)

  if (updateError) throw new Error(`Failed to mark memories as consolidated: ${updateError.message}`)

  log.info(
    { memories_processed: input.source_ids.length, insight: input.insight.slice(0, 80) },
    'Consolidation stored'
  )

  return {
    status: 'consolidated',
    memories_processed: input.source_ids.length,
    insight: input.insight,
  }
}

// ── Consolidation Logic ───────────────────────────────────────────────────────

/**
 * Uses GPT-4o to find patterns and connections across memories.
 */
async function analyzeMemories(memories: Memory[]): Promise<ConsolidationInput> {
  

  const memorySummaries = memories
    .map(m => `[Memory #${m.id}] Source: ${m.source} | Topics: ${m.topics.join(', ')} | Importance: ${m.importance}\nSummary: ${m.summary}`)
    .join('\n\n')

  const systemPrompt = `You are a Memory Consolidation Agent for a SaaS Factory AI system.
Your job is to analyze a batch of memories and find:
1. Connections and patterns between them
2. A synthesized summary across all memories
3. One key architectural or business insight

Return a JSON object with:
- summary: synthesized summary of all memories (2-3 sentences)
- insight: ONE key pattern or insight discovered (start with "Pattern:" or "Insight:")
- connections: array of objects with { from_id, to_id, relationship } describing how memories relate

Focus on:
- Recurring architectural patterns (e.g., "booking SaaS always needs X")
- Technology stack preferences
- Business model patterns
- Common failure modes or challenges
- Opportunities for reuse across projects

Return valid JSON only, no markdown.`

  const response = await withRetry(
    () => llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze these ${memories.length} memories:\n\n${memorySummaries}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}')

  return {
    source_ids: memories.map(m => m.id),
    summary: parsed.summary ?? 'Multiple memories consolidated',
    insight: parsed.insight ?? 'No specific insight found',
    connections: Array.isArray(parsed.connections)
      ? parsed.connections.filter(
          (c: ConsolidationConnection) =>
            typeof c.from_id === 'number' &&
            typeof c.to_id === 'number' &&
            typeof c.relationship === 'string'
        )
      : [],
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a single consolidation cycle.
 * Reads unconsolidated memories, finds patterns, stores insights.
 *
 * @returns null if not enough memories to consolidate
 */
export async function runConsolidationCycle(
  minMemories = 2,
  batchSize = 10
): Promise<StoredConsolidation | null> {
  log.info('Starting consolidation cycle')

  const memories = await readUnconsolidatedMemories(batchSize)

  if (memories.length < minMemories) {
    log.info({ count: memories.length, minMemories }, 'Not enough memories to consolidate')
    return null
  }

  log.info({ count: memories.length }, 'Analyzing memories for consolidation')

  const consolidationInput = await analyzeMemories(memories)
  const result = await storeConsolidation(consolidationInput)

  log.info(
    { insight: result.insight.slice(0, 100), memories_processed: result.memories_processed },
    'Consolidation cycle complete'
  )

  return result
}

/**
 * Start the consolidation cron job.
 * Runs every `intervalMs` milliseconds (default: 60 minutes).
 *
 * @returns A function to stop the cron job
 */
export function startConsolidationCron(
  intervalMs = 60 * 60 * 1000, // 1 hour default
  minMemories = 2
): () => void {
  log.info({ intervalMs: intervalMs / 1000 / 60, unit: 'minutes' }, 'Starting consolidation cron')

  let running = false

  const tick = async () => {
    if (running) {
      log.warn('Consolidation already running, skipping tick')
      return
    }
    running = true
    try {
      await runConsolidationCycle(minMemories)
    } catch (err) {
      log.error({ err }, 'Consolidation cycle failed')
    } finally {
      running = false
    }
  }

  // Run immediately on start, then on interval
  tick()
  const timer = setInterval(tick, intervalMs)

  return () => {
    clearInterval(timer)
    log.info('Consolidation cron stopped')
  }
}

/**
 * Get consolidation history.
 */
export async function getConsolidationHistory(limit = 10) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('memory_consolidations')
    .select('id, summary, insight, source_ids, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to get consolidation history: ${error.message}`)
  return data ?? []
}
