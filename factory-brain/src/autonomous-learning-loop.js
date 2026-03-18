"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousLearningLoop = exports.AgentKnowledgeUpdateSchema = exports.LearnedPatternSchema = exports.GenerationOutcomeSchema = void 0;
exports.getLearningLoop = getLearningLoop;
const client_1 = require("./llm/client");
const zod_1 = require("zod");
const logger_1 = require("./utils/logger");
const retry_1 = require("./utils/retry");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const log = logger_1.logger.child({ module: 'AutonomousLearningLoop' });
// ── Schemas ───────────────────────────────────────────────────────────────────
exports.GenerationOutcomeSchema = zod_1.z.object({
    generation_id: zod_1.z.string(),
    saas_description: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    // Quality signals
    architect_score: zod_1.z.number().min(0).max(1).optional(),
    assembler_success: zod_1.z.boolean(),
    tests_passed: zod_1.z.number().min(0).max(1).optional(), // ratio
    deploy_success: zod_1.z.boolean().optional(),
    // User feedback
    user_rating: zod_1.z.number().min(1).max(5).optional(),
    user_feedback: zod_1.z.string().optional(),
    // Technical signals
    typescript_errors: zod_1.z.number().default(0),
    missing_blocks: zod_1.z.array(zod_1.z.string()).default([]),
    agent_errors: zod_1.z.array(zod_1.z.object({
        agent: zod_1.z.string(),
        error: zod_1.z.string(),
        resolved: zod_1.z.boolean(),
    })).default([]),
    // Generated artifacts
    blocks_used: zod_1.z.array(zod_1.z.string()).default([]),
    sql_tables_count: zod_1.z.number().default(0),
    components_generated: zod_1.z.number().default(0),
    generation_time_ms: zod_1.z.number().default(0),
});
exports.LearnedPatternSchema = zod_1.z.object({
    id: zod_1.z.string(),
    pattern_type: zod_1.z.enum([
        'block_combination', // "auth + payments always go together"
        'sql_pattern', // "booking SaaS always needs calendar table"
        'error_prevention', // "avoid X when Y"
        'performance_tip', // "use Z for better performance"
        'ux_pattern', // "users expect A in B context"
        'agent_improvement', // "architect should include X in schema"
    ]),
    description: zod_1.z.string(),
    saas_categories: zod_1.z.array(zod_1.z.string()), // which SaaS types this applies to
    confidence: zod_1.z.number().min(0).max(1),
    occurrence_count: zod_1.z.number().default(1),
    last_seen: zod_1.z.string().datetime(),
    applied_to_agents: zod_1.z.array(zod_1.z.string()).default([]),
    example_generation_ids: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.AgentKnowledgeUpdateSchema = zod_1.z.object({
    agent_name: zod_1.z.string(),
    update_type: zod_1.z.enum(['prompt_enhancement', 'rule_addition', 'example_addition', 'warning_addition']),
    content: zod_1.z.string(),
    source_pattern_ids: zod_1.z.array(zod_1.z.string()),
    applied_at: zod_1.z.string().datetime(),
    confidence: zod_1.z.number().min(0).max(1),
});
// ── Autonomous Learning Loop ──────────────────────────────────────────────────
class AutonomousLearningLoop {
    constructor() {
        this.llm = (0, client_1.getLLMClient)();
        this.patterns = new Map();
        this.isRunning = false;
        this.llm = (0, client_1.getLLMClient)();
        const baseDir = path.join(process.cwd(), 'factory-brain', 'knowledge');
        this.patternsPath = path.join(baseDir, 'learned-patterns.json');
        this.knowledgePath = path.join(baseDir, 'agent-knowledge-updates.json');
        this.outcomesPath = path.join(baseDir, 'generation-outcomes.json');
    }
    /**
     * Initialize — load existing patterns from disk.
     */
    async initialize() {
        try {
            const data = await fs.readFile(this.patternsPath, 'utf-8');
            const patterns = JSON.parse(data);
            for (const p of patterns) {
                this.patterns.set(p.id, p);
            }
            log.info({ patterns_loaded: this.patterns.size }, 'Autonomous learning loop initialized');
        }
        catch {
            log.info('No existing patterns found, starting fresh');
            this.patterns = new Map();
        }
    }
    /**
     * Record the outcome of a generation and trigger learning.
     * Called automatically by WarRoomOrchestrator after each generation.
     */
    async recordOutcome(outcome) {
        log.info({ generation_id: outcome.generation_id, success: outcome.assembler_success }, 'Recording generation outcome');
        // Persist outcome
        await this.appendOutcome(outcome);
        // Extract patterns from this outcome
        const newPatterns = await this.extractPatterns(outcome);
        // Merge with existing patterns
        await this.mergePatterns(newPatterns);
        // Update agent knowledge if we have high-confidence patterns
        const highConfidencePatterns = Array.from(this.patterns.values())
            .filter(p => p.confidence >= 0.8 && p.occurrence_count >= 3);
        if (highConfidencePatterns.length > 0) {
            await this.updateAgentKnowledge(highConfidencePatterns);
        }
        log.info({ total_patterns: this.patterns.size, high_confidence: highConfidencePatterns.length }, 'Learning cycle complete');
    }
    /**
     * Extract patterns from a single generation outcome using GPT-4o-mini.
     */
    async extractPatterns(outcome) {
        const prompt = `Analyze this SaaS generation outcome and extract reusable patterns.

SaaS Description: "${outcome.saas_description}"
Success: ${outcome.assembler_success}
Blocks used: ${outcome.blocks_used.join(', ') || 'none'}
SQL tables: ${outcome.sql_tables_count}
Components generated: ${outcome.components_generated}
TypeScript errors: ${outcome.typescript_errors}
Missing blocks: ${outcome.missing_blocks.join(', ') || 'none'}
Agent errors: ${outcome.agent_errors.map(e => `${e.agent}: ${e.error}`).join('; ') || 'none'}
User rating: ${outcome.user_rating ?? 'not rated'}
User feedback: ${outcome.user_feedback ?? 'none'}

Extract 1-3 patterns from this outcome. Each pattern should be:
- Generalizable (applicable to future generations, not just this one)
- Actionable (tells an agent what to do differently)
- Specific (not vague advice)

Return JSON array of patterns:
[{
  "pattern_type": "block_combination|sql_pattern|error_prevention|performance_tip|ux_pattern|agent_improvement",
  "description": "specific, actionable pattern description",
  "saas_categories": ["booking", "ecommerce", etc - which SaaS types this applies to],
  "confidence": 0.0-1.0
}]

If no meaningful patterns can be extracted, return [].
JSON only, no markdown.`;
        try {
            const parsed = await (0, retry_1.withRetry)(() => this.llm.completeJSON({
                prompt,
                model: client_1.CLAUDE_MODELS.HAIKU,
                maxTokens: 800,
            }), { maxAttempts: 3, baseDelayMs: 500 });
            const rawPatterns = Array.isArray(parsed) ? parsed : (parsed.patterns ?? []);
            return rawPatterns.map(p => ({
                id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                pattern_type: p.pattern_type,
                description: p.description,
                saas_categories: p.saas_categories,
                confidence: p.confidence,
                occurrence_count: 1,
                last_seen: new Date().toISOString(),
                applied_to_agents: [],
                example_generation_ids: [outcome.generation_id],
            }));
        }
        catch (err) {
            log.warn({ err }, 'Pattern extraction failed');
            return [];
        }
    }
    /**
     * Merge new patterns with existing ones — deduplicate and increase confidence.
     */
    async mergePatterns(newPatterns) {
        for (const newPattern of newPatterns) {
            // Find similar existing pattern
            const similar = await this.findSimilarPattern(newPattern);
            if (similar) {
                // Increase confidence and occurrence count
                similar.occurrence_count += 1;
                similar.confidence = Math.min(1, similar.confidence + 0.1);
                similar.last_seen = new Date().toISOString();
                similar.example_generation_ids.push(...newPattern.example_generation_ids);
                // Keep last 10 examples
                if (similar.example_generation_ids.length > 10) {
                    similar.example_generation_ids = similar.example_generation_ids.slice(-10);
                }
                this.patterns.set(similar.id, similar);
                log.debug({ pattern_id: similar.id, occurrences: similar.occurrence_count }, 'Pattern reinforced');
            }
            else {
                // Add new pattern
                this.patterns.set(newPattern.id, newPattern);
                log.debug({ pattern_id: newPattern.id, type: newPattern.pattern_type }, 'New pattern discovered');
            }
        }
        // Persist updated patterns
        await this.savePatterns();
    }
    /**
     * Find a semantically similar existing pattern using simple keyword matching.
     * (In production, this would use vector similarity search.)
     */
    async findSimilarPattern(newPattern) {
        const newWords = new Set(newPattern.description.toLowerCase().split(/\s+/));
        let bestMatch = null;
        let bestScore = 0;
        for (const existing of this.patterns.values()) {
            if (existing.pattern_type !== newPattern.pattern_type)
                continue;
            const existingWords = new Set(existing.description.toLowerCase().split(/\s+/));
            const intersection = [...newWords].filter(w => existingWords.has(w)).length;
            const union = new Set([...newWords, ...existingWords]).size;
            const jaccard = intersection / union;
            if (jaccard > 0.4 && jaccard > bestScore) {
                bestScore = jaccard;
                bestMatch = existing;
            }
        }
        return bestMatch;
    }
    /**
     * Update agent knowledge files with high-confidence patterns.
     * This is the KEY step that closes the loop — agents read these files.
     */
    async updateAgentKnowledge(patterns) {
        const agentUpdates = [];
        for (const pattern of patterns) {
            // Skip if already applied to relevant agents
            const targetAgents = this.getTargetAgents(pattern);
            const unappliedAgents = targetAgents.filter(a => !pattern.applied_to_agents.includes(a));
            if (unappliedAgents.length === 0)
                continue;
            for (const agentName of unappliedAgents) {
                const update = {
                    agent_name: agentName,
                    update_type: this.getUpdateType(pattern),
                    content: this.formatPatternForAgent(pattern, agentName),
                    source_pattern_ids: [pattern.id],
                    applied_at: new Date().toISOString(),
                    confidence: pattern.confidence,
                };
                agentUpdates.push(update);
                pattern.applied_to_agents.push(agentName);
            }
        }
        if (agentUpdates.length === 0)
            return;
        // Write updates to knowledge files that agents read
        await this.writeKnowledgeUpdates(agentUpdates);
        // Update patterns to mark as applied
        await this.savePatterns();
        log.info({ updates: agentUpdates.length }, 'Agent knowledge updated from learned patterns');
    }
    /**
     * Determine which agents should receive a pattern.
     */
    getTargetAgents(pattern) {
        const agentMap = {
            block_combination: ['architect-agent', 'assembler-agent'],
            sql_pattern: ['architect-agent'],
            error_prevention: ['architect-agent', 'assembler-agent', 'qa-agent'],
            performance_tip: ['architect-agent', 'assembler-agent'],
            ux_pattern: ['assembler-agent'],
            agent_improvement: ['architect-agent'],
        };
        return agentMap[pattern.pattern_type] ?? ['architect-agent'];
    }
    /**
     * Determine the type of knowledge update.
     */
    getUpdateType(pattern) {
        const typeMap = {
            block_combination: 'rule_addition',
            sql_pattern: 'example_addition',
            error_prevention: 'warning_addition',
            performance_tip: 'prompt_enhancement',
            ux_pattern: 'prompt_enhancement',
            agent_improvement: 'prompt_enhancement',
        };
        return typeMap[pattern.pattern_type] ?? 'prompt_enhancement';
    }
    /**
     * Format a pattern as an instruction for a specific agent.
     */
    formatPatternForAgent(pattern, agentName) {
        const categoryContext = pattern.saas_categories.length > 0
            ? ` (especially for: ${pattern.saas_categories.join(', ')})`
            : '';
        const prefix = {
            rule_addition: `RULE${categoryContext}: `,
            example_addition: `EXAMPLE${categoryContext}: `,
            warning_addition: `WARNING${categoryContext}: `,
            prompt_enhancement: `INSIGHT${categoryContext}: `,
        };
        const updateType = this.getUpdateType(pattern);
        return `${prefix[updateType]}${pattern.description} [confidence: ${(pattern.confidence * 100).toFixed(0)}%, seen ${pattern.occurrence_count}x]`;
    }
    /**
     * Write knowledge updates to agent-readable files.
     */
    async writeKnowledgeUpdates(updates) {
        // Load existing updates
        let existing = [];
        try {
            const data = await fs.readFile(this.knowledgePath, 'utf-8');
            existing = JSON.parse(data);
        }
        catch {
            existing = [];
        }
        // Append new updates
        existing.push(...updates);
        // Keep last 200 updates
        if (existing.length > 200) {
            existing = existing.slice(-200);
        }
        await fs.writeFile(this.knowledgePath, JSON.stringify(existing, null, 2));
        // Also write per-agent knowledge files for easy reading
        const byAgent = new Map();
        for (const update of existing) {
            const list = byAgent.get(update.agent_name) ?? [];
            list.push(update);
            byAgent.set(update.agent_name, list);
        }
        const knowledgeDir = path.dirname(this.knowledgePath);
        for (const [agentName, agentUpdates] of byAgent) {
            const agentFile = path.join(knowledgeDir, `${agentName}-learned-rules.md`);
            const content = this.formatAgentKnowledgeFile(agentName, agentUpdates);
            await fs.writeFile(agentFile, content);
        }
    }
    /**
     * Format agent knowledge as Markdown for easy reading by LLM prompts.
     */
    formatAgentKnowledgeFile(agentName, updates) {
        const lines = [
            `# Learned Rules for ${agentName}`,
            `*Auto-generated by Autonomous Learning Loop — Last updated: ${new Date().toISOString()}*`,
            `*${updates.length} rules learned from ${new Set(updates.flatMap(u => u.source_pattern_ids)).size} patterns*`,
            '',
            '> These rules were automatically learned from previous SaaS generations.',
            '> Apply them to improve the quality of future generations.',
            '',
        ];
        // Group by update type
        const byType = new Map();
        for (const update of updates) {
            const list = byType.get(update.update_type) ?? [];
            list.push(update);
            byType.set(update.update_type, list);
        }
        const typeLabels = {
            rule_addition: '## Rules',
            warning_addition: '## Warnings',
            example_addition: '## Examples',
            prompt_enhancement: '## Insights',
        };
        for (const [type, typeUpdates] of byType) {
            lines.push(typeLabels[type] ?? `## ${type}`);
            lines.push('');
            // Show most recent and highest confidence first
            const sorted = [...typeUpdates].sort((a, b) => b.confidence - a.confidence).slice(0, 20);
            for (const update of sorted) {
                lines.push(`- ${update.content}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * Get current learning statistics.
     */
    getStats() {
        const patternList = Array.from(this.patterns.values());
        const byType = {};
        for (const p of patternList) {
            byType[p.pattern_type] = (byType[p.pattern_type] ?? 0) + 1;
        }
        return {
            total_patterns: patternList.length,
            high_confidence_patterns: patternList.filter(p => p.confidence >= 0.8).length,
            pattern_types: byType,
            top_patterns: patternList
                .sort((a, b) => b.confidence * b.occurrence_count - a.confidence * a.occurrence_count)
                .slice(0, 5),
        };
    }
    /**
     * Get learned rules for a specific agent (to inject into prompts).
     */
    async getAgentRules(agentName) {
        const knowledgeDir = path.dirname(this.knowledgePath);
        const agentFile = path.join(knowledgeDir, `${agentName}-learned-rules.md`);
        try {
            return await fs.readFile(agentFile, 'utf-8');
        }
        catch {
            return ''; // No rules yet
        }
    }
    // ── Persistence ─────────────────────────────────────────────────────────────
    async savePatterns() {
        const dir = path.dirname(this.patternsPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.patternsPath, JSON.stringify(Array.from(this.patterns.values()), null, 2));
    }
    async appendOutcome(outcome) {
        let outcomes = [];
        try {
            const data = await fs.readFile(this.outcomesPath, 'utf-8');
            outcomes = JSON.parse(data);
        }
        catch {
            outcomes = [];
        }
        outcomes.push(outcome);
        // Keep last 500 outcomes
        if (outcomes.length > 500) {
            outcomes = outcomes.slice(-500);
        }
        const dir = path.dirname(this.outcomesPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.outcomesPath, JSON.stringify(outcomes, null, 2));
    }
}
exports.AutonomousLearningLoop = AutonomousLearningLoop;
// ── Singleton ─────────────────────────────────────────────────────────────────
let _instance = null;
async function getLearningLoop() {
    if (!_instance) {
        _instance = new AutonomousLearningLoop();
        await _instance.initialize();
    }
    return _instance;
}
//# sourceMappingURL=autonomous-learning-loop.js.map