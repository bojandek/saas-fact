/**
 * Google Gemini AI Client
 * Production-ready client for Google Gemini AI models
 */

import {
  GoogleGenerativeAI,
  ChatSession,
  GenerativeModel,
  StartChatParams,
  GenerateContentResponse,
} from '@google/generative-ai'

import type {
  GeminiConfig,
  GeminiMessage,
  GeminiResponse,
  GeminiChatSession,
  GeminiStreamResponse,
  GeminiModel,
} from './types'

class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: GenerativeModel
  private config: GeminiConfig

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required')
    }

    this.config = {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.95,
      topK: 40,
      ...config,
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model as GeminiModel,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    })
  }

  /**
   * Create a chat session with conversation history
   */
  createChatSession(params?: StartChatParams): GeminiChatSession {
    const chatParams: StartChatParams = {
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
      ...params,
    }

    const chat = this.model.startChat(chatParams)

    return {
      async sendMessage(message: string): Promise<GeminiResponse> {
        const result = await chat.sendMessage(message)
        const response = result.response
        return {
          text: response.text(),
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: response.text() }],
              },
              safetyRatings: response.candidates?.[0].safetyRatings || [],
            },
          ],
          usageMetadata: response.usageMetadata,
        }
      },

      async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
        const result = await chat.sendMessageStream(message)
        for await (const chunk of result.stream) {
          const text = chunk.text()
          yield text
        }
      },

      get history(): GeminiMessage[] {
        return chat.history.map((msg) => ({
          role: msg.role as 'user' | 'model',
          parts: msg.parts.map((part) => ({ text: part.text })),
        }))
      },

      addMessage(role: 'user' | 'model', text: string): void {
        chat.history.push({
          role,
          parts: [{ text }],
        })
      },

      reset(): void {
        chat.history = []
      },
    }
  }

  /**
   * Simple text generation without chat history
   */
  async generateContent(prompt: string): Promise<GeminiResponse> {
    const result = await this.model.generateContent(prompt)
    const response = result.response

    return {
      text: response.text(),
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: response.text() }],
          },
          safetyRatings: response.candidates?.[0].safetyRatings || [],
        },
      ],
      usageMetadata: response.usageMetadata,
    }
  }

  /**
   * Stream text generation
   */
  async *generateContentStream(prompt: string): AsyncGenerator<string, void, unknown> {
    const result = await this.model.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      yield chunk.text()
    }
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      name: this.config.model,
      temperature: this.config.temperature,
      maxOutputTokens: this.config.maxOutputTokens,
      topP: this.config.topP,
      topK: this.config.topK,
    }
  }

  /**
   * Close client and cleanup resources
   */
  close(): void {
    // Gemini client doesn't require explicit cleanup
    // This is here for consistency with other AI clients
  }
}

// Singleton instance
let clientInstance: GeminiClient | null = null

export function initializeGeminiClient(config: GeminiConfig): GeminiClient {
  if (!clientInstance) {
    clientInstance = new GeminiClient(config)
  }
  return clientInstance
}

export function getGeminiClient(): GeminiClient {
  if (!clientInstance) {
    throw new Error(
      'Gemini client not initialized. Call initializeGeminiClient() first.'
    )
  }
  return clientInstance
}

export function closeGeminiClient(): void {
  clientInstance?.close()
  clientInstance = null
}

export { GeminiClient }
