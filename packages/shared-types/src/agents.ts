/**
 * @saas-factory/shared-types/agents
 *
 * TypeScript types shared between factory-brain agents.
 * These types ensure that agent outputs are compatible with
 * each other and with the generated SaaS applications.
 */

// ── SaaS Blueprint (output of ArchitectAgent) ─────────────────────────────────

export interface SaaSBlueprint {
  /** Unique identifier for this blueprint */
  id: string
  /** Human-readable name of the SaaS */
  name: string
  /** Slug used for directory names and IDs */
  slug: string
  /** One-line description */
  tagline: string
  /** Detailed description */
  description: string
  /** Target audience */
  targetAudience: string
  /** Core problem being solved */
  problemStatement: string
  /** Tech stack selection */
  techStack: TechStack
  /** Database schema */
  schema: DatabaseSchema
  /** API specification */
  api: APISpec
  /** UI components to generate */
  uiComponents: UIComponentSpec[]
  /** Feature list */
  features: FeatureSpec[]
  /** Pricing tiers */
  pricing: PricingTier[]
  /** Blocks to include */
  blocks: string[]
  /** Metadata */
  metadata: {
    generatedAt: string
    architectVersion: string
    estimatedDevTime: string
    complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  }
}

export interface TechStack {
  frontend: 'nextjs' | 'remix' | 'vite-react'
  backend: 'nextjs-api' | 'express' | 'fastify' | 'hono'
  database: 'supabase' | 'planetscale' | 'neon' | 'turso'
  auth: 'supabase-auth' | 'clerk' | 'auth0' | 'lucia'
  payments: 'stripe' | 'lemon-squeezy' | 'paddle' | 'none'
  email: 'resend' | 'sendgrid' | 'postmark' | 'none'
  storage: 's3' | 'cloudflare-r2' | 'supabase-storage' | 'none'
  deployment: 'coolify' | 'vercel' | 'railway' | 'fly'
  styling: 'tailwind' | 'shadcn' | 'chakra'
}

// ── Database Schema ───────────────────────────────────────────────────────────

export interface DatabaseSchema {
  tables: TableDefinition[]
  enums: EnumDefinition[]
  functions: FunctionDefinition[]
  rlsPolicies: RLSPolicyDefinition[]
  migrations: MigrationFile[]
}

export interface TableDefinition {
  name: string
  description: string
  columns: ColumnDefinition[]
  indexes: IndexDefinition[]
  foreignKeys: ForeignKeyDefinition[]
  rlsEnabled: boolean
}

export interface ColumnDefinition {
  name: string
  type: PostgresType
  nullable: boolean
  default?: string
  unique?: boolean
  primaryKey?: boolean
  references?: { table: string; column: string }
  description?: string
}

export type PostgresType =
  | 'uuid' | 'text' | 'varchar' | 'char'
  | 'integer' | 'bigint' | 'smallint' | 'serial' | 'bigserial'
  | 'boolean'
  | 'timestamptz' | 'timestamp' | 'date' | 'time'
  | 'jsonb' | 'json'
  | 'numeric' | 'decimal' | 'real' | 'double precision'
  | 'bytea'
  | 'inet' | 'cidr' | 'macaddr'
  | 'vector'
  | string // for custom/enum types

export interface IndexDefinition {
  name: string
  columns: string[]
  unique?: boolean
  method?: 'btree' | 'hash' | 'gin' | 'gist' | 'ivfflat'
  where?: string
}

export interface ForeignKeyDefinition {
  column: string
  references: { table: string; column: string }
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

export interface EnumDefinition {
  name: string
  values: string[]
}

export interface FunctionDefinition {
  name: string
  language: 'plpgsql' | 'sql' | 'javascript'
  returns: string
  body: string
  securityDefiner?: boolean
}

export interface RLSPolicyDefinition {
  table: string
  name: string
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
  using?: string
  withCheck?: string
}

export interface MigrationFile {
  version: string
  name: string
  sql: string
  rollback?: string
}

// ── API Specification ─────────────────────────────────────────────────────────

export interface APISpec {
  version: string
  basePath: string
  endpoints: APIEndpoint[]
  middleware: string[]
  authentication: 'jwt' | 'session' | 'api-key' | 'none'
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: boolean
  rateLimit?: { requests: number; window: string }
  requestBody?: JSONSchema
  response: JSONSchema
  errors: Array<{ status: number; message: string }>
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  example?: unknown
}

// ── UI Components ─────────────────────────────────────────────────────────────

export interface UIComponentSpec {
  name: string
  type: 'page' | 'layout' | 'form' | 'table' | 'card' | 'modal' | 'widget' | 'chart'
  description: string
  props: ComponentProp[]
  dataSource?: string
  actions?: ComponentAction[]
  responsive: boolean
  darkMode: boolean
}

export interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: unknown
  description?: string
}

export interface ComponentAction {
  name: string
  type: 'submit' | 'navigate' | 'api-call' | 'modal' | 'delete'
  endpoint?: string
  confirmation?: string
}

// ── Features ──────────────────────────────────────────────────────────────────

export interface FeatureSpec {
  id: string
  name: string
  description: string
  priority: 'must-have' | 'should-have' | 'nice-to-have'
  complexity: 'low' | 'medium' | 'high'
  blocks: string[]
  estimatedHours: number
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface PricingTier {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  interval: 'month' | 'year' | 'one-time'
  features: string[]
  limits: Record<string, number | 'unlimited'>
  stripePriceId?: string
  recommended?: boolean
  cta: string
}

// ── Agent Results ─────────────────────────────────────────────────────────────

export interface AgentResult<T = unknown> {
  agentId: string
  agentType: AgentType
  status: 'success' | 'error' | 'partial'
  data: T
  error?: string
  tokensUsed: number
  costUsd: number
  durationMs: number
  timestamp: string
}

export type AgentType =
  | 'architect'
  | 'assembler'
  | 'war-room-orchestrator'
  | 'growth-hacker'
  | 'compliance'
  | 'qa-automation'
  | 'legal'
  | 'coolify-deploy'
  | 'memory-ingest'
  | 'memory-consolidate'
  | 'memory-query'
  | 'metaclaw'
  | 'nano-banana'
  | 'report'

// ── War Room Pipeline ─────────────────────────────────────────────────────────

export interface PipelineRun {
  id: string
  saasName: string
  saasDescription: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentStep: PipelineStep
  steps: PipelineStepResult[]
  blueprint?: SaaSBlueprint
  outputPath?: string
  totalCostUsd: number
  totalTokens: number
  startedAt: string
  completedAt?: string
  userId: string
  orgId: string
}

export type PipelineStep =
  | 'blueprint'
  | 'schema'
  | 'components'
  | 'growth'
  | 'compliance'
  | 'qa'
  | 'legal'
  | 'assemble'
  | 'deploy'
  | 'done'

export interface PipelineStepResult {
  step: PipelineStep
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  agentType: AgentType
  startedAt?: string
  completedAt?: string
  durationMs?: number
  costUsd?: number
  error?: string
  output?: unknown
}

// ── SSE Streaming Events ──────────────────────────────────────────────────────

export type StreamEventType =
  | 'pipeline:start'
  | 'pipeline:complete'
  | 'pipeline:error'
  | 'step:start'
  | 'step:progress'
  | 'step:complete'
  | 'step:error'
  | 'agent:thinking'
  | 'agent:output'
  | 'cost:update'
  | 'log'

export interface StreamEvent<T = unknown> {
  type: StreamEventType
  runId: string
  step?: PipelineStep
  agentType?: AgentType
  data: T
  timestamp: string
}
