/**
 * Shared types for the Always-On Memory System.
 *
 * Architecture inspired by Google's Always-On Memory Agent (ADK):
 * https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
 *
 * Adapted for TypeScript with Supabase + OpenAI instead of SQLite + Gemini.
 */
export type SourceType = 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'agent' | 'url';
export declare const SUPPORTED_TEXT_EXTENSIONS: Set<string>;
export declare const SUPPORTED_MEDIA_EXTENSIONS: Record<string, string>;
export declare const ALL_SUPPORTED_EXTENSIONS: Set<string>;
export interface MemoryConnection {
    linked_to: number;
    relationship: string;
}
export interface Memory {
    id: number;
    source: string;
    source_type: SourceType;
    raw_text: string;
    summary: string;
    entities: string[];
    topics: string[];
    importance: number;
    connections: MemoryConnection[];
    embedding?: number[];
    consolidated: boolean;
    project_id?: string;
    created_at: string;
    updated_at: string;
}
export interface MemoryInput {
    raw_text: string;
    summary: string;
    entities: string[];
    topics: string[];
    importance: number;
    source?: string;
    source_type?: SourceType;
    project_id?: string;
}
export interface StoredMemory {
    memory_id: number;
    status: 'stored';
    summary: string;
}
export interface ConsolidationConnection {
    from_id: number;
    to_id: number;
    relationship: string;
}
export interface Consolidation {
    id: number;
    source_ids: number[];
    summary: string;
    insight: string;
    connections: ConsolidationConnection[];
    created_at: string;
}
export interface ConsolidationInput {
    source_ids: number[];
    summary: string;
    insight: string;
    connections: ConsolidationConnection[];
}
export interface StoredConsolidation {
    status: 'consolidated';
    memories_processed: number;
    insight: string;
}
export interface MemoryStats {
    total_memories: number;
    unconsolidated: number;
    consolidations: number;
    by_source_type: Record<SourceType, number>;
    by_project: Record<string, number>;
}
export interface MemorySearchResult extends Omit<Memory, 'embedding'> {
    similarity: number;
}
export interface ConsolidationSearchResult extends Omit<Consolidation, 'connections'> {
    similarity: number;
}
export interface QueryResult {
    answer: string;
    memories_used: MemorySearchResult[];
    consolidations_used: ConsolidationSearchResult[];
    confidence: number;
    sources: string[];
}
export interface ProcessedFile {
    path: string;
    file_hash: string;
    memory_id?: number;
    processed_at: string;
}
export interface IngestResult {
    memory_id: number;
    source: string;
    summary: string;
    entities: string[];
    topics: string[];
    importance: number;
    already_processed?: boolean;
}
//# sourceMappingURL=types.d.ts.map