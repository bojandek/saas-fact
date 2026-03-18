/**
 * Memory Session Manager - Integration Point for Using Always-On Memory
 * This is what you import and use in your apps to access the brain
 */
import { AlwaysOnMemoryEngine, Pattern } from './always-on-memory';
/**
 * Initialize memory for a session
 * Call this ONCE when app starts or user logs in
 *
 * @example
 * // In Next.js app layout or server startup
 * async function setupApp() {
 *   await initializeMemory(userId)
 * }
 */
export declare function initializeMemory(sessionId: string): Promise<AlwaysOnMemoryEngine>;
/**
 * Get current memory instance
 * Use this in your code to ask the brain for decisions
 *
 * @example
 * const memory = getMemory()
 * const decision = await memory.reason('How to build this feature?')
 */
export declare function getMemory(): AlwaysOnMemoryEngine;
/**
 * Ask the brain for reasoning
 * Use this whenever you need the brain to think about something
 *
 * @example
 * const decision = await askBrain(
 *   'Should we use microservices or monolith?',
 *   { scale: '1M users', budget: 'moderate', team_size: 5 }
 * )
 * logger.info(decision.recommendation)
 * logger.info(decision.confidence)
 */
export declare function askBrain(question: string, context?: Record<string, any>): Promise<{
    recommendation: string;
    confidence: number;
    reasoning: string;
    sources: string[];
}>;
/**
 * Tell the brain if a recommendation was good or bad
 * This is crucial - the more feedback, the smarter the brain becomes
 *
 * @example
 * // After you've implemented the recommendation
 * await feedbackToBrain(
 *   decisionId,
 *   'Used RLS with Supabase',
 *   'positive',
 *   'Worked great, very fast implementation'
 * )
 */
export declare function feedbackToBrain(decisionId: string, action: string, feedback: 'positive' | 'negative' | 'neutral', notes?: string): Promise<void>;
/**
 * Teach the brain a new pattern
 * When you discover a successful pattern, teach it so it can reuse
 *
 * @example
 * await teachBrain(
 *   'optimized-multi-tenant-rls',
 *   'Use RLS with shared database for multi-tenancy',
 *   ['multi-tenant', 'rls', 'postgres', 'supabase'],
 *   'Always start with shared DB + RLS for cost efficiency'
 * )
 */
export declare function teachBrain(patternName: string, description: string, triggers: string[], recommendation: string): Promise<void>;
/**
 * Update how effective a pattern is
 * Call this after you use a pattern to reinforce or discourage it
 *
 * @example
 * await updatePatternEffectiveness('multi-tenant-rls', true)  // worked!
 */
export declare function updatePatternEffectiveness(patternName: string, successful: boolean): Promise<void>;
/**
 * Get brain insights and status
 * Shows how much the brain has learned
 *
 * @example
 * const insights = await getBrainStatus()
 * logger.info(`Brain is ${insights.learning_progress}% trained`)
 */
export declare function getBrainStatus(): Promise<{
    total_interactions: number;
    average_confidence: number;
    learning_progress: number;
    top_patterns: Pattern[];
    effective_rules: any[];
}>;
/**
 * Update brain context with user info
 * Helps the brain understand preferences and situation
 *
 * @example
 * await updateBrainContext('user_role', 'architect')
 * await updateBrainContext('team_size', 5)
 * await updateBrainContext('budget', 'moderate')
 */
export declare function updateBrainContext(key: string, value: any): void;
/**
 * Cleanup memory on app shutdown
 * Call this when user logs out or app closes
 *
 * @example
 * process.on('exit', async () => {
 *   await cleanupMemory()
 * })
 */
export declare function cleanupMemory(): Promise<void>;
export type BrainDecision = Awaited<ReturnType<typeof askBrain>>;
export type BrainInsights = Awaited<ReturnType<typeof getBrainStatus>>;
//# sourceMappingURL=memory-session.d.ts.map