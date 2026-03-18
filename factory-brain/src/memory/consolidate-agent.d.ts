/**
 * ConsolidateAgent — Always-On Memory System
 *
 * Like the human brain during sleep, this agent periodically reviews
 * unconsolidated memories, finds connections between them, and generates
 * cross-cutting insights.
 *
 * Inspired by Google's ConsolidateAgent from the Always-On Memory Agent (ADK).
 * Runs as a cron job (default: every 60 minutes).
 */
import type { StoredConsolidation } from './types';
/**
 * Run a single consolidation cycle.
 * Reads unconsolidated memories, finds patterns, stores insights.
 *
 * @returns null if not enough memories to consolidate
 */
export declare function runConsolidationCycle(minMemories?: number, batchSize?: number): Promise<StoredConsolidation | null>;
/**
 * Start the consolidation cron job.
 * Runs every `intervalMs` milliseconds (default: 60 minutes).
 *
 * @returns A function to stop the cron job
 */
export declare function startConsolidationCron(intervalMs?: number, // 1 hour default
minMemories?: number): () => void;
/**
 * Get consolidation history.
 */
export declare function getConsolidationHistory(limit?: number): Promise<{
    id: any;
    summary: any;
    insight: any;
    source_ids: any;
    created_at: any;
}[]>;
//# sourceMappingURL=consolidate-agent.d.ts.map