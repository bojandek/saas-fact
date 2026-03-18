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

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { getLLMClient, CLAUDE_MODELS } from '../llm/client'
import { createEmbedding, EMBEDDING_MODELS } from '../llm/embeddings'
import { logger } from '../utils/logger'
import { withRetry } from '../utils/retry'
import type {
  IngestResult,
  MemoryInput,
  SourceType,
  StoredMemory,
} from './types'
import {
  ALL_SUPPORTED_EXTENSIONS,
  SUPPORTED_MEDIA_EXTENSIONS,
  SUPPORTED_TEXT_EXTENSIONS,
} from './types'

const log = logger.child({ agent: 'IngestAgent' })

// ── Clients ───────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key)
}

const llm = getLLMClient()

// ── Embedding ─────────────────────────────────────────────────────────────────

const embeddingCache = new Map<string, number[]>()

async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = crypto.createHash('md5').update(text.slice(0, 500)).digest('hex')
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey)!

  
  const response = await withRetry(
    () => createEmbedding(text.slice(0, 8000) , EMBEDDING_MODELS.VOYAGE),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )
  const embedding = response.data[0].embedding
  embeddingCache.set(cacheKey, embedding)
  return embedding
}

// ── Core Ingest Logic ─────────────────────────────────────────────────────────

/**
 * Extracts structured information from text using GPT-4o-mini.
 */
async function extractStructuredInfo(
  content: string,
  sourceType: SourceType,
  source: string
): Promise<Omit<MemoryInput, 'source' | 'source_type' | 'project_id'>> {
  

  const systemPrompt = `You are a Memory Ingest Agent. Extract structured information from the provided content.
Return a JSON object with:
- summary: 1-2 sentence concise summary
- entities: array of key people, companies, products, technologies, or concepts (max 8)
- topics: array of 2-4 topic tags (e.g. "payments", "multi-tenant", "SaaS")
- importance: float 0.0-1.0 (1.0 = critical architectural decision, 0.5 = useful context, 0.1 = minor detail)
- raw_text: the full content description (preserve all important details)

For code/technical content: focus on architectural patterns, APIs, and design decisions.
For business content: focus on requirements, constraints, and goals.
Always return valid JSON only, no markdown.`

  const userPrompt = sourceType === 'text'
    ? `Source: ${source}\n\nContent:\n${content.slice(0, 6000)}`
    : `Source: ${source} (${sourceType})\n\nDescription:\n${content.slice(0, 6000)}`

  const response = await withRetry(
    () => llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
  return {
    raw_text: parsed.raw_text ?? content.slice(0, 2000),
    summary: parsed.summary ?? 'No summary available',
    entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 8) : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 4) : [],
    importance: typeof parsed.importance === 'number'
      ? Math.max(0, Math.min(1, parsed.importance))
      : 0.5,
  }
}

/**
 * Processes an image file using GPT-4o vision.
 */
async function describeImage(filePath: string): Promise<string> {
  
  const imageData = fs.readFileSync(filePath)
  const base64 = imageData.toString('base64')
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = SUPPORTED_MEDIA_EXTENSIONS[ext] ?? 'image/jpeg'

  const response = await withRetry(
    () => llm.chat({
      model: CLAUDE_MODELS.SONNET,
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
    }),
    { maxAttempts: 2, baseDelayMs: 2000 }
  )

  return response.choices[0].message.content ?? 'Could not describe image'
}

/**
 * Stores a memory in Supabase with its embedding.
 */
async function storeMemory(input: MemoryInput): Promise<StoredMemory> {
  const supabase = getSupabase()
  const embedding = await generateEmbedding(`${input.summary} ${input.entities.join(' ')} ${input.topics.join(' ')}`)

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
    .single()

  if (error) throw new Error(`Failed to store memory: ${error.message}`)

  log.info({ memory_id: data.id, summary: data.summary.slice(0, 60) }, 'Memory stored')
  return { memory_id: data.id, status: 'stored', summary: data.summary }
}

/**
 * Checks if a file has already been processed (deduplication).
 */
async function isAlreadyProcessed(filePath: string, fileHash: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('memory_processed_files')
    .select('path')
    .eq('path', filePath)
    .eq('file_hash', fileHash)
    .maybeSingle()
  return data !== null
}

/**
 * Marks a file as processed.
 */
async function markFileProcessed(filePath: string, fileHash: string, memoryId: number): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('memory_processed_files')
    .upsert({ path: filePath, file_hash: fileHash, memory_id: memoryId })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ingest raw text into the memory system.
 */
export async function ingestText(
  text: string,
  source = 'manual',
  projectId?: string
): Promise<IngestResult> {
  log.info({ source, length: text.length }, 'Ingesting text')

  const structured = await extractStructuredInfo(text, 'text', source)
  const stored = await storeMemory({
    ...structured,
    source,
    source_type: 'text',
    project_id: projectId,
  })

  return {
    memory_id: stored.memory_id,
    source,
    summary: stored.summary,
    entities: structured.entities,
    topics: structured.topics,
    importance: structured.importance,
  }
}

/**
 * Ingest a file (text, image, PDF, audio, video) into the memory system.
 * Automatically detects file type and uses appropriate processing.
 */
export async function ingestFile(
  filePath: string,
  projectId?: string
): Promise<IngestResult> {
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  if (!ALL_SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Supported: ${[...ALL_SUPPORTED_EXTENSIONS].join(', ')}`)
  }

  // Compute file hash for deduplication
  const fileBuffer = fs.readFileSync(filePath)
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

  // Check if already processed
  if (await isAlreadyProcessed(filePath, fileHash)) {
    log.info({ filePath }, 'File already processed, skipping')
    return {
      memory_id: -1,
      source: fileName,
      summary: 'Already processed',
      entities: [],
      topics: [],
      importance: 0,
      already_processed: true,
    }
  }

  log.info({ filePath, ext }, 'Ingesting file')

  let content: string
  let sourceType: SourceType

  if (SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
    // Text-based files: read directly
    content = fs.readFileSync(filePath, 'utf-8')
    sourceType = 'text'
  } else if (ext === '.pdf') {
    // PDF: extract text (basic extraction via buffer toString)
    // In production, use pdf-parse or pdfjs-dist
    content = `PDF document: ${fileName}. Content requires pdf-parse library for full extraction.`
    sourceType = 'pdf'
  } else if (SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('image/')) {
    // Images: use GPT-4o vision
    content = await describeImage(filePath)
    sourceType = 'image'
  } else if (
    SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('audio/') ||
    SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('video/')
  ) {
    // Audio/Video: use Whisper transcription
    
    // Whisper transcription uses OpenAI (Claude has no audio API)
    const { default: OpenAI } = await import('openai')
    const whisperClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const fileStream = fs.createReadStream(filePath)
    const transcription = await withRetry(
      () => whisperClient.audio.transcriptions.create({
        model: 'whisper-1',
        file: fileStream as Parameters<typeof whisperClient.audio.transcriptions.create>[0]['file'],
        response_format: 'text',
      }),
      { maxAttempts: 2, baseDelayMs: 2000 }
    )
    content = typeof transcription === 'string' ? transcription : (transcription as { text: string }).text
    sourceType = SUPPORTED_MEDIA_EXTENSIONS[ext]?.startsWith('audio/') ? 'audio' : 'video'
  } else {
    throw new Error(`Cannot process file type: ${ext}`)
  }

  const structured = await extractStructuredInfo(content, sourceType, fileName)
  const stored = await storeMemory({
    ...structured,
    source: fileName,
    source_type: sourceType,
    project_id: projectId,
  })

  // Mark file as processed
  await markFileProcessed(filePath, fileHash, stored.memory_id)

  return {
    memory_id: stored.memory_id,
    source: fileName,
    summary: stored.summary,
    entities: structured.entities,
    topics: structured.topics,
    importance: structured.importance,
  }
}

/**
 * Ingest a SaaS project result as a memory.
 * Called automatically after each successful War Room orchestration.
 */
export async function ingestAgentOutput(
  agentName: string,
  output: string,
  projectId?: string
): Promise<IngestResult> {
  return ingestText(output, `agent:${agentName}`, projectId)
}

/**
 * Watch a directory for new files and ingest them automatically.
 * Polls every `intervalMs` milliseconds (default: 30 seconds).
 */
export function watchDirectory(
  dirPath: string,
  projectId?: string,
  intervalMs = 30_000
): NodeJS.Timer {
  log.info({ dirPath, intervalMs }, 'Starting directory watcher')

  const processedInSession = new Set<string>()

  const poll = async () => {
    if (!fs.existsSync(dirPath)) return

    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      if (file.startsWith('.')) continue // skip hidden files

      const filePath = path.join(dirPath, file)
      const ext = path.extname(file).toLowerCase()

      if (!ALL_SUPPORTED_EXTENSIONS.has(ext)) continue
      if (processedInSession.has(filePath)) continue

      processedInSession.add(filePath)

      try {
        const result = await ingestFile(filePath, projectId)
        if (!result.already_processed) {
          log.info({ file, memory_id: result.memory_id }, 'Auto-ingested file from inbox')
        }
      } catch (err) {
        log.error({ file, err }, 'Failed to auto-ingest file')
        processedInSession.delete(filePath) // allow retry
      }
    }
  }

  // Run immediately, then on interval
  poll().catch(err => log.error({ err }, 'Initial poll failed'))
  return setInterval(poll, intervalMs)
}
