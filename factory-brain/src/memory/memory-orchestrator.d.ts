/**
 * MemoryOrchestrator — Always-On Memory System
 *
 * The main entry point for the Always-On Memory System.
 * Routes requests to IngestAgent, ConsolidateAgent, or QueryAgent.
 * Manages the consolidation cron job lifecycle.
 *
 * Inspired by Google's memory_orchestrator from the Always-On Memory Agent (ADK).
 */
import type { IngestResult, QueryResult } from './types';
export declare class MemoryOrchestrator {
    private readonly config;
    private consolidationCronStop;
    private directoryWatcherTimer;
    private isRunning;
    constructor(config?: {
        /** Directory to watch for new files (optional) */
        inboxDir?: string;
        /** How often to run consolidation in ms (default: 60 min) */
        consolidationIntervalMs?: number;
        /** How often to poll inbox directory in ms (default: 30s) */
        watchIntervalMs?: number;
        /** Minimum memories before consolidation runs */
        minMemoriesForConsolidation?: number;
        /** Default project ID for ingested files */
        defaultProjectId?: string;
    });
    /**
     * Start the Always-On Memory system.
     * Begins watching inbox directory and running consolidation cron.
     */
    start(): void;
    /**
     * Stop the Always-On Memory system.
     */
    stop(): void;
    /**
     * Ingest raw text into memory.
     */
    ingest(text: string, source?: string, projectId?: string): Promise<IngestResult>;
    /**
     * Ingest a file (text, image, PDF, audio, video).
     */
    ingestFile(filePath: string, projectId?: string): Promise<IngestResult>;
    /**
     * Ingest output from a SaaS Factory agent.
     * Called automatically after War Room orchestration.
     */
    ingestAgentOutput(agentName: string, output: string, projectId?: string): Promise<IngestResult>;
    /**
     * Ingest all files from the factory-brain knowledge directory.
     * Useful for initial seeding of the memory system.
     */
    seedFromKnowledgeBase(knowledgeDir: string): Promise<IngestResult[]>;
    /**
     * Manually trigger a consolidation cycle.
     */
    consolidate(): Promise<import("./types").StoredConsolidation>;
    /**
     * Get consolidation history.
     */
    getConsolidationHistory(limit?: number): Promise<{
        id: any;
        summary: any;
        insight: any;
        source_ids: any;
        created_at: any;
    }[]>;
    /**
     * Ask a question and get an answer from memory.
     */
    query(question: string, options?: {
        matchThreshold?: number;
        maxMemories?: number;
        projectId?: string;
    }): Promise<QueryResult>;
    /**
     * Get memory statistics.
     */
    getStats(): Promise<import("./types").MemoryStats>;
    /**
     * Get all memories (paginated).
     */
    getMemories(page?: number, pageSize?: number, projectId?: string): Promise<{
        memories: {
            id: any;
            source: any;
            source_type: any;
            summary: any;
            entities: any;
            topics: any;
            importance: any;
            consolidated: any;
            project_id: any;
            created_at: any;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    /**
     * Status check — returns running state and memory stats.
     */
    status(): Promise<{
        running: boolean;
        config: {
            /** Directory to watch for new files (optional) */
            inboxDir?: string;
            /** How often to run consolidation in ms (default: 60 min) */
            consolidationIntervalMs?: number;
            /** How often to poll inbox directory in ms (default: 30s) */
            watchIntervalMs?: number;
            /** Minimum memories before consolidation runs */
            minMemoriesForConsolidation?: number;
            /** Default project ID for ingested files */
            defaultProjectId?: string;
        };
        stats: import("./types").MemoryStats;
    }>;
}
/**
 * Get or create the global MemoryOrchestrator singleton.
 */
export declare function getMemoryOrchestrator(config?: ConstructorParameters<typeof MemoryOrchestrator>[0]): MemoryOrchestrator;
export { ingestText, ingestFile, ingestAgentOutput } from './ingest-agent';
export { runConsolidationCycle, getConsolidationHistory } from './consolidate-agent';
export { queryMemory, getMemoryStats, getAllMemories } from './query-agent';
//# sourceMappingURL=memory-orchestrator.d.ts.map