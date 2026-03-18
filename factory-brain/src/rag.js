"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGSystem = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const embeddings_1 = require("./llm/embeddings");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const opencrawl_agent_1 = require("./opencrawl-agent");
const logger_1 = require("./utils/logger");
// ─── Embedding Cache ──────────────────────────────────────────────────────────
/**
 * Simple LRU cache for embeddings.
 * Avoids re-embedding the same text on repeated queries, reducing OpenAI costs.
 */
class EmbeddingCache {
    constructor(maxSize = 500) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // Evict least recently used (first entry)
            const firstKey = this.cache.keys().next().value;
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    get size() {
        return this.cache.size;
    }
}
// ─── RAG System ───────────────────────────────────────────────────────────────
class RAGSystem {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '');
        this.openCrawlAgent = new opencrawl_agent_1.OpenCrawlAgent();
        this.embeddingCache = new EmbeddingCache(500);
    }
    // ─── Embedding Generation ───────────────────────────────────────────────────
    /**
     * Generate a vector embedding for the given text using OpenAI.
     * Results are cached to avoid redundant API calls.
     */
    async generateEmbedding(text) {
        // Truncate to model's effective limit
        const truncated = text.slice(0, RAGSystem.MAX_CHUNK_CHARS);
        const cacheKey = truncated;
        const cached = this.embeddingCache.get(cacheKey);
        if (cached)
            return cached;
        const result = await (0, embeddings_1.createEmbedding)(text, embeddings_1.EMBEDDING_MODELS.VOYAGE);
        const embedding = result.embedding;
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
    }
    /**
     * Generate embeddings for multiple texts in a single API call (batch).
     * More efficient than calling generateEmbedding() in a loop.
     */
    async generateEmbeddingsBatch(texts) {
        const truncated = texts.map((t) => t.slice(0, RAGSystem.MAX_CHUNK_CHARS));
        // Check cache first
        const results = truncated.map((t) => this.embeddingCache.get(t) ?? null);
        const missingIndices = results.map((r, i) => (r === null ? i : -1)).filter((i) => i !== -1);
        if (missingIndices.length > 0) {
            const missingTexts = missingIndices.map((i) => truncated[i]);
            // Voyage AI processes texts individually — batch via Promise.all
            const embeddings = await Promise.all(missingTexts.map((t) => (0, embeddings_1.createEmbedding)(t, embeddings_1.EMBEDDING_MODELS.VOYAGE).then((r) => r.embedding)));
            embeddings.forEach((embedding, batchIdx) => {
                const originalIdx = missingIndices[batchIdx];
                results[originalIdx] = embedding;
                this.embeddingCache.set(truncated[originalIdx], embedding);
            });
        }
        return results;
    }
    // ─── Document Storage ───────────────────────────────────────────────────────
    /**
     * Store a document with its embedding in Supabase pgvector.
     * If no embedding is provided, one is generated automatically.
     */
    async storeDocument(doc) {
        const embedding = doc.embedding ?? (await this.generateEmbedding(`${doc.title}\n\n${doc.content}`));
        const { error } = await this.supabase.from('knowledge_documents').upsert({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            category: doc.category,
            embedding,
            created_at: doc.created_at,
        }, { onConflict: 'id' });
        if (error)
            throw new Error(`Failed to store document "${doc.title}": ${error.message}`);
    }
    /**
     * Load all local Markdown knowledge files from factory-brain/knowledge/
     * and store them with real embeddings in Supabase.
     *
     * Uses batch embedding for efficiency (one API call per directory).
     */
    async loadLocalKnowledge() {
        const knowledgePath = path_1.default.join(process.cwd(), 'factory-brain', 'knowledge');
        let files;
        try {
            const entries = await promises_1.default.readdir(knowledgePath, { withFileTypes: true });
            // Recursively find all .md files
            files = [];
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(entry.name);
                }
                else if (entry.isDirectory()) {
                    const subFiles = await promises_1.default.readdir(path_1.default.join(knowledgePath, entry.name));
                    subFiles
                        .filter((f) => f.endsWith('.md'))
                        .forEach((f) => files.push(path_1.default.join(entry.name, f)));
                }
            }
        }
        catch (err) {
            logger_1.logger.warn('[RAG] Could not read knowledge directory:', err);
            return;
        }
        if (files.length === 0) {
            logger_1.logger.info('[RAG] No knowledge files found.');
            return;
        }
        // Read all files
        const docs = [];
        for (const file of files) {
            const filePath = path_1.default.join(knowledgePath, file);
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const title = path_1.default.basename(file, '.md').replace(/-/g, ' ');
            const category = path_1.default.dirname(file) === '.' ? 'general' : path_1.default.dirname(file);
            docs.push({
                id: `local:${file}`,
                title,
                content,
                category,
                created_at: new Date().toISOString(),
            });
        }
        // Generate embeddings in batch
        logger_1.logger.info(`[RAG] Generating embeddings for ${docs.length} knowledge documents...`);
        const texts = docs.map((d) => `${d.title}\n\n${d.content}`);
        const embeddings = await this.generateEmbeddingsBatch(texts);
        // Store all documents
        for (let i = 0; i < docs.length; i++) {
            await this.storeDocument({ ...docs[i], embedding: embeddings[i] });
        }
        logger_1.logger.info(`[RAG] Successfully loaded ${docs.length} knowledge documents with embeddings.`);
    }
    // ─── Semantic Search ────────────────────────────────────────────────────────
    /**
     * Perform true semantic search using pgvector cosine similarity.
     *
     * Generates a real embedding for the query, then queries Supabase
     * using the match_knowledge RPC function with pgvector.
     */
    async search(query, category, limit = 5) {
        const queryEmbedding = await this.generateEmbedding(query);
        const { data, error } = await this.supabase.rpc('match_knowledge_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: limit,
            filter_category: category ?? null,
        });
        if (error) {
            // Fallback: text search if pgvector RPC is not yet set up
            logger_1.logger.warn('[RAG] pgvector RPC failed, falling back to text search:', error.message);
            return this.textSearchFallback(query, category, limit);
        }
        return (data ?? []);
    }
    /**
     * Fallback full-text search when pgvector is not available.
     * Less accurate than vector search but works without pgvector setup.
     */
    async textSearchFallback(query, category, limit = 5) {
        let queryBuilder = this.supabase
            .from('knowledge_documents')
            .select('id, title, content, category')
            .textSearch('content', query, { type: 'websearch' })
            .limit(limit);
        if (category) {
            queryBuilder = queryBuilder.eq('category', category);
        }
        const { data, error } = await queryBuilder;
        if (error)
            throw new Error(`Text search failed: ${error.message}`);
        return (data ?? []).map((doc) => ({
            ...doc,
            similarity: 0, // Unknown similarity in text search
        }));
    }
    // ─── Category Retrieval ─────────────────────────────────────────────────────
    async getByCategory(category) {
        const { data, error } = await this.supabase
            .from('knowledge_documents')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Failed to get documents by category: ${error.message}`);
        return (data ?? []);
    }
    // ─── Web Crawl & Store ──────────────────────────────────────────────────────
    /**
     * Crawl external sources and store them with real embeddings.
     */
    async crawlAndStore(query, category, limit = 1) {
        const crawledResults = await this.openCrawlAgent.crawl(query, limit);
        for (const result of crawledResults) {
            const embedding = await this.generateEmbedding(`${result.title}\n\n${result.content}`);
            await this.storeDocument({
                id: result.url,
                title: result.title,
                content: result.content,
                category,
                embedding,
                created_at: new Date().toISOString(),
            });
        }
        logger_1.logger.info(`[RAG] Crawled and stored ${crawledResults.length} documents for: "${query}"`);
    }
    // ─── Stats ──────────────────────────────────────────────────────────────────
    getCacheStats() {
        return { size: this.embeddingCache.size, maxSize: 500 };
    }
}
exports.RAGSystem = RAGSystem;
/** OpenAI embedding model - 1536 dimensions, best cost/performance ratio */
RAGSystem.EMBEDDING_MODEL = embeddings_1.EMBEDDING_MODELS.VOYAGE;
/** Maximum characters to embed per document chunk (avoids token limits) */
RAGSystem.MAX_CHUNK_CHARS = 8000;
//# sourceMappingURL=rag.js.map