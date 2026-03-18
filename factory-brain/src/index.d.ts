/**
 * Factory Brain - AI-powered SaaS development system
 * Combines knowledge, memory, and agents for rapid SaaS creation
 */
export { RAGSystem } from './rag';
export { MemorySystem } from './memory';
export { ArchitectAgent, CodeReviewAgent, DesignAgent } from './agents';
export type { QueryResult } from './rag';
/**
 * Initialize Factory Brain system (call once at app startup)
 */
export declare function initFactoryBrain(): {
    status: 'ready';
    systems: ['rag', 'memory', 'agents'];
};
//# sourceMappingURL=index.d.ts.map