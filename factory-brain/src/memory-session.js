"use strict";
/**
 * Memory Session Manager - Integration Point for Using Always-On Memory
 * This is what you import and use in your apps to access the brain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMemory = initializeMemory;
exports.getMemory = getMemory;
exports.askBrain = askBrain;
exports.feedbackToBrain = feedbackToBrain;
exports.teachBrain = teachBrain;
exports.updatePatternEffectiveness = updatePatternEffectiveness;
exports.getBrainStatus = getBrainStatus;
exports.updateBrainContext = updateBrainContext;
exports.cleanupMemory = cleanupMemory;
const always_on_memory_1 = require("./always-on-memory");
const logger_1 = require("./utils/logger");
/**
 * Global memory instance (per user session)
 * Initialize once at app startup, then use everywhere
 */
let globalMemory = null;
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
async function initializeMemory(sessionId) {
    if (globalMemory) {
        logger_1.logger.info('Memory already initialized for session:', sessionId);
        return globalMemory;
    }
    logger_1.logger.info('🧠 Initializing Always-On Memory for session:', sessionId);
    globalMemory = new always_on_memory_1.AlwaysOnMemoryEngine(sessionId);
    await globalMemory.initialize();
    // Log memory restoration
    const insights = await globalMemory.getInsights();
    logger_1.logger.info('📊 Memory restored with:', {
        previous_interactions: insights.total_interactions,
        average_confidence: insights.average_confidence,
        learning_progress: `${Math.round(insights.learning_progress)}%`,
        known_patterns: insights.top_patterns.length,
    });
    return globalMemory;
}
/**
 * Get current memory instance
 * Use this in your code to ask the brain for decisions
 *
 * @example
 * const memory = getMemory()
 * const decision = await memory.reason('How to build this feature?')
 */
function getMemory() {
    if (!globalMemory) {
        throw new Error('Memory not initialized. Call initializeMemory(sessionId) first at app startup.');
    }
    return globalMemory;
}
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
async function askBrain(question, context = {}) {
    const memory = getMemory();
    // Ask the brain
    const step = await memory.reason(question, context);
    // Return user-friendly result
    return {
        recommendation: step.output.recommendation,
        confidence: step.confidence,
        reasoning: step.reasoning,
        sources: step.sources,
    };
}
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
async function feedbackToBrain(decisionId, action, feedback, notes) {
    const memory = getMemory();
    await memory.recordDecision(decisionId, action, feedback, notes);
    logger_1.logger.info(`📝 Brain learned: ${action} was ${feedback}`);
}
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
async function teachBrain(patternName, description, triggers, recommendation) {
    const memory = getMemory();
    await memory.learnPattern(patternName, description, triggers, recommendation);
    logger_1.logger.info(`🎓 Brain learned new pattern: ${patternName}`);
}
/**
 * Update how effective a pattern is
 * Call this after you use a pattern to reinforce or discourage it
 *
 * @example
 * await updatePatternEffectiveness('multi-tenant-rls', true)  // worked!
 */
async function updatePatternEffectiveness(patternName, successful) {
    const memory = getMemory();
    await memory.updatePatternEffectiveness(patternName, successful);
}
/**
 * Get brain insights and status
 * Shows how much the brain has learned
 *
 * @example
 * const insights = await getBrainStatus()
 * logger.info(`Brain is ${insights.learning_progress}% trained`)
 */
async function getBrainStatus() {
    const memory = getMemory();
    return await memory.getInsights();
}
/**
 * Update brain context with user info
 * Helps the brain understand preferences and situation
 *
 * @example
 * await updateBrainContext('user_role', 'architect')
 * await updateBrainContext('team_size', 5)
 * await updateBrainContext('budget', 'moderate')
 */
function updateBrainContext(key, value) {
    const memory = getMemory();
    memory.updateContext(key, value);
    logger_1.logger.info(`🧠 Context updated: ${key} = ${value}`);
}
/**
 * Cleanup memory on app shutdown
 * Call this when user logs out or app closes
 *
 * @example
 * process.on('exit', async () => {
 *   await cleanupMemory()
 * })
 */
async function cleanupMemory() {
    if (globalMemory) {
        await globalMemory.cleanup();
        globalMemory = null;
        logger_1.logger.info('🧠 Memory engine cleaned up');
    }
}
//# sourceMappingURL=memory-session.js.map