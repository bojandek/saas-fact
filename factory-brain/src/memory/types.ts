/**
 * Shared types for the Always-On Memory System.
 *
 * Architecture inspired by Google's Always-On Memory Agent (ADK):
 * https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
 *
 * Adapted for TypeScript with Supabase + OpenAI instead of SQLite + Gemini.
 */

// ── Source Types ──────────────────────────────────────────────────────────────

export type SourceType = 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'agent' | 'url'

export const SUPPORTED_TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.csv', '.log', '.xml', '.yaml', '.yml', '.ts', '.js', '.py',
])

export const SUPPORTED_MEDIA_EXTENSIONS: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  // Documents
  '.pdf': 'application/pdf',
}

export const ALL_SUPPORTED_EXTENSIONS = new Set([
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...Object.keys(SUPPORTED_MEDIA_EXTENSIONS),
])

// ── Memory ────────────────────────────────────────────────────────────────────

export interface MemoryConnection {
  linked_to: number
  relationship: string
}

export interface Memory {
  id: number
  source: string
  source_type: SourceType
  raw_text: string
  summary: string
  entities: string[]
  topics: string[]
  importance: number
  connections: MemoryConnection[]
  embedding?: number[]
  consolidated: boolean
  project_id?: string
  created_at: string
  updated_at: string
}

export interface MemoryInput {
  raw_text: string
  summary: string
  entities: string[]
  topics: string[]
  importance: number
  source?: string
  source_type?: SourceType
  project_id?: string
}

export interface StoredMemory {
  memory_id: number
  status: 'stored'
  summary: string
}

// ── Consolidation ─────────────────────────────────────────────────────────────

export interface ConsolidationConnection {
  from_id: number
  to_id: number
  relationship: string
}

export interface Consolidation {
  id: number
  source_ids: number[]
  summary: string
  insight: string
  connections: ConsolidationConnection[]
  created_at: string
}

export interface ConsolidationInput {
  source_ids: number[]
  summary: string
  insight: string
  connections: ConsolidationConnection[]
}

export interface StoredConsolidation {
  status: 'consolidated'
  memories_processed: number
  insight: string
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface MemoryStats {
  total_memories: number
  unconsolidated: number
  consolidations: number
  by_source_type: Record<SourceType, number>
  by_project: Record<string, number>
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface MemorySearchResult extends Omit<Memory, 'embedding'> {
  similarity: number
}

export interface ConsolidationSearchResult extends Omit<Consolidation, 'connections'> {
  similarity: number
}

export interface QueryResult {
  answer: string
  memories_used: MemorySearchResult[]
  consolidations_used: ConsolidationSearchResult[]
  confidence: number
  sources: string[]
}

// ── File Processing ───────────────────────────────────────────────────────────

export interface ProcessedFile {
  path: string
  file_hash: string
  memory_id?: number
  processed_at: string
}

export interface IngestResult {
  memory_id: number
  source: string
  summary: string
  entities: string[]
  topics: string[]
  importance: number
  already_processed?: boolean
}
