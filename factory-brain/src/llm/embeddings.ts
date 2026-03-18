/**
 * Embeddings — Voyage AI kao primarni provider (Anthropic preporučuje)
 *
 * Anthropic Claude nema vlastiti embedding API.
 * Voyage AI je Anthropic-preporučeni embedding provider.
 * Fallback: OpenAI text-embedding-3-small (ako VOYAGE_API_KEY nije postavljen)
 *
 * Voyage AI modeli:
 *   - voyage-3-large  — 1024 dim, najkvalitetniji
 *   - voyage-3        — 1024 dim, balans
 *   - voyage-3-lite   — 512 dim, najbrži i najjeftiniji
 *   - voyage-code-3   — optimiziran za kod
 */

import { logger } from '../utils/logger'

export const EMBEDDING_MODELS = {
  VOYAGE_LARGE: 'voyage-3-large',
  VOYAGE: 'voyage-3',
  VOYAGE_LITE: 'voyage-3-lite',
  VOYAGE_CODE: 'voyage-code-3',
  // OpenAI fallback
  OPENAI_SMALL: 'text-embedding-3-small',
  OPENAI_LARGE: 'text-embedding-3-large',
} as const

export type EmbeddingModel = typeof EMBEDDING_MODELS[keyof typeof EMBEDDING_MODELS]

export interface EmbeddingResult {
  embedding: number[]
  model: string
  tokens: number
}

/**
 * Kreira embedding vektor za dati tekst.
 * Koristi Voyage AI ako je VOYAGE_API_KEY postavljen,
 * inače fallback na OpenAI.
 */
export async function createEmbedding(
  text: string,
  model: EmbeddingModel = EMBEDDING_MODELS.VOYAGE
): Promise<EmbeddingResult> {
  const voyageKey = process.env.VOYAGE_API_KEY

  if (voyageKey && !model.startsWith('text-embedding')) {
    return createVoyageEmbedding(text, model as string, voyageKey)
  }

  // Fallback na OpenAI
  logger.debug('[Embeddings] VOYAGE_API_KEY not set, falling back to OpenAI embeddings')
  return createOpenAIEmbedding(text, EMBEDDING_MODELS.OPENAI_SMALL)
}

async function createVoyageEmbedding(
  text: string,
  model: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text.slice(0, 32000), // Voyage limit
      model,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`[Embeddings] Voyage API error: ${error}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>
    usage: { total_tokens: number }
    model: string
  }

  return {
    embedding: data.data[0].embedding,
    model: data.model,
    tokens: data.usage.total_tokens,
  }
}

async function createOpenAIEmbedding(
  text: string,
  model: string
): Promise<EmbeddingResult> {
  // Dinamički import da ne zahtijeva openai paket ako se ne koristi
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await client.embeddings.create({
    model,
    input: text.slice(0, 8000),
  })

  return {
    embedding: response.data[0].embedding,
    model: response.model,
    tokens: response.usage.total_tokens,
  }
}

/**
 * Batch embeddings — kreira embeddings za više tekstova odjednom.
 */
export async function createEmbeddings(
  texts: string[],
  model: EmbeddingModel = EMBEDDING_MODELS.VOYAGE
): Promise<EmbeddingResult[]> {
  const voyageKey = process.env.VOYAGE_API_KEY

  if (voyageKey && !model.startsWith('text-embedding')) {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        input: texts.map(t => t.slice(0, 32000)),
        model,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`[Embeddings] Voyage batch API error: ${error}`)
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>
      usage: { total_tokens: number }
      model: string
    }

    return data.data
      .sort((a, b) => a.index - b.index)
      .map(item => ({
        embedding: item.embedding,
        model: data.model,
        tokens: Math.floor(data.usage.total_tokens / texts.length),
      }))
  }

  // Fallback: sekvencijalni OpenAI pozivi
  return Promise.all(texts.map(text => createOpenAIEmbedding(text, EMBEDDING_MODELS.OPENAI_SMALL)))
}
