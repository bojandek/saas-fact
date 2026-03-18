/**
 * IngestAgent — Always-On Memory System
 *
 * Processes raw text, images, audio, video, and PDFs into structured memories.
 * Inspired by Google's IngestAgent from the Always-On Memory Agent (ADK).
 *
 * Key differences from Google's implementation:
 * - TypeScript instead of Python
 * - OpenAI GPT-4o for multimodal understanding (instead of Gemini)
 * - Supabase + pgvector for storage (instead of SQLite)
 * - OpenAI text-embedding-3-small for embeddings
 */
import type { IngestResult } from './types';
/**
 * Ingest raw text into the memory system.
 */
export declare function ingestText(text: string, source?: string, projectId?: string): Promise<IngestResult>;
/**
 * Ingest a file (text, image, PDF, audio, video) into the memory system.
 * Automatically detects file type and uses appropriate processing.
 */
export declare function ingestFile(filePath: string, projectId?: string): Promise<IngestResult>;
/**
 * Ingest a SaaS project result as a memory.
 * Called automatically after each successful War Room orchestration.
 */
export declare function ingestAgentOutput(agentName: string, output: string, projectId?: string): Promise<IngestResult>;
/**
 * Watch a directory for new files and ingest them automatically.
 * Polls every `intervalMs` milliseconds (default: 30 seconds).
 */
export declare function watchDirectory(dirPath: string, projectId?: string, intervalMs?: number): NodeJS.Timer;
//# sourceMappingURL=ingest-agent.d.ts.map