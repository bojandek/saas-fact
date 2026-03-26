// @ts-nocheck
/**
 * MemoryOrchestrator — Always-On Memory System
 *
 * The main entry point for the Always-On Memory System.
 * Routes requests to IngestAgent, ConsolidateAgent, or QueryAgent.
 * Manages the consolidation cron job lifecycle.
 *
 * Inspired by Google's memory_orchestrator from the Always-On Memory Agent (ADK).
 */

import path from 'path'
import { logger } from '../utils/logger'
import { ingestAgentOutput, ingestFile, ingestText, watchDirectory } from './ingest-agent'
import { getConsolidationHistory, runConsolidationCycle, startConsolidationCron } from './consolidate-agent'
import { getAllMemories, getMemoryStats, queryMemory } from './query-agent'
import type { IngestResult, QueryResult } from './types'

const log = logger.child({ component: 'MemoryOrchestrator' })

// ── MemoryOrchestrator Class ──────────────────────────────────────────────────

export class MemoryOrchestrator {
  private consolidationCronStop: (() => void) | null = null
  private directoryWatcherTimer: NodeJS.Timer | null = null
  private isRunning = false

  constructor(
    private readonly config: {
      /** Directory to watch for new files (optional) */
      inboxDir?: string
      /** How often to run consolidation in ms (default: 60 min) */
      consolidationIntervalMs?: number
      /** How often to poll inbox directory in ms (default: 30s) */
      watchIntervalMs?: number
      /** Minimum memories before consolidation runs */
      minMemoriesForConsolidation?: number
      /** Default project ID for ingested files */
      defaultProjectId?: string
    } = {}
  ) {}

  /**
   * Start the Always-On Memory system.
   * Begins watching inbox directory and running consolidation cron.
   */
  start(): void {
    if (this.isRunning) {
      log.warn('MemoryOrchestrator already running')
      return
    }

    log.info(this.config, 'Starting MemoryOrchestrator')
    this.isRunning = true

    // Start consolidation cron
    this.consolidationCronStop = startConsolidationCron(
      this.config.consolidationIntervalMs ?? 60 * 60 * 1000,
      this.config.minMemoriesForConsolidation ?? 2
    )

    // Start directory watcher if inbox dir configured
    if (this.config.inboxDir) {
      this.directoryWatcherTimer = watchDirectory(
        this.config.inboxDir,
        this.config.defaultProjectId,
        this.config.watchIntervalMs ?? 30_000
      )
      log.info({ inboxDir: this.config.inboxDir }, 'Inbox watcher started')
    }

    log.info('MemoryOrchestrator started successfully')
  }

  /**
   * Stop the Always-On Memory system.
   */
  stop(): void {
    if (!this.isRunning) return

    this.consolidationCronStop?.()
    if (this.directoryWatcherTimer) {
      clearInterval(this.directoryWatcherTimer)
      this.directoryWatcherTimer = null
    }

    this.isRunning = false
    log.info('MemoryOrchestrator stopped')
  }

  // ── Ingest ──────────────────────────────────────────────────────────────────

  /**
   * Ingest raw text into memory.
   */
  async ingest(text: string, source?: string, projectId?: string): Promise<IngestResult> {
    log.info({ source, length: text.length }, 'Ingesting text via orchestrator')
    return ingestText(text, source ?? 'manual', projectId ?? this.config.defaultProjectId)
  }

  /**
   * Ingest a file (text, image, PDF, audio, video).
   */
  async ingestFile(filePath: string, projectId?: string): Promise<IngestResult> {
    log.info({ filePath }, 'Ingesting file via orchestrator')
    return ingestFile(filePath, projectId ?? this.config.defaultProjectId)
  }

  /**
   * Ingest output from a SaaS Factory agent.
   * Called automatically after War Room orchestration.
   */
  async ingestAgentOutput(
    agentName: string,
    output: string,
    projectId?: string
  ): Promise<IngestResult> {
    return ingestAgentOutput(agentName, output, projectId ?? this.config.defaultProjectId)
  }

  /**
   * Ingest all files from the factory-brain knowledge directory.
   * Useful for initial seeding of the memory system.
   */
  async seedFromKnowledgeBase(knowledgeDir: string): Promise<IngestResult[]> {
    const fs = await import('fs')
    const results: IngestResult[] = []

    if (!fs.existsSync(knowledgeDir)) {
      log.warn({ knowledgeDir }, 'Knowledge directory not found')
      return results
    }

    const files = fs.readdirSync(knowledgeDir)
    log.info({ count: files.length, knowledgeDir }, 'Seeding from knowledge base')

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file)
      try {
        const result = await ingestFile(filePath, 'knowledge-base')
        if (!result.already_processed) {
          results.push(result)
          log.info({ file, memory_id: result.memory_id }, 'Seeded from knowledge base')
        }
      } catch (err) {
        log.error({ file, err }, 'Failed to seed file from knowledge base')
      }
    }

    log.info({ seeded: results.length }, 'Knowledge base seeding complete')
    return results
  }

  // ── Consolidate ─────────────────────────────────────────────────────────────

  /**
   * Manually trigger a consolidation cycle.
   */
  async consolidate() {
    log.info('Manual consolidation triggered')
    return runConsolidationCycle(
      this.config.minMemoriesForConsolidation ?? 2
    )
  }

  /**
   * Get consolidation history.
   */
  async getConsolidationHistory(limit = 10) {
    return getConsolidationHistory(limit)
  }

  // ── Query ───────────────────────────────────────────────────────────────────

  /**
   * Ask a question and get an answer from memory.
   */
  async query(
    question: string,
    options: { matchThreshold?: number; maxMemories?: number; projectId?: string } = {}
  ): Promise<QueryResult> {
    return queryMemory(question, {
      ...options,
      projectId: options.projectId ?? this.config.defaultProjectId,
    })
  }

  /**
   * Get memory statistics.
   */
  async getStats() {
    return getMemoryStats()
  }

  /**
   * Get all memories (paginated).
   */
  async getMemories(page = 1, pageSize = 20, projectId?: string) {
    return getAllMemories(page, pageSize, projectId)
  }

  /**
   * Status check — returns running state and memory stats.
   */
  async status() {
    const stats = await getMemoryStats()
    return {
      running: this.isRunning,
      config: this.config,
      stats,
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let orchestratorInstance: MemoryOrchestrator | null = null

/**
 * Get or create the global MemoryOrchestrator singleton.
 */
export function getMemoryOrchestrator(config?: ConstructorParameters<typeof MemoryOrchestrator>[0]): MemoryOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MemoryOrchestrator(config ?? {
      consolidationIntervalMs: 60 * 60 * 1000, // 1 hour
      watchIntervalMs: 30_000,                  // 30 seconds
      minMemoriesForConsolidation: 2,
    })
  }
  return orchestratorInstance
}

// ── Convenience exports ───────────────────────────────────────────────────────

export { ingestText, ingestFile, ingestAgentOutput } from './ingest-agent'
export { runConsolidationCycle, getConsolidationHistory } from './consolidate-agent'
export { queryMemory, getMemoryStats, getAllMemories } from './query-agent'
