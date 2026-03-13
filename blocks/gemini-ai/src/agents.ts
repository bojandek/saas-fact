/**
 * Factory Brain AI Agents with Google Gemini
 * Orchestrates Gemini AI for various SaaS tasks
 */

import { RAGSystem } from './rag'
import { MemorySystem } from './memory'
import {
  initializeGeminiClient,
  getGeminiClient,
  closeGeminiClient,
} from '@saas-factory/gemini-ai'

import type { GeminiConfig } from '@saas-factory/gemini-ai'

// Initialize Gemini client
const geminiConfig: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 2048,
}

initializeGeminiClient(geminiConfig)

const rag = new RAGSystem()
const memory = new MemorySystem()

export class ArchitectAgent {
  /**
   * Design SaaS architecture based on requirements
   * Enhanced with RAG knowledge and learned patterns
   */
  async designArchitecture(requirements: string): Promise<string> {
    // Search knowledge base for similar architectures
    const similarDocs = await rag.search(requirements, 3)
    const topPatterns = await memory.getTopPatterns(5)

    const context = `
Similar architectures from knowledge base:
${similarDocs.map(d => `- ${d.title}: ${d.content.substring(0, 200)}`).join('\n')}

Proven patterns:
${topPatterns.map(p => `- ${p.name}: ${p.description}`).join('\n')}
`

    const geminiClient = getGeminiClient()
    const chat = geminiClient.createChatSession()

    const response = await chat.sendMessage(
      `Design architecture for: ${requirements}\n\n${context}`
    )

    return response.text
  }

  /**
   * Generate project scaffolding code
   */
  async generateScaffold(saasType: string, techStack: string[]): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Generate a ${saasType} SaaS scaffold using: ${techStack.join(', ')}. 
      Include folder structure, key components, and type definitions in TypeScript.`
    )

    return response.text
  }
}

export class CodeReviewAgent {
  /**
   * Review code for best practices, security, performance
   */
  async review(code: string, context?: string): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Review this code for best practices, security, and performance:\n\n${code}${context ? `\n\nContext: ${context}` : ''}`
    )

    return response.text
  }
}

export class DesignAgent {
  /**
   * Recommend UI/UX design based on Apple HIG and Laws of UX
   */
  async recommendDesign(feature: string): Promise<string> {
    const designDocs = await rag.search(feature, 5)
    const context = designDocs
      .map(d => `- ${d.title}: ${d.content.substring(0, 200)}`)
      .join('\n')

    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Recommend UI/UX design for: ${feature}\n\nDesign principles from knowledge base:\n${context}`
    )

    return response.text
  }
}

export class ContentAgent {
  /**
   * Generate marketing content
   */
  async generateMarketingContent(
    product: string,
    targetAudience: string,
    tone: 'professional' | 'casual' | 'enthusiastic' = 'professional'
  ): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Generate marketing content for: ${product}\nTarget audience: ${targetAudience}\nTone: ${tone}\n\nInclude: headline, value proposition, call-to-action`
    )

    return response.text
  }

  /**
   * Generate blog post
   */
  async generateBlogPost(topic: string, wordCount: number = 1000): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Write a comprehensive blog post about: ${topic}\n\nTarget word count: ${wordCount} words\nInclude: introduction, main sections, conclusion, and actionable takeaways`
    )

    return response.text
  }
}

export class DataAgent {
  /**
   * Generate SQL queries
   */
  async generateSQLQuery(
    table: string,
    conditions: string[],
    operations: string[]
  ): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Generate SQL query for table: ${table}\nConditions: ${conditions.join(', ')}\nOperations: ${operations.join(', ')}\n\nReturn only the SQL query, no explanations`
    )

    return response.text
  }

  /**
   * Generate TypeScript types
   */
  async generateTypes(schema: string): Promise<string> {
    const geminiClient = getGeminiClient()
    const response = await geminiClient.generateContent(
      `Generate TypeScript interfaces/types based on this schema:\n\n${schema}\n\nUse strict typing and include JSDoc comments`
    )

    return response.text
  }
}

// Cleanup on shutdown
process.on('SIGINT', () => {
  closeGeminiClient()
  process.exit(0)
})

process.on('SIGTERM', () => {
  closeGeminiClient()
  process.exit(0)
})
