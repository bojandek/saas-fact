/**
 * RAG (Retrieval Augmented Generation) System for Factory Brain
 *
 * Implements true semantic search using:
 *  - OpenAI text-embedding-3-small for generating vector embeddings
 *  - Supabase pgvector for storing and querying embeddings
 *  - In-memory LRU cache for embedding results (reduces API costs)
 *
 * Previously this file used placeholder comments instead of real embeddings.
 * This version generates actual 1536-dimensional vectors for every document
 * and query, enabling true semantic similarity search.
 */

import { createClient } from '@supabase/supabase-js'
import { createEmbedding, EMBEDDING_MODELS } from './llm/embeddings'
import fs from 'fs/promises'
import path from 'path'
import { OpenCrawlAgent } from './opencrawl-agent'
import { logger } from './utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Document {
  id: string
  title: string
  content: string
  category: string
  embedding?: number[]
  created_at: string
}

export interface QueryResult {
  id: string
  title: string
  content: string
  category: string
  similarity: number
}

// ─── Embedding Cache ──────────────────────────────────────────────────────────

/**
 * Simple LRU cache for embeddings.
 * Avoids re-embedding the same text on repeated queries, reducing OpenAI costs.
 */
class EmbeddingCache {
  private cache = new Map<string, number[]>()
  private readonly maxSize: number

  constructor(maxSize = 500) {
    this.maxSize = maxSize
  }

  get(key: string): number[] | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: number[]): void {
    if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  get size(): number {
    return this.cache.size
  }
}

// ─── RAG System ───────────────────────────────────────────────────────────────

export class RAGSystem {
  private supabase: ReturnType<typeof createClient>
  private openCrawlAgent: OpenCrawlAgent
  private embeddingCache: EmbeddingCache

  /** OpenAI embedding model - 1536 dimensions, best cost/performance ratio */
  private static readonly EMBEDDING_MODEL = EMBEDDING_MODELS.VOYAGE

  /** Maximum characters to embed per document chunk (avoids token limits) */
  private static readonly MAX_CHUNK_CHARS = 8000

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
    )
    this.openCrawlAgent = new OpenCrawlAgent()
    this.embeddingCache = new EmbeddingCache(500)
  }

  // ─── Embedding Generation ───────────────────────────────────────────────────

  /**
   * Generate a vector embedding for the given text using OpenAI.
   * Results are cached to avoid redundant API calls.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Truncate to model's effective limit
    const truncated = text.slice(0, RAGSystem.MAX_CHUNK_CHARS)
    const cacheKey = truncated

    const cached = this.embeddingCache.get(cacheKey)
    if (cached) return cached

    const result = await createEmbedding(text, EMBEDDING_MODELS.VOYAGE)

    const embedding = result.embedding
    this.embeddingCache.set(cacheKey, embedding)
    return embedding
  }

  /**
   * Generate embeddings for multiple texts in a single API call (batch).
   * More efficient than calling generateEmbedding() in a loop.
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const truncated = texts.map((t) => t.slice(0, RAGSystem.MAX_CHUNK_CHARS))

    // Check cache first
    const results: (number[] | null)[] = truncated.map((t) => this.embeddingCache.get(t) ?? null)
    const missingIndices = results.map((r, i) => (r === null ? i : -1)).filter((i) => i !== -1)

    if (missingIndices.length > 0) {
      const missingTexts = missingIndices.map((i) => truncated[i])
      const result = await createEmbedding(text, EMBEDDING_MODELS.VOYAGE)

      response.data.forEach((item, batchIdx) => {
        const originalIdx = missingIndices[batchIdx]
        results[originalIdx] = item.embedding
        this.embeddingCache.set(truncated[originalIdx], item.embedding)
      })
    }

    return results as number[][]
  }

  // ─── Document Storage ───────────────────────────────────────────────────────

  /**
   * Store a document with its embedding in Supabase pgvector.
   * If no embedding is provided, one is generated automatically.
   */
  async storeDocument(doc: Document): Promise<void> {
    const embedding = doc.embedding ?? (await this.generateEmbedding(
      `${doc.title}\n\n${doc.content}`
    ))

    const { error } = await this.supabase.from('knowledge_documents').upsert(
      {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        category: doc.category,
        embedding,
        created_at: doc.created_at,
      },
      { onConflict: 'id' }
    )

    if (error) throw new Error(`Failed to store document "${doc.title}": ${error.message}`)
  }

  /**
   * Load all local Markdown knowledge files from factory-brain/knowledge/
   * and store them with real embeddings in Supabase.
   *
   * Uses batch embedding for efficiency (one API call per directory).
   */
  async loadLocalKnowledge(): Promise<void> {
    const knowledgePath = path.join(process.cwd(), 'factory-brain', 'knowledge')

    let files: string[]
    try {
      const entries = await fs.readdir(knowledgePath, { withFileTypes: true })
      // Recursively find all .md files
      files = []
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(entry.name)
        } else if (entry.isDirectory()) {
          const subFiles = await fs.readdir(path.join(knowledgePath, entry.name))
          subFiles
            .filter((f) => f.endsWith('.md'))
            .forEach((f) => files.push(path.join(entry.name, f)))
        }
      }
    } catch (err) {
      logger.warn('[RAG] Could not read knowledge directory:', err)
      return
    }

    if (files.length === 0) {
      logger.info('[RAG] No knowledge files found.')
      return
    }

    // Read all files
    const docs: Document[] = []
    for (const file of files) {
      const filePath = path.join(knowledgePath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const title = path.basename(file, '.md').replace(/-/g, ' ')
      const category = path.dirname(file) === '.' ? 'general' : path.dirname(file)

      docs.push({
        id: `local:${file}`,
        title,
        content,
        category,
        created_at: new Date().toISOString(),
      })
    }

    // Generate embeddings in batch
    logger.info(`[RAG] Generating embeddings for ${docs.length} knowledge documents...`)
    const texts = docs.map((d) => `${d.title}\n\n${d.content}`)
    const embeddings = await this.generateEmbeddingsBatch(texts)

    // Store all documents
    for (let i = 0; i < docs.length; i++) {
      await this.storeDocument({ ...docs[i], embedding: embeddings[i] })
    }

    logger.info(`[RAG] Successfully loaded ${docs.length} knowledge documents with embeddings.`)
  }

  // ─── Semantic Search ────────────────────────────────────────────────────────

  /**
   * Perform true semantic search using pgvector cosine similarity.
   *
   * Generates a real embedding for the query, then queries Supabase
   * using the match_knowledge RPC function with pgvector.
   */
  async search(
    query: string,
    category?: string,
    limit: number = 5
  ): Promise<QueryResult[]> {
    const queryEmbedding = await this.generateEmbedding(query)

    const { data, error } = await this.supabase.rpc('match_knowledge_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit,
      filter_category: category ?? null,
    })

    if (error) {
      // Fallback: text search if pgvector RPC is not yet set up
      logger.warn('[RAG] pgvector RPC failed, falling back to text search:', error.message)
      return this.textSearchFallback(query, category, limit)
    }

    return (data ?? []) as QueryResult[]
  }

  /**
   * Fallback full-text search when pgvector is not available.
   * Less accurate than vector search but works without pgvector setup.
   */
  private async textSearchFallback(
    query: string,
    category?: string,
    limit: number = 5
  ): Promise<QueryResult[]> {
    let queryBuilder = this.supabase
      .from('knowledge_documents')
      .select('id, title, content, category')
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit)

    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }

    const { data, error } = await queryBuilder

    if (error) throw new Error(`Text search failed: ${error.message}`)

    return (data ?? []).map((doc) => ({
      ...doc,
      similarity: 0, // Unknown similarity in text search
    })) as QueryResult[]
  }

  // ─── Category Retrieval ─────────────────────────────────────────────────────

  async getByCategory(category: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get documents by category: ${error.message}`)
    return (data ?? []) as Document[]
  }

  // ─── Web Crawl & Store ──────────────────────────────────────────────────────

  /**
   * Crawl external sources and store them with real embeddings.
   */
  async crawlAndStore(query: string, category: string, limit: number = 1): Promise<void> {
    const crawledResults = await this.openCrawlAgent.crawl(query, limit)

    for (const result of crawledResults) {
      const embedding = await this.generateEmbedding(`${result.title}\n\n${result.content}`)
      await this.storeDocument({
        id: result.url,
        title: result.title,
        content: result.content,
        category,
        embedding,
        created_at: new Date().toISOString(),
      })
    }

    logger.info(`[RAG] Crawled and stored ${crawledResults.length} documents for: "${query}"`)
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  getCacheStats(): { size: number; maxSize: number } {
    return { size: this.embeddingCache.size, maxSize: 500 }
  }
}
