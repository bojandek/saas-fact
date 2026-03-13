/**
 * Google Gemini AI Integration for SaaS Factory
 * 
 * This block provides Google Gemini AI integration as an alternative to Anthropic Claude.
 * It includes:
 * - Gemini client for text generation and chat
 * - AI Agents (Architect, CodeReview, Design, Content, Data)
 * - RAG system for semantic search
 * - Memory system for learning and patterns
 */

// Client
export {
  initializeGeminiClient,
  getGeminiClient,
  closeGeminiClient,
  GeminiClient,
} from './client'

// Types
export type {
  GeminiConfig,
  GeminiMessage,
  GeminiPart,
  GeminiChatSession,
  GeminiResponse,
  GeminiCandidate,
  GeminiContent,
  GeminiSafetyRating,
  GeminiUsageMetadata,
  GeminiStreamResponse,
  GeminiModel,
} from './types'

// Agents
export {
  ArchitectAgent,
  CodeReviewAgent,
  DesignAgent,
  ContentAgent,
  DataAgent,
} from './agents'

// RAG System
export { RAGSystem } from './rag'
export type { Document, QueryResult } from './rag'

// Memory System
export { MemorySystem } from './memory'
export type { ProjectMemory, Lesson, Pattern } from './memory'
