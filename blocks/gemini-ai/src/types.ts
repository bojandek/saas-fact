/**
 * Google Gemini AI Types
 */

export interface GeminiConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiPart {
  text: string
}

export interface GeminiChatSession {
  sendMessage: (message: string) => Promise<GeminiResponse>
  sendMessageStream: (message: string) => AsyncGenerator<string, void, unknown>
  history: GeminiMessage[]
  addMessage: (role: 'user' | 'model', text: string) => void
  reset: () => void
}

export interface GeminiResponse {
  text: string
  candidates: GeminiCandidate[]
  usageMetadata?: GeminiUsageMetadata
}

export interface GeminiCandidate {
  content: GeminiContent
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER'
  safetyRatings: GeminiSafetyRating[]
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiSafetyRating {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_DANGEROUS_CONTENT' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_CIVIC_INTEGRITY'
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface GeminiUsageMetadata {
  promptTokenCount: number
  candidatesTokenCount?: number
  totalTokenCount: number
}

export interface GeminiStreamResponse {
  text: string
  usageMetadata?: GeminiUsageMetadata
}

export type GeminiModel = 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.0-pro' | 'gemini-1.0-flash'
