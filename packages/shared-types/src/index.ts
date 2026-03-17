/**
 * @saas-factory/shared-types
 *
 * Central TypeScript type definitions shared between:
 * - factory-brain (AI agents)
 * - factory-dashboard (Next.js app)
 * - Generated SaaS applications (apps/*)
 * - CLI (blocks/factory-cli)
 *
 * Usage:
 *   import type { SaaSBlueprint, PipelineRun } from '@saas-factory/shared-types'
 *   import type { SaaSUser, ApiResponse } from '@saas-factory/shared-types/saas'
 *   import type { FleetApp, FleetSummary } from '@saas-factory/shared-types/fleet'
 *   import type { OrchestrateRequest } from '@saas-factory/shared-types/api'
 */

// Re-export all types from sub-modules
export * from './agents'
export * from './saas'
export * from './fleet'
export * from './api'

// ── Version ───────────────────────────────────────────────────────────────────

export const SHARED_TYPES_VERSION = '1.0.0'

// ── Common Utility Types ──────────────────────────────────────────────────────

/** Make all properties of T optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/** Make specific keys of T required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/** Extract the resolved type from a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T

/** Nullable type helper */
export type Nullable<T> = T | null

/** Optional type helper */
export type Optional<T> = T | undefined

/** ID type for consistency */
export type ID = string

/** Timestamp type (ISO 8601 string) */
export type Timestamp = string

/** JSON-serializable value */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

/** Record with string keys and JSON values */
export type JSONObject = Record<string, JSONValue>

// ── Status Types ──────────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ── Environment ───────────────────────────────────────────────────────────────

export type NodeEnv = 'development' | 'test' | 'production'

export interface FactoryConfig {
  version: string
  environment: NodeEnv
  supabaseUrl: string
  openaiModel: string
  maxConcurrentAgents: number
  defaultPlan: string
}
