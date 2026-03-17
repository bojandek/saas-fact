-- ============================================================
-- Migration 002: Always-On Memory System
-- 
-- Implements the Ingest → Consolidate → Query pattern
-- inspired by Google's Always-On Memory Agent (ADK).
--
-- Tables:
--   memories           - Individual ingested memories
--   memory_consolidations - Cross-memory insights
--   memory_processed_files - Tracks ingested files (dedup)
--
-- Run in Supabase SQL Editor or via psql.
-- ============================================================

-- Enable pgvector if not already enabled (from migration 001)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── memories ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT '',       -- filename, URL, agent name, etc.
  source_type TEXT NOT NULL DEFAULT 'text',   -- text | image | audio | video | pdf | agent
  raw_text    TEXT NOT NULL,                  -- original content / description
  summary     TEXT NOT NULL,                  -- 1-2 sentence summary
  entities    JSONB NOT NULL DEFAULT '[]',    -- ["Stripe", "multi-tenant", ...]
  topics      JSONB NOT NULL DEFAULT '[]',    -- ["payments", "SaaS", ...]
  importance  FLOAT NOT NULL DEFAULT 0.5,     -- 0.0 - 1.0
  connections JSONB NOT NULL DEFAULT '[]',    -- [{linked_to: id, relationship: "..."}]
  embedding   vector(1536),                   -- OpenAI text-embedding-3-small
  consolidated BOOLEAN NOT NULL DEFAULT FALSE,
  project_id  TEXT,                           -- optional: link to a SaaS project
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Index for filtering by consolidation status
CREATE INDEX IF NOT EXISTS memories_consolidated_idx
  ON memories (consolidated, created_at DESC);

-- Index for filtering by project
CREATE INDEX IF NOT EXISTS memories_project_idx
  ON memories (project_id, created_at DESC);

-- ── memory_consolidations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_consolidations (
  id          BIGSERIAL PRIMARY KEY,
  source_ids  JSONB NOT NULL,                 -- [1, 2, 3, ...]
  summary     TEXT NOT NULL,                  -- synthesized summary
  insight     TEXT NOT NULL,                  -- one key pattern/insight
  connections JSONB NOT NULL DEFAULT '[]',    -- cross-memory connections found
  embedding   vector(1536),                   -- embedding of the insight
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consolidations_embedding_idx
  ON memory_consolidations USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);

-- ── memory_processed_files ────────────────────────────────────
-- Tracks which files have been ingested to prevent re-processing
CREATE TABLE IF NOT EXISTS memory_processed_files (
  path         TEXT PRIMARY KEY,
  file_hash    TEXT NOT NULL,                 -- SHA256 of file content
  memory_id    BIGINT REFERENCES memories(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_processed_files ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by factory-brain server)
CREATE POLICY "Service role full access on memories"
  ON memories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on consolidations"
  ON memory_consolidations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on processed files"
  ON memory_processed_files FOR ALL
  USING (auth.role() = 'service_role');

-- ── Helper Functions ──────────────────────────────────────────

-- Search memories by vector similarity
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT DEFAULT 10,
  filter_project  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id          BIGINT,
  source      TEXT,
  source_type TEXT,
  summary     TEXT,
  entities    JSONB,
  topics      JSONB,
  importance  FLOAT,
  connections JSONB,
  project_id  TEXT,
  created_at  TIMESTAMPTZ,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.source, m.source_type, m.summary,
    m.entities, m.topics, m.importance, m.connections,
    m.project_id, m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE
    m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND (filter_project IS NULL OR m.project_id = filter_project)
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search consolidations by vector similarity
CREATE OR REPLACE FUNCTION search_consolidations(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id         BIGINT,
  summary    TEXT,
  insight    TEXT,
  source_ids JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.summary, c.insight, c.source_ids, c.created_at,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM memory_consolidations c
  WHERE
    c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
