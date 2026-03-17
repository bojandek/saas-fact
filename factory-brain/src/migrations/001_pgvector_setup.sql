-- ============================================================
-- Migration: 001_pgvector_setup.sql
-- Description: Enable pgvector extension and create knowledge
--              documents table with vector similarity search.
--
-- Run this in your Supabase SQL editor before using the RAG system.
-- ============================================================

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the knowledge documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  embedding   vector(1536),          -- OpenAI text-embedding-3-small dimensions
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create an IVFFlat index for fast approximate nearest-neighbor search
--    lists = sqrt(number of rows) is a good starting point
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx
  ON knowledge_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create a GIN index on category for fast filtering
CREATE INDEX IF NOT EXISTS knowledge_documents_category_idx
  ON knowledge_documents (category);

-- 5. Full-text search index for fallback
CREATE INDEX IF NOT EXISTS knowledge_documents_content_fts_idx
  ON knowledge_documents
  USING gin (to_tsvector('english', content));

-- 6. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RPC function for semantic similarity search using pgvector
--    Called by RAGSystem.search() in rag.ts
CREATE OR REPLACE FUNCTION match_knowledge_documents(
  query_embedding   vector(1536),
  match_threshold   FLOAT    DEFAULT 0.5,
  match_count       INT      DEFAULT 5,
  filter_category   TEXT     DEFAULT NULL
)
RETURNS TABLE (
  id          TEXT,
  title       TEXT,
  content     TEXT,
  category    TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.title,
    kd.content,
    kd.category,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  WHERE
    kd.embedding IS NOT NULL
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
    AND (filter_category IS NULL OR kd.category = filter_category)
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Enable Row Level Security
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by factory-brain backend)
CREATE POLICY "Service role full access"
  ON knowledge_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read knowledge"
  ON knowledge_documents
  FOR SELECT
  TO authenticated
  USING (true);
