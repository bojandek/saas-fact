/**
 * Factory Brain - AI-powered SaaS development system
 * Combines knowledge, memory, and agents for rapid SaaS creation
 */

export { RAGSystem } from './rag'
export { MemorySystem } from './memory'
export { ArchitectAgent, CodeReviewAgent, DesignAgent } from './agents'

// Initialize all systems
const architectAgent = new (require('./agents').ArchitectAgent)()
const codeReviewAgent = new (require('./agents').CodeReviewAgent)()
const designAgent = new (require('./agents').DesignAgent)()

console.log('🧠 Factory Brain initialized')
console.log('  ✓ RAG system ready')
console.log('  ✓ Memory system ready')
console.log('  ✓ Agents initialized')
