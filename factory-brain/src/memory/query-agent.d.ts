/**
 * QueryAgent — Always-On Memory System
 *
 * Answers questions by searching stored memories and consolidation insights
 * using vector similarity search (pgvector). Always cites sources.
 *
 * Inspired by Google's QueryAgent from the Always-On Memory Agent (ADK).
 */
import type { MemoryStats, QueryResult } from './types';
/**
 * Query the memory system with a natural language question.
 * Returns an answer with citations and confidence score.
 */
export declare function queryMemory(query: string, options?: {
    matchThreshold?: number;
    maxMemories?: number;
    projectId?: string;
}): Promise<QueryResult>;
/**
 * Get memory statistics.
 */
export declare function getMemoryStats(): Promise<MemoryStats>;
/**
 * Get all memories (paginated).
 */
export declare function getAllMemories(page?: number, pageSize?: number, projectId?: string): Promise<{
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
//# sourceMappingURL=query-agent.d.ts.map