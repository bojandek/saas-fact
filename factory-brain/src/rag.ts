/**
 * RAG (Retrieval Augmented Generation) system for Factory Brain
 * Integrates pgvector in Supabase with Claude for semantic search
 */

import { createClient } from '@supabase/supabase-js'
import { OpenCrawlAgent } from './opencrawl-agent';

interface Document {
  id: string
  title: string
  content: string
  category: string
  embedding?: number[]
  created_at: string
}

interface QueryResult {
  id: string
  title: string
  content: string
  similarity: number
}

export class RAGSystem {
  private openCrawlAgent: OpenCrawlAgent;
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );
    this.openCrawlAgent = new OpenCrawlAgent();
  }

  /**
   * Store document with embedding (called by Supabase trigger)
   */
  async storeDocument(doc: Document): Promise<void> {
    const { error } = await this.supabase
      .from('knowledge_documents')
      .insert({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        embedding: doc.embedding,
      })

    if (error) throw error
  }

  /**
   * Semantic search using pgvector similarity
   * Returns top similar documents
   */
  async search(query: string, limit: number = 5): Promise<QueryResult[]> {
    // In production, query embedding would be generated via Claude
    // For now, use simple semantic search via SQL
    const { data, error } = await this.supabase.rpc(
      'search_knowledge',
      {
        query_text: query,
        match_limit: limit,
        match_threshold: 0.6,
      }
    )

    if (error) throw error
    return data as QueryResult[]
  }

  /**
   * Get documents by category
   */
  async getByCategory(category: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Document[]
  }

  /**
   * Crawl external sources and store documents in the knowledge base
   */
  async crawlAndStore(query: string, category: string, limit: number = 1): Promise<void> {
    const crawledResults = await this.openCrawlAgent.crawl(query, limit);

    for (const result of crawledResults) {
      // In a real scenario, embedding would be generated here before storing
      await this.storeDocument({
        id: result.url, // Using URL as ID for simplicity
        title: result.title,
        content: result.content,
        category: category,
        created_at: new Date().toISOString(),
      });
    }
    console.log(`Crawled and stored ${crawledResults.length} documents for query: ${query}`);
  }
}

export type { Document, QueryResult }
