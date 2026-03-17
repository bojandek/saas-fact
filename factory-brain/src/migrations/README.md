# RAG System — Database Setup

This directory contains SQL migrations for the **pgvector-powered RAG system** in Factory Brain.

## Prerequisites

- Supabase project with **pgvector extension** enabled
- OpenAI API key (for `text-embedding-3-small` model)

## Setup Instructions

### 1. Run the Migration

Open your [Supabase SQL Editor](https://app.supabase.com) and run:

```sql
-- Copy and paste the contents of 001_pgvector_setup.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

> **Important:** Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for the RAG system,
> as it needs to bypass Row Level Security when indexing documents.

### 3. Load Knowledge Base

After running the migration, load the local knowledge documents:

```typescript
import { RAGSystem } from './factory-brain/src/rag'

const rag = new RAGSystem()
await rag.loadLocalKnowledge()
// Generates real OpenAI embeddings for all .md files in factory-brain/knowledge/
```

## How It Works

| Step | Description |
|------|-------------|
| **Indexing** | Documents are embedded using `text-embedding-3-small` (1536 dimensions) and stored in Supabase with pgvector |
| **Caching** | An LRU cache (500 entries) prevents redundant OpenAI API calls for repeated queries |
| **Search** | Queries are embedded and matched using cosine similarity via the `match_knowledge_documents` RPC |
| **Fallback** | If pgvector is unavailable, falls back to PostgreSQL full-text search |

## Cost Estimate

| Operation | Tokens | Cost (approx.) |
|-----------|--------|----------------|
| Embed one document (avg. 500 words) | ~700 | $0.000014 |
| Embed all 20 knowledge files | ~14,000 | $0.00028 |
| 1,000 search queries | ~500,000 | $0.01 |

`text-embedding-3-small` pricing: $0.02 per 1M tokens (as of 2025).
