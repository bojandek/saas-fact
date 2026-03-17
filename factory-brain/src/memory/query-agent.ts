/**
 * QueryAgent — Always-On Memory System
 *
 * Answers questions by searching stored memories and consolidation insights
 * using vector similarity search (pgvector). Always cites sources.
 *
 * Inspired by Google's QueryAgent from the Always-On Memory Agent (ADK).
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { logger } from '../utils/logger'
import { withRetry } from '../utils/retry'
import type {
  ConsolidationSearchResult,
  MemorySearchResult,
  MemoryStats,
  QueryResult,
} from './types'

const log = logger.child({ agent: 'QueryAgent' })

// ── Clients ───────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key)
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openai = getOpenAI()
  const response = await withRetry(
    () => openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.slice(0, 8000),
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )
  return response.data[0].embedding
}

// ── Search ────────────────────────────────────────────────────────────────────

async function searchMemories(
  queryEmbedding: number[],
  matchThreshold = 0.6,
  matchCount = 8,
  projectId?: string
): Promise<MemorySearchResult[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('search_memories', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_project: projectId ?? null,
  })

  if (error) {
    // Fallback: full-text search if pgvector not available
    log.warn({ error: error.message }, 'Vector search failed, falling back to full-text')
    const { data: fallback } = await supabase
      .from('memories')
      .select('id, source, source_type, summary, entities, topics, importance, connections, project_id, created_at, consolidated, updated_at, raw_text')
      .order('importance', { ascending: false })
      .limit(matchCount)
    return (fallback ?? []).map(m => ({ ...m, similarity: 0.5 })) as MemorySearchResult[]
  }

  return (data ?? []) as MemorySearchResult[]
}

async function searchConsolidations(
  queryEmbedding: number[],
  matchThreshold = 0.6,
  matchCount = 4
): Promise<ConsolidationSearchResult[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('search_consolidations', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })

  if (error) {
    log.warn({ error: error.message }, 'Consolidation vector search failed')
    return []
  }

  return (data ?? []) as ConsolidationSearchResult[]
}

// ── Answer Generation ─────────────────────────────────────────────────────────

async function generateAnswer(
  query: string,
  memories: MemorySearchResult[],
  consolidations: ConsolidationSearchResult[]
): Promise<{ answer: string; confidence: number; sources: string[] }> {
  const openai = getOpenAI()

  if (memories.length === 0 && consolidations.length === 0) {
    return {
      answer: 'I have no relevant memories about this topic yet. Try ingesting some related documents or running a few SaaS generation projects first.',
      confidence: 0,
      sources: [],
    }
  }

  const memoriesContext = memories
    .map(m => `[Memory #${m.id}] (similarity: ${(m.similarity * 100).toFixed(0)}%, source: ${m.source}, importance: ${m.importance})\n${m.summary}`)
    .join('\n\n')

  const consolidationsContext = consolidations.length > 0
    ? '\n\n## Consolidation Insights:\n' + consolidations
        .map(c => `[Insight #${c.id}] (similarity: ${(c.similarity * 100).toFixed(0)}%)\n${c.insight}\nSummary: ${c.summary}`)
        .join('\n\n')
    : ''

  const systemPrompt = `You are a Memory Query Agent for a SaaS Factory AI system.
Answer questions based ONLY on the provided memories and consolidation insights.
Always cite sources using [Memory #N] or [Insight #N] notation.
If memories are insufficient, say so honestly.
Be concise but thorough. Focus on actionable information.`

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Question: ${query}\n\n## Relevant Memories:\n${memoriesContext}${consolidationsContext}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )

  const answer = response.choices[0].message.content ?? 'Could not generate answer'

  // Calculate confidence based on similarity scores
  const avgSimilarity = memories.length > 0
    ? memories.reduce((sum, m) => sum + m.similarity, 0) / memories.length
    : 0
  const confidence = Math.min(1, avgSimilarity * 1.2) // slight boost for having results

  // Extract unique sources
  const sources = [...new Set(memories.map(m => m.source).filter(Boolean))]

  return { answer, confidence, sources }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Query the memory system with a natural language question.
 * Returns an answer with citations and confidence score.
 */
export async function queryMemory(
  query: string,
  options: {
    matchThreshold?: number
    maxMemories?: number
    projectId?: string
  } = {}
): Promise<QueryResult> {
  const { matchThreshold = 0.6, maxMemories = 8, projectId } = options

  log.info({ query: query.slice(0, 80), projectId }, 'Processing memory query')

  const queryEmbedding = await generateQueryEmbedding(query)

  const [memories, consolidations] = await Promise.all([
    searchMemories(queryEmbedding, matchThreshold, maxMemories, projectId),
    searchConsolidations(queryEmbedding, matchThreshold, 4),
  ])

  log.info(
    { memories_found: memories.length, consolidations_found: consolidations.length },
    'Search complete'
  )

  const { answer, confidence, sources } = await generateAnswer(query, memories, consolidations)

  return {
    answer,
    memories_used: memories,
    consolidations_used: consolidations,
    confidence,
    sources,
  }
}

/**
 * Get memory statistics.
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  const supabase = getSupabase()

  const [
    { count: total },
    { count: unconsolidated },
    { count: consolidations },
    { data: byType },
    { data: byProject },
  ] = await Promise.all([
    supabase.from('memories').select('*', { count: 'exact', head: true }),
    supabase.from('memories').select('*', { count: 'exact', head: true }).eq('consolidated', false),
    supabase.from('memory_consolidations').select('*', { count: 'exact', head: true }),
    supabase.from('memories').select('source_type'),
    supabase.from('memories').select('project_id').not('project_id', 'is', null),
  ])

  // Count by source type
  const bySourceType: Record<string, number> = {}
  for (const row of byType ?? []) {
    bySourceType[row.source_type] = (bySourceType[row.source_type] ?? 0) + 1
  }

  // Count by project
  const byProjectMap: Record<string, number> = {}
  for (const row of byProject ?? []) {
    if (row.project_id) {
      byProjectMap[row.project_id] = (byProjectMap[row.project_id] ?? 0) + 1
    }
  }

  return {
    total_memories: total ?? 0,
    unconsolidated: unconsolidated ?? 0,
    consolidations: consolidations ?? 0,
    by_source_type: bySourceType as MemoryStats['by_source_type'],
    by_project: byProjectMap,
  }
}

/**
 * Get all memories (paginated).
 */
export async function getAllMemories(
  page = 1,
  pageSize = 20,
  projectId?: string
) {
  const supabase = getSupabase()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('memories')
    .select('id, source, source_type, summary, entities, topics, importance, consolidated, project_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, count, error } = await query
  if (error) throw new Error(`Failed to get memories: ${error.message}`)

  return { memories: data ?? [], total: count ?? 0, page, pageSize }
}
