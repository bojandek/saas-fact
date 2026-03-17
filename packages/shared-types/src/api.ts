/**
 * @saas-factory/shared-types/api
 *
 * Shared API contract types — used by both factory-brain agents
 * and generated SaaS applications to ensure type-safe communication.
 */

// ── Factory API Requests ──────────────────────────────────────────────────────

export interface GenerateBlueprintRequest {
  name: string
  description: string
  targetAudience?: string
  features?: string[]
  techPreferences?: Partial<{
    frontend: string
    backend: string
    database: string
    payments: string
  }>
}

export interface AssembleSaaSRequest {
  blueprintId?: string
  name: string
  description: string
  blocks?: string[]
  outputPath?: string
}

export interface OrchestrateRequest {
  name: string
  description: string
  blocks?: string[]
  skipSteps?: string[]
  dryRun?: boolean
}

export interface GenerateThemeRequest {
  description: string
  industry?: string
  mood?: 'professional' | 'playful' | 'minimal' | 'bold' | 'elegant'
  primaryColor?: string
}

export interface GenerateComponentsRequest {
  saasDescription: string
  components: string[]
  theme?: {
    primaryColor: string
    fontFamily: string
    borderRadius: string
  }
}

export interface GenerateSQLRequest {
  description: string
  tables: string[]
  includeRLS?: boolean
  includeMigrations?: boolean
}

export interface GenerateLandingPageRequest {
  saasName: string
  tagline: string
  features: string[]
  pricing?: Array<{ name: string; price: number; features: string[] }>
  targetAudience?: string
}

export interface GenerateGrowthPlanRequest {
  saasName: string
  description: string
  targetAudience: string
  currentMRR?: number
  targetMRR?: number
  timeframeMonths?: number
}

export interface CheckComplianceRequest {
  saasName: string
  description: string
  targetMarkets: string[]
  dataTypes: string[]
  userTypes: string[]
}

export interface GenerateQATestsRequest {
  saasName: string
  description: string
  features: string[]
  apiEndpoints?: string[]
}

export interface GenerateLegalDocumentsRequest {
  saasName: string
  description: string
  companyName?: string
  targetMarkets: string[]
  dataCollected: string[]
  hasPayments?: boolean
}

// ── Memory API ────────────────────────────────────────────────────────────────

export interface MemoryIngestRequest {
  content: string
  contentType?: 'text' | 'image' | 'pdf' | 'audio' | 'video' | 'url'
  source?: string
  tags?: string[]
  importance?: number
  metadata?: Record<string, unknown>
}

export interface MemoryQueryRequest {
  query: string
  limit?: number
  minSimilarity?: number
  tags?: string[]
  contentTypes?: string[]
}

export interface MemoryQueryResponse {
  answer: string
  memories: Array<{
    id: string
    content: string
    source: string | null
    importance: number
    similarity: number
    createdAt: string
  }>
  confidence: number
  processingMs: number
}

// ── Queue API ─────────────────────────────────────────────────────────────────

export interface EnqueueJobRequest {
  type: 'orchestrate' | 'assemble' | 'blueprint' | 'deploy'
  payload: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'critical'
  userId?: string
  orgId?: string
}

export interface JobStatusResponse {
  id: string
  type: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: string
  progress?: number
  result?: unknown
  error?: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
  estimatedWaitMs?: number
}

export interface QueueStatsResponse {
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  avgWaitMs: number
  avgProcessingMs: number
  throughputPerHour: number
}

// ── Cost Tracking API ─────────────────────────────────────────────────────────

export interface CostSummaryResponse {
  totalCostUsd: number
  totalTokens: number
  byModel: Record<string, { tokens: number; costUsd: number; requests: number }>
  byAgent: Record<string, { tokens: number; costUsd: number; requests: number }>
  period: {
    start: string
    end: string
  }
}

// ── Deploy API ────────────────────────────────────────────────────────────────

export interface DeployRequest {
  appName: string
  environment?: 'production' | 'staging'
  coolifyAppId?: string
  envVars?: Record<string, string>
}

export interface DeployStatusResponse {
  deploymentId: string
  status: 'queued' | 'building' | 'deploying' | 'running' | 'failed'
  url?: string
  logs?: string[]
  startedAt: string
  completedAt?: string
  error?: string
}

// ── No-Code Export API ────────────────────────────────────────────────────────

export interface NoCodeExportRequest {
  platform: 'flutterflow' | 'bubble' | 'zapier' | 'retool' | 'webflow'
  blueprintId?: string
  saasName: string
  description: string
  features: string[]
}

export interface NoCodeExportResponse {
  platform: string
  format: string
  content: string | Record<string, unknown>
  instructions: string[]
  exportedAt: string
}
