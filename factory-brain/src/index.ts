/**
 * Factory Brain - AI-powered SaaS development system
 * Combines knowledge, memory, and agents for rapid SaaS creation
 */

export { RAGSystem } from './rag'
export { MemorySystem } from './memory'
export { ArchitectAgent, CodeReviewAgent, DesignAgent } from './agents'

// Re-export types for consumers
export type { QueryResult } from './rag'

/**
 * Initialize Factory Brain system (call once at app startup)
 */
export function initFactoryBrain(): {
  status: 'ready'
  systems: ['rag', 'memory', 'agents']
} {
  // Validate required env vars at startup
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ANTHROPIC_API_KEY']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Factory Brain: Missing env vars: ${missing.join(', ')}`)
  }

  return { status: 'ready', systems: ['rag', 'memory', 'agents'] }
}
