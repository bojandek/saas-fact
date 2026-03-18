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
export interface Document {
    id: string;
    title: string;
    content: string;
    category: string;
    embedding?: number[];
    created_at: string;
}
export interface QueryResult {
    id: string;
    title: string;
    content: string;
    category: string;
    similarity: number;
}
export declare class RAGSystem {
    private supabase;
    private openCrawlAgent;
    private embeddingCache;
    /** OpenAI embedding model - 1536 dimensions, best cost/performance ratio */
    private static readonly EMBEDDING_MODEL;
    /** Maximum characters to embed per document chunk (avoids token limits) */
    private static readonly MAX_CHUNK_CHARS;
    constructor();
    /**
     * Generate a vector embedding for the given text using OpenAI.
     * Results are cached to avoid redundant API calls.
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Generate embeddings for multiple texts in a single API call (batch).
     * More efficient than calling generateEmbedding() in a loop.
     */
    generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
    /**
     * Store a document with its embedding in Supabase pgvector.
     * If no embedding is provided, one is generated automatically.
     */
    storeDocument(doc: Document): Promise<void>;
    /**
     * Load all local Markdown knowledge files from factory-brain/knowledge/
     * and store them with real embeddings in Supabase.
     *
     * Uses batch embedding for efficiency (one API call per directory).
     */
    loadLocalKnowledge(): Promise<void>;
    /**
     * Perform true semantic search using pgvector cosine similarity.
     *
     * Generates a real embedding for the query, then queries Supabase
     * using the match_knowledge RPC function with pgvector.
     */
    search(query: string, category?: string, limit?: number): Promise<QueryResult[]>;
    /**
     * Fallback full-text search when pgvector is not available.
     * Less accurate than vector search but works without pgvector setup.
     */
    private textSearchFallback;
    getByCategory(category: string): Promise<Document[]>;
    /**
     * Crawl external sources and store them with real embeddings.
     */
    crawlAndStore(query: string, category: string, limit?: number): Promise<void>;
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
}
//# sourceMappingURL=rag.d.ts.map