# @saas-factory/gemini-ai

Google Gemini AI Integration for SaaS Factory

## 🚀 Features

- **Gemini Client**: Production-ready client for Google Gemini AI models
- **AI Agents**: Pre-built agents for architecture, code review, design, content, and data tasks
- **RAG System**: Semantic search with pgvector integration
- **Memory System**: Track projects, lessons, and patterns

## 📦 Installation

```bash
pnpm add @saas-factory/gemini-ai
```

## ⚙️ Configuration

Add to your `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🎯 Usage

### Basic Client Usage

```typescript
import { initializeGeminiClient, getGeminiClient } from '@saas-factory/gemini-ai'

// Initialize client
initializeGeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 2048,
})

// Get client instance
const client = getGeminiClient()

// Simple text generation
const response = await client.generateContent('Explain quantum computing')
console.log(response.text)

// Chat session with history
const chat = client.createChatSession()
await chat.sendMessage('Hello')
await chat.sendMessage('What is AI?')
console.log(chat.history)
```

### AI Agents

```typescript
import {
  ArchitectAgent,
  CodeReviewAgent,
  DesignAgent,
  ContentAgent,
  DataAgent,
} from '@saas-factory/gemini-ai'

const architect = new ArchitectAgent()
const codeReview = new CodeReviewAgent()
const design = new DesignAgent()
const content = new ContentAgent()
const data = new DataAgent()

// Design architecture
const architecture = await architect.designArchitecture(
  'Multi-tenant SaaS with Next.js and Supabase'
)

// Review code
const review = await codeReview.review(
  code,
  'Focus on security and performance'
)

// Design recommendations
const designRecs = await design.recommendDesign('User onboarding flow')

// Generate marketing content
const marketing = await content.generateMarketingContent(
  'SaaS Booking Platform',
  'Small business owners',
  'professional'
)

// Generate SQL query
const sql = await data.generateSQLQuery(
  'users',
  ['active = true', 'created_at > 30 days ago'],
  ['SELECT', 'COUNT']
)
```

### RAG System

```typescript
import { RAGSystem } from '@saas-factory/gemini-ai'

const rag = new RAGSystem()

// Store document
await rag.storeDocument({
  id: 'doc-1',
  title: 'Clean Architecture',
  content: 'Clean architecture principles...',
  category: 'architecture',
})

// Search documents
const results = await rag.search('database patterns', 5)

// Get by category
const docs = await rag.getByCategory('architecture')
```

### Memory System

```typescript
import { MemorySystem } from '@saas-factory/gemini-ai'

const memory = new MemorySystem()

// Record project
await memory.recordProject({
  name: 'SaaS Booking',
  description: 'Hair salon booking system',
  tech_stack: ['Next.js', 'Supabase', 'Stripe'],
  lessons: ['Use RLS for security'],
  metrics: { mrr: 5000, users: 150 },
})

// Add lesson
await memory.addLesson({
  title: 'Database Indexing',
  description: 'Add indexes for performance',
  category: 'performance',
  solution: 'Add B-tree indexes on frequently queried columns',
  projects: ['saas-001'],
})

// Get top patterns
const patterns = await memory.getTopPatterns(5)
```

## 🌟 Available Models

- `gemini-1.5-pro` - Most capable model
- `gemini-1.5-flash` - Fast and efficient (default)
- `gemini-1.0-pro` - Previous generation
- `gemini-1.0-flash` - Fastest model

## 🔧 Configuration Options

```typescript
interface GeminiConfig {
  apiKey: string
  model?: string           // Default: 'gemini-1.5-flash'
  temperature?: number     // Default: 0.7
  maxOutputTokens?: number // Default: 2048
  topP?: number           // Default: 0.95
  topK?: number           // Default: 40
}
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `SUPABASE_URL` | Supabase project URL (for RAG) | No |
| `SUPABASE_ANON_KEY` | Supabase anon key (for RAG) | No |

## 🔄 Migration from Anthropic Claude

To switch from Anthropic Claude to Google Gemini:

1. Install gemini-ai block:
   ```bash
   pnpm add @saas-factory/gemini-ai
   ```

2. Update environment variables:
   ```bash
   # Add to .env.local
   GEMINI_API_KEY=your_gemini_key
   ```

3. Update imports in `factory-brain/src/agents.ts`:
   ```typescript
   // Old (Anthropic)
   import Anthropic from '@anthropic-ai/sdk'
   
   // New (Gemini)
   import { initializeGeminiClient } from '@saas-factory/gemini-ai'
   ```

4. Replace client initialization:
   ```typescript
   // Old
   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
   
   // New
   initializeGeminiClient({
     apiKey: process.env.GEMINI_API_KEY!,
     model: 'gemini-1.5-flash',
   })
   ```

## 📊 Pricing

Google Gemini pricing (as of 2024):
- **gemini-1.5-flash**: $0.075 / 1M input tokens, $0.30 / 1M output tokens
- **gemini-1.5-pro**: $1.25 / 1M input tokens, $5.00 / 1M output tokens

## 📚 Documentation

- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## 🛡️ Safety

Gemini includes built-in safety filters for:
- Harassment
- Hate speech
- Sexually explicit content
- Dangerous content

Safety ratings are included in responses.

## 🔄 Cleanup

```typescript
import { closeGeminiClient } from '@saas-factory/gemini-ai'

// Close client when shutting down
closeGeminiClient()
```
