"use strict";
/**
 * MemoryOrchestrator — Always-On Memory System
 *
 * The main entry point for the Always-On Memory System.
 * Routes requests to IngestAgent, ConsolidateAgent, or QueryAgent.
 * Manages the consolidation cron job lifecycle.
 *
 * Inspired by Google's memory_orchestrator from the Always-On Memory Agent (ADK).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMemories = exports.getMemoryStats = exports.queryMemory = exports.getConsolidationHistory = exports.runConsolidationCycle = exports.ingestAgentOutput = exports.ingestFile = exports.ingestText = exports.MemoryOrchestrator = void 0;
exports.getMemoryOrchestrator = getMemoryOrchestrator;
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const ingest_agent_1 = require("./ingest-agent");
const consolidate_agent_1 = require("./consolidate-agent");
const query_agent_1 = require("./query-agent");
const log = logger_1.logger.child({ component: 'MemoryOrchestrator' });
// ── MemoryOrchestrator Class ──────────────────────────────────────────────────
class MemoryOrchestrator {
    constructor(config = {}) {
        this.config = config;
        this.consolidationCronStop = null;
        this.directoryWatcherTimer = null;
        this.isRunning = false;
    }
    /**
     * Start the Always-On Memory system.
     * Begins watching inbox directory and running consolidation cron.
     */
    start() {
        if (this.isRunning) {
            log.warn('MemoryOrchestrator already running');
            return;
        }
        log.info(this.config, 'Starting MemoryOrchestrator');
        this.isRunning = true;
        // Start consolidation cron
        this.consolidationCronStop = (0, consolidate_agent_1.startConsolidationCron)(this.config.consolidationIntervalMs ?? 60 * 60 * 1000, this.config.minMemoriesForConsolidation ?? 2);
        // Start directory watcher if inbox dir configured
        if (this.config.inboxDir) {
            this.directoryWatcherTimer = (0, ingest_agent_1.watchDirectory)(this.config.inboxDir, this.config.defaultProjectId, this.config.watchIntervalMs ?? 30000);
            log.info({ inboxDir: this.config.inboxDir }, 'Inbox watcher started');
        }
        log.info('MemoryOrchestrator started successfully');
    }
    /**
     * Stop the Always-On Memory system.
     */
    stop() {
        if (!this.isRunning)
            return;
        this.consolidationCronStop?.();
        if (this.directoryWatcherTimer) {
            clearInterval(this.directoryWatcherTimer);
            this.directoryWatcherTimer = null;
        }
        this.isRunning = false;
        log.info('MemoryOrchestrator stopped');
    }
    // ── Ingest ──────────────────────────────────────────────────────────────────
    /**
     * Ingest raw text into memory.
     */
    async ingest(text, source, projectId) {
        log.info({ source, length: text.length }, 'Ingesting text via orchestrator');
        return (0, ingest_agent_1.ingestText)(text, source ?? 'manual', projectId ?? this.config.defaultProjectId);
    }
    /**
     * Ingest a file (text, image, PDF, audio, video).
     */
    async ingestFile(filePath, projectId) {
        log.info({ filePath }, 'Ingesting file via orchestrator');
        return (0, ingest_agent_1.ingestFile)(filePath, projectId ?? this.config.defaultProjectId);
    }
    /**
     * Ingest output from a SaaS Factory agent.
     * Called automatically after War Room orchestration.
     */
    async ingestAgentOutput(agentName, output, projectId) {
        return (0, ingest_agent_1.ingestAgentOutput)(agentName, output, projectId ?? this.config.defaultProjectId);
    }
    /**
     * Ingest all files from the factory-brain knowledge directory.
     * Useful for initial seeding of the memory system.
     */
    async seedFromKnowledgeBase(knowledgeDir) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const results = [];
        if (!fs.existsSync(knowledgeDir)) {
            log.warn({ knowledgeDir }, 'Knowledge directory not found');
            return results;
        }
        const files = fs.readdirSync(knowledgeDir);
        log.info({ count: files.length, knowledgeDir }, 'Seeding from knowledge base');
        for (const file of files) {
            const filePath = path_1.default.join(knowledgeDir, file);
            try {
                const result = await (0, ingest_agent_1.ingestFile)(filePath, 'knowledge-base');
                if (!result.already_processed) {
                    results.push(result);
                    log.info({ file, memory_id: result.memory_id }, 'Seeded from knowledge base');
                }
            }
            catch (err) {
                log.error({ file, err }, 'Failed to seed file from knowledge base');
            }
        }
        log.info({ seeded: results.length }, 'Knowledge base seeding complete');
        return results;
    }
    // ── Consolidate ─────────────────────────────────────────────────────────────
    /**
     * Manually trigger a consolidation cycle.
     */
    async consolidate() {
        log.info('Manual consolidation triggered');
        return (0, consolidate_agent_1.runConsolidationCycle)(this.config.minMemoriesForConsolidation ?? 2);
    }
    /**
     * Get consolidation history.
     */
    async getConsolidationHistory(limit = 10) {
        return (0, consolidate_agent_1.getConsolidationHistory)(limit);
    }
    // ── Query ───────────────────────────────────────────────────────────────────
    /**
     * Ask a question and get an answer from memory.
     */
    async query(question, options = {}) {
        return (0, query_agent_1.queryMemory)(question, {
            ...options,
            projectId: options.projectId ?? this.config.defaultProjectId,
        });
    }
    /**
     * Get memory statistics.
     */
    async getStats() {
        return (0, query_agent_1.getMemoryStats)();
    }
    /**
     * Get all memories (paginated).
     */
    async getMemories(page = 1, pageSize = 20, projectId) {
        return (0, query_agent_1.getAllMemories)(page, pageSize, projectId);
    }
    /**
     * Status check — returns running state and memory stats.
     */
    async status() {
        const stats = await (0, query_agent_1.getMemoryStats)();
        return {
            running: this.isRunning,
            config: this.config,
            stats,
        };
    }
}
exports.MemoryOrchestrator = MemoryOrchestrator;
// ── Singleton ─────────────────────────────────────────────────────────────────
let orchestratorInstance = null;
/**
 * Get or create the global MemoryOrchestrator singleton.
 */
function getMemoryOrchestrator(config) {
    if (!orchestratorInstance) {
        orchestratorInstance = new MemoryOrchestrator(config ?? {
            consolidationIntervalMs: 60 * 60 * 1000, // 1 hour
            watchIntervalMs: 30000, // 30 seconds
            minMemoriesForConsolidation: 2,
        });
    }
    return orchestratorInstance;
}
// ── Convenience exports ───────────────────────────────────────────────────────
var ingest_agent_2 = require("./ingest-agent");
Object.defineProperty(exports, "ingestText", { enumerable: true, get: function () { return ingest_agent_2.ingestText; } });
Object.defineProperty(exports, "ingestFile", { enumerable: true, get: function () { return ingest_agent_2.ingestFile; } });
Object.defineProperty(exports, "ingestAgentOutput", { enumerable: true, get: function () { return ingest_agent_2.ingestAgentOutput; } });
var consolidate_agent_2 = require("./consolidate-agent");
Object.defineProperty(exports, "runConsolidationCycle", { enumerable: true, get: function () { return consolidate_agent_2.runConsolidationCycle; } });
Object.defineProperty(exports, "getConsolidationHistory", { enumerable: true, get: function () { return consolidate_agent_2.getConsolidationHistory; } });
var query_agent_2 = require("./query-agent");
Object.defineProperty(exports, "queryMemory", { enumerable: true, get: function () { return query_agent_2.queryMemory; } });
Object.defineProperty(exports, "getMemoryStats", { enumerable: true, get: function () { return query_agent_2.getMemoryStats; } });
Object.defineProperty(exports, "getAllMemories", { enumerable: true, get: function () { return query_agent_2.getAllMemories; } });
//# sourceMappingURL=memory-orchestrator.js.map