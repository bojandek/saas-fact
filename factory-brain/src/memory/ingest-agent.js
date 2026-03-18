"use strict";
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
exports.ingestText = ingestText;
exports.ingestFile = ingestFile;
exports.ingestAgentOutput = ingestAgentOutput;
exports.watchDirectory = watchDirectory;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_js_1 = require("@supabase/supabase-js");
const client_1 = require("../llm/client");
const embeddings_1 = require("../llm/embeddings");
const logger_1 = require("../utils/logger");
const retry_1 = require("../utils/retry");
const types_1 = require("./types");
const log = logger_1.logger.child({ agent: 'IngestAgent' });
// ── Clients ───────────────────────────────────────────────────────────────────
function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key)
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    return (0, supabase_js_1.createClient)(url, key);
}
const llm = (0, client_1.getLLMClient)();
// ── Embedding ─────────────────────────────────────────────────────────────────
const embeddingCache = new Map();
async function generateEmbedding(text) {
    const cacheKey = crypto_1.default.createHash('md5').update(text.slice(0, 500)).digest('hex');
    if (embeddingCache.has(cacheKey))
        return embeddingCache.get(cacheKey);
    const response = await (0, retry_1.withRetry)(() => (0, embeddings_1.createEmbedding)(text.slice(0, 8000), embeddings_1.EMBEDDING_MODELS.VOYAGE), { maxAttempts: 3, baseDelayMs: 1000 });
    const embedding = response.data[0].embedding;
    embeddingCache.set(cacheKey, embedding);
    return embedding;
}
// ── Core Ingest Logic ─────────────────────────────────────────────────────────
/**
 * Extracts structured information from text using GPT-4o-mini.
 */
async function extractStructuredInfo(content, sourceType, source) {
    const systemPrompt = `You are a Memory Ingest Agent. Extract structured information from the provided content.
Return a JSON object with:
- summary: 1-2 sentence concise summary
- entities: array of key people, companies, products, technologies, or concepts (max 8)
- topics: array of 2-4 topic tags (e.g. "payments", "multi-tenant", "SaaS")
- importance: float 0.0-1.0 (1.0 = critical architectural decision, 0.5 = useful context, 0.1 = minor detail)
- raw_text: the full content description (preserve all important details)

For code/technical content: focus on architectural patterns, APIs, and design decisions.
For business content: focus on requirements, constraints, and goals.
Always return valid JSON only, no markdown.`;
    const userPrompt = sourceType === 'text'
        ? `Source: ${source}\n\nContent:\n${content.slice(0, 6000)}`
        : `Source: ${source} (${sourceType})\n\nDescription:\n${content.slice(0, 6000)}`;
    const response = await (0, retry_1.withRetry)(() => llm.chat({
        model: client_1.CLAUDE_MODELS.HAIKU,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    }), { maxAttempts: 3, baseDelayMs: 1000 });
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
    return {
        raw_text: parsed.raw_text ?? content.slice(0, 2000),
        summary: parsed.summary ?? 'No summary available',
        entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 8) : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 4) : [],
        importance: typeof parsed.importance === 'number'
            ? Math.max(0, Math.min(1, parsed.importance))
            : 0.5,
    };
}
/**
 * Processes an image file using GPT-4o vision.
 */
async function describeImage(filePath) {
    const imageData = fs_1.default.readFileSync(filePath);
    const base64 = imageData.toString('base64');
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeType = types_1.SUPPORTED_MEDIA_EXTENSIONS[ext] ?? 'image/jpeg';
    const response = await (0, retry_1.withRetry)(() => llm.chat({
        model: client_1.CLAUDE_MODELS.SONNET,
        messages: [{
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Describe this image in detail. Focus on: UI/UX patterns, architecture diagrams, text content, wireframes, or any technical information visible. Be thorough and specific.',
                    },
                    {
                        type: 'image_url',
                        image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
                    },
                ],
            }],
        max_tokens: 1000,
    }), { maxAttempts: 2, baseDelayMs: 2000 });
    return response.choices[0].message.content ?? 'Could not describe image';
}
/**
 * Stores a memory in Supabase with its embedding.
 */
async function storeMemory(input) {
    const supabase = getSupabase();
    const embedding = await generateEmbedding(`${input.summary} ${input.entities.join(' ')} ${input.topics.join(' ')}`);
    const { data, error } = await supabase
        .from('memories')
        .insert({
        source: input.source ?? '',
        source_type: input.source_type ?? 'text',
        raw_text: input.raw_text,
        summary: input.summary,
        entities: input.entities,
        topics: input.topics,
        importance: input.importance,
        embedding,
        project_id: input.project_id ?? null,
    })
        .select('id, summary')
        .single();
    if (error)
        throw new Error(`Failed to store memory: ${error.message}`);
    log.info({ memory_id: data.id, summary: data.summary.slice(0, 60) }, 'Memory stored');
    return { memory_id: data.id, status: 'stored', summary: data.summary };
}
/**
 * Checks if a file has already been processed (deduplication).
 */
async function isAlreadyProcessed(filePath, fileHash) {
    const supabase = getSupabase();
    const { data } = await supabase
        .from('memory_processed_files')
        .select('path')
        .eq('path', filePath)
        .eq('file_hash', fileHash)
        .maybeSingle();
    return data !== null;
}
/**
 * Marks a file as processed.
 */
async function markFileProcessed(filePath, fileHash, memoryId) {
    const supabase = getSupabase();
    await supabase
        .from('memory_processed_files')
        .upsert({ path: filePath, file_hash: fileHash, memory_id: memoryId });
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Ingest raw text into the memory system.
 */
async function ingestText(text, source = 'manual', projectId) {
    log.info({ source, length: text.length }, 'Ingesting text');
    const structured = await extractStructuredInfo(text, 'text', source);
    const stored = await storeMemory({
        ...structured,
        source,
        source_type: 'text',
        project_id: projectId,
    });
    return {
        memory_id: stored.memory_id,
        source,
        summary: stored.summary,
        entities: structured.entities,
        topics: structured.topics,
        importance: structured.importance,
    };
}
/**
 * Ingest a file (text, image, PDF, audio, video) into the memory system.
 * Automatically detects file type and uses appropriate processing.
 */
async function ingestFile(filePath, projectId) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const fileName = path_1.default.basename(filePath);
    if (!types_1.ALL_SUPPORTED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported file type: ${ext}. Supported: ${[...types_1.ALL_SUPPORTED_EXTENSIONS].join(', ')}`);
    }
    // Compute file hash for deduplication
    const fileBuffer = fs_1.default.readFileSync(filePath);
    const fileHash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
    // Check if already processed
    if (await isAlreadyProcessed(filePath, fileHash)) {
        log.info({ filePath }, 'File already processed, skipping');
        return {
            memory_id: -1,
            source: fileName,
            summary: 'Already processed',
            entities: [],
            topics: [],
            importance: 0,
            already_processed: true,
        };
    }
    log.info({ filePath, ext }, 'Ingesting file');
    let content;
    let sourceType;
    if (types_1.SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
        // Text-based files: read directly
        content = fs_1.default.readFileSync(filePath, 'utf-8');
        sourceType = 'text';
    }
    else if (ext === '.pdf') {
        // PDF: extract text (basic extraction via buffer toString)
        // In production, use pdf-parse or pdfjs-dist
        content = `PDF document: ${fileName}. Content requires pdf-parse library for full extraction.`;
        sourceType = 'pdf';
    }
    else if (types_1.SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('image/')) {
        // Images: use GPT-4o vision
        content = await describeImage(filePath);
        sourceType = 'image';
    }
    else if (types_1.SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('audio/') ||
        types_1.SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('video/')) {
        // Audio/Video: use Whisper transcription
        // Whisper transcription uses OpenAI (Claude has no audio API)
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const whisperClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const fileStream = fs_1.default.createReadStream(filePath);
        const transcription = await (0, retry_1.withRetry)(() => whisperClient.audio.transcriptions.create({
            model: 'whisper-1',
            file: fileStream,
            response_format: 'text',
        }), { maxAttempts: 2, baseDelayMs: 2000 });
        content = typeof transcription === 'string' ? transcription : transcription.text;
        sourceType = types_1.SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('audio/') ? 'audio' : 'video';
    }
    else {
        throw new Error(`Cannot process file type: ${ext}`);
    }
    const structured = await extractStructuredInfo(content, sourceType, fileName);
    const stored = await storeMemory({
        ...structured,
        source: fileName,
        source_type: sourceType,
        project_id: projectId,
    });
    // Mark file as processed
    await markFileProcessed(filePath, fileHash, stored.memory_id);
    return {
        memory_id: stored.memory_id,
        source: fileName,
        summary: stored.summary,
        entities: structured.entities,
        topics: structured.topics,
        importance: structured.importance,
    };
}
/**
 * Ingest a SaaS project result as a memory.
 * Called automatically after each successful War Room orchestration.
 */
async function ingestAgentOutput(agentName, output, projectId) {
    return ingestText(output, `agent:${agentName}`, projectId);
}
/**
 * Watch a directory for new files and ingest them automatically.
 * Polls every `intervalMs` milliseconds (default: 30 seconds).
 */
function watchDirectory(dirPath, projectId, intervalMs = 30000) {
    log.info({ dirPath, intervalMs }, 'Starting directory watcher');
    const processedInSession = new Set();
    const poll = async () => {
        if (!fs_1.default.existsSync(dirPath))
            return;
        const files = fs_1.default.readdirSync(dirPath);
        for (const file of files) {
            if (file.startsWith('.'))
                continue; // skip hidden files
            const filePath = path_1.default.join(dirPath, file);
            const ext = path_1.default.extname(file).toLowerCase();
            if (!types_1.ALL_SUPPORTED_EXTENSIONS.has(ext))
                continue;
            if (processedInSession.has(filePath))
                continue;
            processedInSession.add(filePath);
            try {
                const result = await ingestFile(filePath, projectId);
                if (!result.already_processed) {
                    log.info({ file, memory_id: result.memory_id }, 'Auto-ingested file from inbox');
                }
            }
            catch (err) {
                log.error({ file, err }, 'Failed to auto-ingest file');
                processedInSession.delete(filePath); // allow retry
            }
        }
    };
    // Run immediately, then on interval
    poll().catch(err => log.error({ err }, 'Initial poll failed'));
    return setInterval(poll, intervalMs);
}
//# sourceMappingURL=ingest-agent.js.map