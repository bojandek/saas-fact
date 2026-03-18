/**
 * Autonomous Learning Loop
 *
 * Implements a closed feedback loop where the system learns from every
 * generated SaaS project and automatically improves future generations.
 *
 * Architecture:
 *   GeneratedSaaS → OutcomeCollector → PatternExtractor
 *       → KnowledgeUpdater → AgentPromptEnhancer → Better next generation
 *
 * This closes the gap identified in the audit:
 * "ConsolidateAgent exists but is NOT connected to agents —
 *  learned patterns don't affect the next generation."
 */
import { z } from 'zod';
export declare const GenerationOutcomeSchema: z.ZodObject<{
    generation_id: z.ZodString;
    saas_description: z.ZodString;
    timestamp: z.ZodString;
    architect_score: z.ZodOptional<z.ZodNumber>;
    assembler_success: z.ZodBoolean;
    tests_passed: z.ZodOptional<z.ZodNumber>;
    deploy_success: z.ZodOptional<z.ZodBoolean>;
    user_rating: z.ZodOptional<z.ZodNumber>;
    user_feedback: z.ZodOptional<z.ZodString>;
    typescript_errors: z.ZodDefault<z.ZodNumber>;
    missing_blocks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    agent_errors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        agent: z.ZodString;
        error: z.ZodString;
        resolved: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        error?: string;
        agent?: string;
        resolved?: boolean;
    }, {
        error?: string;
        agent?: string;
        resolved?: boolean;
    }>, "many">>;
    blocks_used: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sql_tables_count: z.ZodDefault<z.ZodNumber>;
    components_generated: z.ZodDefault<z.ZodNumber>;
    generation_time_ms: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timestamp?: string;
    generation_id?: string;
    saas_description?: string;
    architect_score?: number;
    assembler_success?: boolean;
    tests_passed?: number;
    deploy_success?: boolean;
    user_rating?: number;
    user_feedback?: string;
    typescript_errors?: number;
    missing_blocks?: string[];
    agent_errors?: {
        error?: string;
        agent?: string;
        resolved?: boolean;
    }[];
    blocks_used?: string[];
    sql_tables_count?: number;
    components_generated?: number;
    generation_time_ms?: number;
}, {
    timestamp?: string;
    generation_id?: string;
    saas_description?: string;
    architect_score?: number;
    assembler_success?: boolean;
    tests_passed?: number;
    deploy_success?: boolean;
    user_rating?: number;
    user_feedback?: string;
    typescript_errors?: number;
    missing_blocks?: string[];
    agent_errors?: {
        error?: string;
        agent?: string;
        resolved?: boolean;
    }[];
    blocks_used?: string[];
    sql_tables_count?: number;
    components_generated?: number;
    generation_time_ms?: number;
}>;
export type GenerationOutcome = z.infer<typeof GenerationOutcomeSchema>;
export declare const LearnedPatternSchema: z.ZodObject<{
    id: z.ZodString;
    pattern_type: z.ZodEnum<["block_combination", "sql_pattern", "error_prevention", "performance_tip", "ux_pattern", "agent_improvement"]>;
    description: z.ZodString;
    saas_categories: z.ZodArray<z.ZodString, "many">;
    confidence: z.ZodNumber;
    occurrence_count: z.ZodDefault<z.ZodNumber>;
    last_seen: z.ZodString;
    applied_to_agents: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    example_generation_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    id?: string;
    pattern_type?: "block_combination" | "sql_pattern" | "error_prevention" | "performance_tip" | "ux_pattern" | "agent_improvement";
    description?: string;
    saas_categories?: string[];
    occurrence_count?: number;
    last_seen?: string;
    applied_to_agents?: string[];
    example_generation_ids?: string[];
}, {
    confidence?: number;
    id?: string;
    pattern_type?: "block_combination" | "sql_pattern" | "error_prevention" | "performance_tip" | "ux_pattern" | "agent_improvement";
    description?: string;
    saas_categories?: string[];
    occurrence_count?: number;
    last_seen?: string;
    applied_to_agents?: string[];
    example_generation_ids?: string[];
}>;
export type LearnedPattern = z.infer<typeof LearnedPatternSchema>;
export declare const AgentKnowledgeUpdateSchema: z.ZodObject<{
    agent_name: z.ZodString;
    update_type: z.ZodEnum<["prompt_enhancement", "rule_addition", "example_addition", "warning_addition"]>;
    content: z.ZodString;
    source_pattern_ids: z.ZodArray<z.ZodString, "many">;
    applied_at: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content?: string;
    confidence?: number;
    agent_name?: string;
    update_type?: "prompt_enhancement" | "rule_addition" | "example_addition" | "warning_addition";
    source_pattern_ids?: string[];
    applied_at?: string;
}, {
    content?: string;
    confidence?: number;
    agent_name?: string;
    update_type?: "prompt_enhancement" | "rule_addition" | "example_addition" | "warning_addition";
    source_pattern_ids?: string[];
    applied_at?: string;
}>;
export type AgentKnowledgeUpdate = z.infer<typeof AgentKnowledgeUpdateSchema>;
export declare class AutonomousLearningLoop {
    private llm;
    private patternsPath;
    private knowledgePath;
    private outcomesPath;
    private patterns;
    private isRunning;
    constructor();
    /**
     * Initialize — load existing patterns from disk.
     */
    initialize(): Promise<void>;
    /**
     * Record the outcome of a generation and trigger learning.
     * Called automatically by WarRoomOrchestrator after each generation.
     */
    recordOutcome(outcome: GenerationOutcome): Promise<void>;
    /**
     * Extract patterns from a single generation outcome using GPT-4o-mini.
     */
    private extractPatterns;
    /**
     * Merge new patterns with existing ones — deduplicate and increase confidence.
     */
    private mergePatterns;
    /**
     * Find a semantically similar existing pattern using simple keyword matching.
     * (In production, this would use vector similarity search.)
     */
    private findSimilarPattern;
    /**
     * Update agent knowledge files with high-confidence patterns.
     * This is the KEY step that closes the loop — agents read these files.
     */
    private updateAgentKnowledge;
    /**
     * Determine which agents should receive a pattern.
     */
    private getTargetAgents;
    /**
     * Determine the type of knowledge update.
     */
    private getUpdateType;
    /**
     * Format a pattern as an instruction for a specific agent.
     */
    private formatPatternForAgent;
    /**
     * Write knowledge updates to agent-readable files.
     */
    private writeKnowledgeUpdates;
    /**
     * Format agent knowledge as Markdown for easy reading by LLM prompts.
     */
    private formatAgentKnowledgeFile;
    /**
     * Get current learning statistics.
     */
    getStats(): {
        total_patterns: number;
        high_confidence_patterns: number;
        pattern_types: Record<string, number>;
        top_patterns: LearnedPattern[];
    };
    /**
     * Get learned rules for a specific agent (to inject into prompts).
     */
    getAgentRules(agentName: string): Promise<string>;
    private savePatterns;
    private appendOutcome;
}
export declare function getLearningLoop(): Promise<AutonomousLearningLoop>;
//# sourceMappingURL=autonomous-learning-loop.d.ts.map