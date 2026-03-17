/**
 * @saas-factory/shared-types/fleet
 *
 * Types for Fleet Management — monitoring and managing
 * multiple SaaS applications from a single dashboard.
 */

// ── Fleet Registry ────────────────────────────────────────────────────────────

export interface FleetApp {
  id: string
  saasId: string
  displayName: string
  factoryVersion: string
  templateUsed: string | null
  blocksEnabled: string[]
  environment: AppEnvironment
  url: string | null
  coolifyAppId: string | null
  stripeProductId: string | null
  supabaseProjectRef: string | null
  orgId: string
  status: AppStatus
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type AppEnvironment = 'production' | 'staging' | 'development'
export type AppStatus = 'active' | 'paused' | 'archived'

// ── Health Check ──────────────────────────────────────────────────────────────

export interface AppHealthCheck {
  ok: boolean
  latencyMs: number | null
  error?: string
  version?: string
  dbConnected?: boolean
  checkedAt: string
}

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface AppWithHealth extends FleetApp {
  healthStatus: HealthStatus
  healthCheck: AppHealthCheck
  deployment: DeploymentInfo | null
  stripe: StripeMetrics | null
}

// ── Deployment ────────────────────────────────────────────────────────────────

export interface DeploymentInfo {
  status: DeploymentStatus
  commitSha: string | null
  commitMessage: string | null
  deployedAt: string | null
  buildDurationSeconds: number | null
  deployedBy: string | null
}

export type DeploymentStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'restarting'
  | 'error'
  | 'unknown'

// ── Stripe Metrics ────────────────────────────────────────────────────────────

export interface StripeMetrics {
  mrr: number
  arr: number
  activeSubscriptions: number
  trialSubscriptions: number
  pastDueSubscriptions: number
  churnRate: number
  newSubscriptions30d: number
  canceledSubscriptions30d: number
}

// ── Fleet Summary ─────────────────────────────────────────────────────────────

export interface FleetSummary {
  totalApps: number
  healthyApps: number
  degradedApps: number
  downApps: number
  unknownApps: number
  totalMRR: number
  totalSubscriptions: number
  totalUsers: number
  checkedAt: string
}

// ── Migration ─────────────────────────────────────────────────────────────────

export interface MigrationRequest {
  appName?: string | null
  dryRun?: boolean
}

export interface MigrationResult {
  app: string
  status: 'success' | 'skipped' | 'error'
  message: string
  migrationsApplied: number
  dryRun: boolean
  migrations?: string[]
}

export interface BulkMigrationResult {
  results: MigrationResult[]
  summary: {
    total: number
    success: number
    skipped: number
    error: number
    dryRun: boolean
  }
}

// ── Fleet Events ──────────────────────────────────────────────────────────────

export interface FleetEvent {
  id: string
  saasId: string
  type: FleetEventType
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  metadata: Record<string, unknown>
  resolvedAt: string | null
  createdAt: string
}

export type FleetEventType =
  | 'app.down'
  | 'app.degraded'
  | 'app.recovered'
  | 'deploy.started'
  | 'deploy.completed'
  | 'deploy.failed'
  | 'migration.completed'
  | 'migration.failed'
  | 'payment.failed'
  | 'db.storage.high'
  | 'error.rate.high'
