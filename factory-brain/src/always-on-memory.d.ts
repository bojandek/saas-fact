/**
 * Always-On Memory Engine for Factory Brain
 * Persistent reasoning system that continuously learns and improves
 * Acts as the "brain" - maintains context, makes decisions, learns from interactions
 */
interface MemoryState {
    id: string;
    session_id: string;
    context: Record<string, any>;
    reasoning_chain: ReasoningStep[];
    active_projects: string[];
    learned_patterns: Pattern[];
    decision_rules: DecisionRule[];
    feedback_history: Feedback[];
    created_at: string;
    updated_at: string;
    last_activity: string;
}
interface ReasoningStep {
    timestamp: string;
    input: string;
    reasoning: string;
    output: any;
    confidence: number;
    sources: string[];
}
interface Pattern {
    name: string;
    description: string;
    frequency: number;
    effectiveness: number;
    context_triggers: string[];
    recommendations: string[];
    last_used: string;
}
interface DecisionRule {
    id: string;
    condition: string;
    action: string;
    priority: number;
    conditions_met: number;
    success_rate: number;
}
interface Feedback {
    timestamp: string;
    decision_id: string;
    feedback: 'positive' | 'negative' | 'neutral';
    improvement_suggestions: string;
}
interface ContextWindow {
    current_project?: string;
    user_preferences: Record<string, any>;
    active_problems: string[];
    available_patterns: Pattern[];
    recent_decisions: any[];
    time_context: string;
}
/**
 * Always-On Memory Engine
 * Maintains continuous reasoning state and learns from interactions
 */
export declare class AlwaysOnMemoryEngine {
    private sessionId;
    private supabase;
    private memoryState;
    private reasoningChain;
    private contextWindow;
    private learningInterval;
    private decisionCache;
    constructor(sessionId: string);
    /**
     * Initialize memory engine and restore previous state
     */
    initialize(): Promise<void>;
    /**
     * Process input through reasoning engine
     */
    reason(input: string, context?: Record<string, any>): Promise<ReasoningStep>;
    /**
     * Match input against learned patterns
     */
    private matchPatterns;
    /**
     * Calculate pattern matching score
     */
    private calculatePatternScore;
    /**
     * Apply decision rules based on context
     */
    private applyDecisionRules;
    /**
     * Evaluate rule condition
     */
    private evaluateCondition;
    /**
     * Generate reasoning explanation
     */
    private generateReasoning;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
    /**
     * Record decision with feedback
     */
    recordDecision(decisionId: string, action: string, feedback: 'positive' | 'negative' | 'neutral', notes?: string): Promise<void>;
    /**
     * Update decision rules based on feedback
     */
    private updateRulesBasedOnFeedback;
    /**
     * Learn new pattern from interaction
     */
    learnPattern(name: string, description: string, triggers: string[], recommendation: string): Promise<void>;
    /**
     * Update pattern effectiveness based on usage
     */
    updatePatternEffectiveness(patternName: string, successful: boolean): Promise<void>;
    /**
     * Get current context window
     */
    getContextWindow(): ContextWindow;
    /**
     * Update context with new information
     */
    updateContext(key: string, value: any): void;
    /**
     * Start continuous learning cycle
     */
    private startLearningCycle;
    /**
     * Analyze learning progress and optimize rules
     */
    private analyzeLearning;
    /**
     * Save memory state to database
     */
    private saveMemoryState;
    /**
     * Get memory insights
     */
    getInsights(): Promise<{
        total_interactions: number;
        average_confidence: number;
        top_patterns: Pattern[];
        effective_rules: DecisionRule[];
        learning_progress: number;
    }>;
    /**
     * Cleanup - stop learning cycle
     */
    cleanup(): Promise<void>;
}
export type { MemoryState, ReasoningStep, Pattern, DecisionRule, Feedback, ContextWindow, };
//# sourceMappingURL=always-on-memory.d.ts.map