/**
 * Tests for the RAG System with real OpenAI embeddings.
 *
 * Uses vitest with mocked OpenAI and Supabase clients to avoid
 * real API calls during CI/CD.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RAGSystem } from './rag'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [
            { embedding: new Array(1536).fill(0.1) },
          ],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      },
    })),
  }
})

// Mock Supabase
const mockSupabaseRpc = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    rpc: mockSupabaseRpc,
    from: mockSupabaseFrom,
  }),
}))

// Mock OpenCrawlAgent
vi.mock('./opencrawl-agent', () => ({
  OpenCrawlAgent: vi.fn().mockImplementation(() => ({
    crawl: vi.fn().mockResolvedValue([
      { url: 'https://example.com', title: 'Example', content: 'Example content' },
    ]),
  })),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RAGSystem', () => {
  let rag: RAGSystem

  beforeEach(() => {
    vi.clearAllMocks()
    rag = new RAGSystem()
  })

  describe('generateEmbedding', () => {
    it('should generate a 1536-dimensional embedding', async () => {
      const embedding = await rag.generateEmbedding('What is a SaaS product?')
      expect(embedding).toHaveLength(1536)
      expect(embedding[0]).toBe(0.1)
    })

    it('should cache embeddings and not call OpenAI twice for same text', async () => {
      const text = 'Cached text query'
      await rag.generateEmbedding(text)
      await rag.generateEmbedding(text)

      // OpenAI should only be called once due to cache
      const { default: OpenAI } = await import('openai')
      const instance = (OpenAI as ReturnType<typeof vi.fn>).mock.results[0].value
      expect(instance.embeddings.create).toHaveBeenCalledTimes(1)
    })

    it('should truncate text longer than 8000 characters', async () => {
      const longText = 'a'.repeat(10000)
      const embedding = await rag.generateEmbedding(longText)
      expect(embedding).toHaveLength(1536)

      const { default: OpenAI } = await import('openai')
      const instance = (OpenAI as ReturnType<typeof vi.fn>).mock.results[0].value
      const callArg = instance.embeddings.create.mock.calls[0][0]
      expect(callArg.input.length).toBeLessThanOrEqual(8000)
    })
  })

  describe('generateEmbeddingsBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Mock batch response
      const { default: OpenAI } = await import('openai')
      const instance = (OpenAI as ReturnType<typeof vi.fn>).mock.results[0].value
      instance.embeddings.create.mockResolvedValueOnce({
        data: [
          { embedding: new Array(1536).fill(0.1) },
          { embedding: new Array(1536).fill(0.2) },
        ],
      })

      const texts = ['First text', 'Second text']
      const embeddings = await rag.generateEmbeddingsBatch(texts)

      expect(embeddings).toHaveLength(2)
      expect(embeddings[0]).toHaveLength(1536)
      expect(embeddings[1]).toHaveLength(1536)
    })
  })

  describe('storeDocument', () => {
    it('should store a document with generated embedding', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ upsert: mockUpsert })

      await rag.storeDocument({
        id: 'test-doc-1',
        title: 'Test Document',
        content: 'This is test content for the RAG system.',
        category: 'testing',
        created_at: new Date().toISOString(),
      })

      expect(mockSupabaseFrom).toHaveBeenCalledWith('knowledge_documents')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-doc-1',
          title: 'Test Document',
          embedding: expect.arrayContaining([0.1]),
        }),
        { onConflict: 'id' }
      )
    })

    it('should use provided embedding instead of generating one', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ upsert: mockUpsert })

      const providedEmbedding = new Array(1536).fill(0.5)
      await rag.storeDocument({
        id: 'test-doc-2',
        title: 'Pre-embedded Document',
        content: 'Content here.',
        category: 'testing',
        embedding: providedEmbedding,
        created_at: new Date().toISOString(),
      })

      const storedDoc = mockUpsert.mock.calls[0][0]
      expect(storedDoc.embedding).toEqual(providedEmbedding)
    })

    it('should throw an error if Supabase upsert fails', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'DB error' } })
      mockSupabaseFrom.mockReturnValue({ upsert: mockUpsert })

      await expect(
        rag.storeDocument({
          id: 'fail-doc',
          title: 'Fail',
          content: 'Content',
          category: 'test',
          created_at: new Date().toISOString(),
        })
      ).rejects.toThrow('Failed to store document "Fail": DB error')
    })
  })

  describe('search', () => {
    it('should perform semantic search using pgvector RPC', async () => {
      const mockResults = [
        { id: '1', title: 'SaaS Pricing', content: 'Pricing strategies...', category: 'saas', similarity: 0.92 },
        { id: '2', title: 'SaaS Growth', content: 'Growth hacking...', category: 'saas', similarity: 0.85 },
      ]
      mockSupabaseRpc.mockResolvedValue({ data: mockResults, error: null })

      const results = await rag.search('how to price a SaaS product', 'saas', 5)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('match_knowledge_documents', {
        query_embedding: expect.arrayContaining([0.1]),
        match_threshold: 0.5,
        match_count: 5,
        filter_category: 'saas',
      })
      expect(results).toHaveLength(2)
      expect(results[0].similarity).toBe(0.92)
    })

    it('should fall back to text search if pgvector RPC fails', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } })

      const mockTextSearchResult = [
        { id: '3', title: 'Fallback Result', content: 'Text match...', category: 'general' },
      ]
      const mockSelect = vi.fn().mockReturnThis()
      const mockTextSearch = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({ data: mockTextSearchResult, error: null })

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        textSearch: mockTextSearch,
        limit: mockLimit,
      })

      const results = await rag.search('pricing strategies')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Fallback Result')
      expect(results[0].similarity).toBe(0) // Unknown in text search
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = rag.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats.maxSize).toBe(500)
    })
  })
})
