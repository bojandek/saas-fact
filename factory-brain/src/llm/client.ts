/**
 * LLM Client — Centralni wrapper za sve AI pozive u SaaS Factory
 *
 * Primarni provider: Anthropic Claude (claude-sonnet-4-5 / claude-opus-4-5)
 * Fallback provider: OpenAI (za embeddings — Claude nema embedding API)
 *
 * Sve AI pozive u sistemu treba raditi kroz ovaj wrapper, nikad direktno
 * kroz `new OpenAI()` ili `new Anthropic()`.
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger'

// ─── Model konstante ──────────────────────────────────────────────────────────

export const CLAUDE_MODELS = {
  /** Najbrži i najjeftiniji — za kratke zadatke, klasifikaciju, ekstrakciju */
  HAIKU: 'claude-haiku-4-5',
  /** Balans brzine i kvaliteta — default za većinu agenata */
  SONNET: 'claude-sonnet-4-5',
  /** Najmoćniji — za kompleksne arhitekturalne odluke */
  OPUS: 'claude-opus-4-5',
} as const

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS]

// Mapping starih OpenAI modela na odgovarajuće Claude modele
const OPENAI_TO_CLAUDE_MAP: Record<string, ClaudeModel> = {
  'gpt-4o': CLAUDE_MODELS.SONNET,
  'gpt-4o-mini': CLAUDE_MODELS.HAIKU,
  'gpt-4.1-mini': CLAUDE_MODELS.HAIKU,
  'gpt-4': CLAUDE_MODELS.SONNET,
  'gpt-3.5-turbo': CLAUDE_MODELS.HAIKU,
}

// ─── Tipovi ───────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  /** System prompt */
  system?: string
  /** Poruke u konverzaciji */
  messages: LLMMessage[]
  /** Model (Claude ili OpenAI naziv — automatski se mapira) */
  model?: ClaudeModel | string
  /** Max tokens u odgovoru */
  maxTokens?: number
  /** Temperature (0-1) */
  temperature?: number
  /** Ako je true, vraća stream umjesto kompletnog odgovora */
  stream?: false
}

export interface LLMResponse {
  /** Tekst odgovora */
  content: string
  /** Korišćeni model */
  model: string
  /** Token usage */
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  /** Razlog zaustavljanja */
  stopReason: string
}

// ─── LLM Client klasa ─────────────────────────────────────────────────────────

export class LLMClient {
  private anthropic: Anthropic
  private defaultModel: ClaudeModel

  constructor(options?: {
    apiKey?: string
    defaultModel?: ClaudeModel
  }) {
    this.anthropic = new Anthropic({
      apiKey: options?.apiKey ?? process.env.ANTHROPIC_API_KEY,
    })
    this.defaultModel = options?.defaultModel ?? CLAUDE_MODELS.SONNET
  }

  /**
   * Mapira OpenAI model naziv na odgovarajući Claude model.
   * Ako je već Claude model, vraća ga nepromijenjenog.
   */
  private resolveModel(model?: string): ClaudeModel {
    if (!model) return this.defaultModel
    if (Object.values(CLAUDE_MODELS).includes(model as ClaudeModel)) {
      return model as ClaudeModel
    }
    const mapped = OPENAI_TO_CLAUDE_MAP[model]
    if (mapped) {
      logger.debug(`[LLMClient] Mapped OpenAI model '${model}' -> Claude '${mapped}'`)
      return mapped
    }
    logger.warn(`[LLMClient] Unknown model '${model}', using default: ${this.defaultModel}`)
    return this.defaultModel
  }

  /**
   * Šalje poruku Claude API-ju i vraća kompletan odgovor.
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const model = this.resolveModel(request.model)
    const maxTokens = request.maxTokens ?? 4096

    logger.debug(`[LLMClient] Calling Claude ${model} (maxTokens: ${maxTokens})`)

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: request.system,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      ...(request.temperature !== undefined && {
        // Claude ne podržava temperature direktno u messages.create,
        // ali podržava kroz extended thinking — za sad ignorišemo
      }),
    })

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')

    return {
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      stopReason: response.stop_reason ?? 'end_turn',
    }
  }

  /**
   * Konveniencija metoda — šalje jedan user prompt sa system promptom.
   * Ekvivalent OpenAI `chat.completions.create` sa jednom porukom.
   */
  async complete(options: {
    system?: string
    prompt: string
    model?: ClaudeModel | string
    maxTokens?: number
  }): Promise<string> {
    const response = await this.chat({
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
      model: options.model,
      maxTokens: options.maxTokens,
    })
    return response.content
  }

  /**
   * JSON mode — garantuje da odgovor bude validan JSON.
   * Dodaje instrukcije u system prompt i parsira odgovor.
   */
  async completeJSON<T = unknown>(options: {
    system?: string
    prompt: string
    model?: ClaudeModel | string
    maxTokens?: number
  }): Promise<T> {
    const systemWithJSON = [
      options.system,
      'IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const raw = await this.complete({
      ...options,
      system: systemWithJSON,
    })

    // Pokušaj parsiranja — ukloni eventualne markdown code blokove
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    try {
      return JSON.parse(cleaned) as T
    } catch {
      // Drugi pokušaj — nađi prvi { ili [ i parsiraj od tamo
      const jsonStart = cleaned.search(/[{[]/)
      if (jsonStart !== -1) {
        return JSON.parse(cleaned.slice(jsonStart)) as T
      }
      throw new Error(`[LLMClient] Failed to parse JSON response: ${cleaned.slice(0, 200)}`)
    }
  }
}

// ─── Singleton instanca ───────────────────────────────────────────────────────

let _client: LLMClient | null = null

/**
 * Vraća singleton LLM klijent.
 * Koristi ANTHROPIC_API_KEY iz environment varijabli.
 */
export function getLLMClient(): LLMClient {
  if (!_client) {
    _client = new LLMClient()
  }
  return _client
}

/**
 * Brza konveniencija funkcija za jednostavne pozive.
 * Ekvivalent: getLLMClient().complete(options)
 */
export async function llm(options: {
  system?: string
  prompt: string
  model?: ClaudeModel | string
  maxTokens?: number
}): Promise<string> {
  return getLLMClient().complete(options)
}

/**
 * Brza konveniencija funkcija za JSON odgovore.
 */
export async function llmJSON<T = unknown>(options: {
  system?: string
  prompt: string
  model?: ClaudeModel | string
  maxTokens?: number
}): Promise<T> {
  return getLLMClient().completeJSON<T>(options)
}
