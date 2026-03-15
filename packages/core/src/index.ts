/**
 * Core utilities for SaaS Factory
 * Shared types, errors, logging, env validation, API helpers
 */

export const VERSION = '0.1.0' as const

// ── Type aliases ──────────────────────────────────────────────────────────────
export type TenantId = string
export type UserId = string
export type OrgId = string

// ── Standard API response types ───────────────────────────────────────────────
export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string; code: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data }
}

export function apiError(error: string, code = 'INTERNAL_ERROR'): ApiError {
  return { success: false, error, code }
}

// ── Error classes ─────────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

// ── Pagination helpers ────────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export function paginate<T>(
  items: T[],
  total: number,
  { page = 1, limit = 20 }: PaginationParams
): PaginatedResponse<T> {
  return {
    data: items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  }
}

// ── Environment validation ────────────────────────────────────────────────────
export function validateEnv(requiredVars: string[]): void {
  const missing = requiredVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCheck your .env.local file.`
    )
  }
}

// ── Utility functions ─────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength - 3)}...` : str
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const PLANS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export type Plan = (typeof PLANS)[keyof typeof PLANS]
export type Role = (typeof ROLES)[keyof typeof ROLES]

export const PLAN_LIMITS: Record<Plan, { agents: number; projects: number }> = {
  starter: { agents: 5, projects: 3 },
  pro: { agents: 50, projects: 25 },
  enterprise: { agents: Infinity, projects: Infinity },
}
