/**
 * Cost Tracker - AI API Usage & Cost Monitoring
 *
 * Tracks token usage and calculates costs for all AI API calls.
 * Primary provider: Anthropic Claude
 * Embeddings: Voyage AI
 * Audio transcription: OpenAI Whisper (fallback)
 *
 * Pricing (as of 2025):
 *   - claude-haiku-4-5:    $0.80 / 1M input,  $4.00 / 1M output
 *   - claude-sonnet-4-5:   $3.00 / 1M input,  $15.00 / 1M output
 *   - claude-opus-4-5:     $15.00 / 1M input, $75.00 / 1M output
 *   - voyage-3:            $0.06 / 1M tokens
 *   - whisper-1:           $0.006 / minute (approximated as input tokens)
 */
export interface ModelPricing {
    inputPer1M: number;
    outputPer1M: number;
}
export declare const MODEL_PRICING: Record<string, ModelPricing>;
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    promptTokens?: number;
    completionTokens?: number;
}
export interface CostRecord {
    id: string;
    timestamp: Date;
    projectId?: string;
    tenantId?: string;
    agentName: string;
    model: string;
    usage: TokenUsage;
    costUSD: number;
}
export interface CostSummary {
    totalCostUSD: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    recordCount: number;
    byAgent: Record<string, {
        costUSD: number;
        tokens: number;
    }>;
    byModel: Record<string, {
        costUSD: number;
        tokens: number;
    }>;
}
/**
 * Calculate cost for a given model and token usage
 */
export declare function calculateCost(model: string, usage: TokenUsage): number;
/**
 * CostTracker - Singleton service for tracking AI API costs
 */
export declare class CostTracker {
    private static instance;
    private records;
    private constructor();
    static getInstance(): CostTracker;
    /**
     * Record a completed AI API call
     */
    record(params: {
        agentName: string;
        model: string;
        usage: TokenUsage;
        projectId?: string;
        tenantId?: string;
    }): CostRecord;
    /**
     * Get cost summary for a specific project
     */
    getSummary(filter?: {
        projectId?: string;
        tenantId?: string;
    }): CostSummary;
    /**
     * Get all records (optionally filtered)
     */
    getRecords(filter?: {
        projectId?: string;
        tenantId?: string;
    }): CostRecord[];
    /**
     * Clear all records (useful for testing)
     */
    clear(): void;
    /**
     * Format cost as human-readable string
     */
    static formatCost(costUSD: number): string;
}
/**
 * Convenience wrapper: extract token usage from Anthropic Claude response
 * (primary usage extractor)
 */
export declare function extractAnthropicUsage(response: {
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
}): TokenUsage;
/**
 * Convenience wrapper: extract token usage from OpenAI response
 * (kept for Whisper compatibility)
 */
export declare function extractOpenAIUsage(response: {
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}): TokenUsage;
export declare const costTracker: CostTracker;
//# sourceMappingURL=cost-tracker.d.ts.map