# 🚀 SaaS Factory - Nova Modula Integracija

## 📋 Pregled Novih Modula

Ovaj dokument opisuje nova modula dodana u SaaS Factory:

1. **@saas-factory/gemini-ai** - Google Gemini AI integracija
2. **@saas-factory/firecrawl** - Web scraping i market research

---

## 🧠 @saas-factory/gemini-ai

### Opis
Google Gemini AI integracija kao zamjena za Anthropic Claude. Omogućava:
- Tekst generaciju i chat sa Gemini modelima
- AI agenti za arhitekturu, code review, design, content i data
- RAG sistem za semantičku pretragu
- Memory sistem za praćenje projekata i lekcija

### Instalacija

```bash
pnpm add @saas-factory/gemini-ai
```

### Konfiguracija

```bash
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Ključne Funkcionalnosti

#### Client
```typescript
import { initializeGeminiClient, getGeminiClient } from '@saas-factory/gemini-ai'

initializeGeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 2048,
})

const client = getGeminiClient()
const response = await client.generateContent('Explain quantum computing')
```

#### AI Agents
```typescript
import {
  ArchitectAgent,
  CodeReviewAgent,
  DesignAgent,
  ContentAgent,
  DataAgent,
} from '@saas-factory/gemini-ai'

const architect = new ArchitectAgent()
const architecture = await architect.designArchitecture('Multi-tenant SaaS')

const codeReview = new CodeReviewAgent()
const review = await codeReview.review(code, 'Focus on security')

const design = new DesignAgent()
const designRecs = await design.recommendDesign('User onboarding')

const content = new ContentAgent()
const marketing = await content.generateMarketingContent(
  'SaaS Platform',
  'Small businesses',
  'professional'
)

const data = new DataAgent()
const sql = await data.generateSQLQuery('users', ['active = true'], ['SELECT', 'COUNT'])
```

#### RAG System
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

// Search
const results = await rag.search('database patterns', 5)
```

#### Memory System
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

// Get top patterns
const patterns = await memory.getTopPatterns(5)
```

### Dostupni Modeli
- `gemini-1.5-pro` - Najsposobniji model
- `gemini-1.5-flash` - Brz i efikasan (default)
- `gemini-1.0-pro` - Prethodna generacija
- `gemini-1.0-flash` - Najbrži model

---

## 🕷️ @saas-factory/firecrawl

### Opis
Web scraping i ekstrakcija podataka za SaaS Factory. Omogućava:
- Scraping pojedinačnih URL-ova
- Crawlanje više stranica
- Parsing sitemap-ova
- Ekstrakcija znanja (pricing, features, insights)
- Market analiza
- AI agenti za market research, competitor analysis i content extraction

### Instalacija

```bash
pnpm add @saas-factory/firecrawl
```

### Konfiguracija

```bash
# .env.local (opcionalno - koristi se ugrađeni scraper ako nije navedeno)
FIRECRAWL_API_KEY=your_firecrawl_api_key
FIRECRAWL_API_URL=https://api.firecrawl.dev
```

### Ključne Funkcionalnosti

#### Client
```typescript
import { initializeFirecrawlClient, getFirecrawlClient } from '@saas-factory/firecrawl'

initializeFirecrawlClient({
  apiKey: process.env.FIRECRAWL_API_KEY,
  timeout: 60000,
  maxPages: 100,
})

const client = getFirecrawlClient()

// Scrape single URL
const content = await client.scrape('https://example.com/pricing')

// Crawl website
const pages = await client.crawlAndWait('https://example.com', {
  limit: 50,
  maxDepth: 3,
})

// Scrape multiple URLs
const contents = await client.scrapeMultiple([
  'https://competitor1.com/pricing',
  'https://competitor2.com/pricing',
])
```

#### Market Research Agent
```typescript
import { MarketResearchAgent } from '@saas-factory/firecrawl'

const agent = new MarketResearchAgent()

// Research entire market
const insights = await agent.researchMarket('dental software', [
  'https://competitor1.com/pricing',
  'https://competitor2.com/pricing',
  'https://competitor3.com/pricing',
])

console.log(insights)
// {
//   totalCompetitors: 3,
//   averagePricing: 49,
//   topFeatures: ['Appointment scheduling', 'Patient portal', 'Billing'],
//   marketGaps: ['No mobile app', 'Missing AI features'],
//   recommendations: ['Price around $45/month', 'Focus on mobile']
// }

// Extract pricing
const pricing = await agent.extractPricing([
  'https://competitor1.com/pricing',
  'https://competitor2.com/pricing',
])

// Extract features
const features = await agent.extractFeatures([
  'https://competitor1.com/features',
  'https://competitor2.com/features',
])
```

#### Competitor Analysis Agent
```typescript
import { CompetitorAnalysisAgent } from '@saas-factory/firecrawl'

const agent = new CompetitorAnalysisAgent()

// Analyze competitors
const competitors = await agent.analyzeCompetitors('dental software', [
  'https://competitor1.com',
  'https://competitor2.com',
  'https://competitor3.com',
])

console.log(competitors)
// [
//   {
//     name: 'Competitor 1',
//     url: 'https://competitor1.com',
//     strengths: ['Great UI', 'Fast performance'],
//     weaknesses: ['No mobile app', 'Expensive'],
//     pricing: '$49/month',
//     features: ['Scheduling', 'Billing', 'Reports'],
//     marketPosition: 'leader'
//   },
//   // ...
// ]
```

#### Content Extraction Agent
```typescript
import { ContentExtractionAgent } from '@saas-factory/firecrawl'

const agent = new ContentExtractionAgent()

// Extract content from single URL
const content = await agent.extractContent('https://example.com/blog/post')

// Crawl entire website
const pages = await agent.crawlWebsite('https://example.com', 50)

// Build knowledge base from competitors
const knowledge = await agent.buildKnowledgeBase('dental software', [
  'https://competitor1.com',
  'https://competitor2.com',
  'https://competitor3.com',
])

// Scrape sitemap
const urls = await agent.scrapeSitemap('https://example.com/sitemap.xml')
```

#### Quick Start - Firecrawl Input
```typescript
import { firecrawlInput } from '@saas-factory/firecrawl'

// Quick market research
const insights = await firecrawlInput('dental software')
```

---

## 🔗 Integracija sa Postojećim Modulima

### Integracija sa Factory Brain

```typescript
import { MemorySystem, RAGSystem } from '@saas-factory/gemini-ai'
import { MarketResearchAgent, CompetitorAnalysisAgent } from '@saas-factory/firecrawl'

async function researchAndBuildSaaS(niche: string, competitorUrls: string[]) {
  // Step 1: Market research with Firecrawl
  const marketResearch = new MarketResearchAgent()
  const insights = await marketResearch.researchMarket(niche, competitorUrls)
  
  // Step 2: Competitor analysis
  const competitorAnalysis = new CompetitorAnalysisAgent()
  const competitors = await competitorAnalysis.analyzeCompetitors(niche, competitorUrls)
  
  // Step 3: Store in memory
  const memory = new MemorySystem()
  await memory.recordProject({
    name: `${niche} SaaS`,
    description: `Market research for ${niche}`,
    tech_stack: ['Next.js', 'Supabase', 'Stripe'],
    lessons: [`Market avg price: $${insights.averagePricing}/month`],
    metrics: {
      competitors: insights.totalCompetitors,
      avgPricing: insights.averagePricing,
      topFeatures: insights.topFeatures,
    },
  })
  
  // Step 4: Store knowledge in RAG
  const rag = new RAGSystem()
  await rag.storeDocument({
    id: `market-${niche}`,
    title: `${niche} Market Analysis`,
    content: JSON.stringify(insights),
    category: 'market-research',
  })
  
  // Step 5: Generate architecture with Gemini
  const { ArchitectAgent } = await import('@saas-factory/gemini-ai')
  const architect = new ArchitectAgent()
  const architecture = await architect.designArchitecture(
    `Multi-tenant SaaS for ${niche} with pricing $${insights.averagePricing}/month`
  )
  
  return { insights, competitors, architecture }
}
```

### Complete Workflow Integration

```typescript
// Complete SaaS Factory workflow with new modules

import {
  initializeGeminiClient,
  getGeminiClient,
  MemorySystem,
  RAGSystem,
  ArchitectAgent,
} from '@saas-factory/gemini-ai'

import {
  initializeFirecrawlClient,
  firecrawlInput,
  CompetitorAnalysisAgent,
} from '@saas-factory/firecrawl'

// 1. Initialize clients
initializeGeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
})

initializeFirecrawlClient({
  apiKey: process.env.FIRECRAWL_API_KEY,
})

// 2. Firecrawl input - gather market data
const niche = 'dental software'
const insights = await firecrawlInput(niche)

// 3. Competitor analysis
const competitors = await new CompetitorAnalysisAgent()
  .analyzeCompetitors(niche, insights.topCompetitors)

// 4. Store in memory
const memory = new MemorySystem()
await memory.recordProject({
  name: `${niche} SaaS`,
  description: `Market research for ${niche}`,
  tech_stack: ['Next.js', 'Supabase', 'Stripe'],
  lessons: [`Market avg price: $${insights.averagePricing}/month`],
  metrics: {
    competitors: insights.totalCompetitors,
    avgPricing: insights.averagePricing,
  },
})

// 5. Store knowledge in RAG
const rag = new RAGSystem()
await rag.storeDocument({
  id: `market-${niche}`,
  title: `${niche} Market Analysis`,
  content: JSON.stringify(insights),
  category: 'market-research',
})

// 6. Generate architecture
const architect = new ArchitectAgent()
const architecture = await architect.designArchitecture(
  `Multi-tenant SaaS for ${niche} with pricing $${insights.averagePricing}/month`
)

// 7. Generate scaffold
const scaffold = await architect.generateScaffold(
  `${niche} booking system`,
  ['Next.js', 'TypeScript', 'Tailwind', 'Supabase', 'Stripe']
)

console.log('SaaS Factory workflow complete!')
console.log('Architecture:', architecture)
console.log('Scaffold:', scaffold)
```

---

## 📊 Pricing

### Gemini AI
- **gemini-1.5-flash**: $0.075 / 1M input tokens, $0.30 / 1M output tokens
- **gemini-1.5-pro**: $1.25 / 1M input tokens, $5.00 / 1M output tokens

### Firecrawl
- **Free Tier (Built-in)**: Unlimited scraping with rate limits
- **Firecrawl API**:
  - Free: 100 credits/month
  - Pro: $29/month for 5000 credits
  - Enterprise: Custom pricing

---

## 🎯 Next Steps

Nakon implementacije ova dva nova modula, možete dodati:

1. **AgentHub** - Git-based collaboration space za AI agente
2. **AI Agency** - Specijalizovani agenti (Design, Code, Marketing)
3. **Heretic** - Uncensored AI za duboku analizu
4. **Skill Store** - Biblioteka promptova sa prompts.chat
5. **Free-for-dev** - Besplatni tier-ovi za infrastrukturu

---

## 📚 Dokumentacija

- [Gemini AI README](blocks/gemini-ai/README.md)
- [Firecrawl README](blocks/firecrawl/README.md)
- [Google Vision AI Integration](GOOGLE_VISION_AI_INTEGRATION.md)

---

**Status**: ✅ Implementirano i spremno za korištenje
