/**
 * Rate Limiting Block
 *
 * Implements sliding window rate limiting for API routes.
 * Supports both in-memory (development) and Supabase-backed (production) storage.
 *
 * Usage in Next.js API route:
 *   import { createRateLimiter } from '@saas-factory/blocks-ratelimit'
 *   const limiter = createRateLimiter({ limit: 10, window: 60 })
 *   const result = await limiter.check(request)
 *   if (!result.success) return Response.json({ error: 'Too many requests' }, { status: 429 })
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  window: number
  /** Optional prefix for the key (e.g. 'ai-generate') */
  prefix?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Total limit */
  limit: number
  /** Unix timestamp (ms) when the window resets */
  reset: number
  /** Retry-After in seconds (only set when success=false) */
  retryAfter?: number
}

export interface RateLimiterStore {
  increment(key: string, window: number): Promise<{ count: number; reset: number }>
}

// ---------------------------------------------------------------------------
// In-Memory Store (development / single-instance)
// ---------------------------------------------------------------------------
interface MemoryEntry {
  count: number
  reset: number
}

export class InMemoryStore implements RateLimiterStore {
  private store = new Map<string, MemoryEntry>()

  async increment(key: string, window: number): Promise<{ count: number; reset: number }> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.reset) {
      const reset = now + window * 1000
      this.store.set(key, { count: 1, reset })
      return { count: 1, reset }
    }

    entry.count++
    return { count: entry.count, reset: entry.reset }
  }
}

// ---------------------------------------------------------------------------
// Supabase Store (production / multi-instance)
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'

export class SupabaseRateLimitStore implements RateLimiterStore {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }

  async increment(key: string, window: number): Promise<{ count: number; reset: number }> {
    const now = Date.now()
    const resetAt = now + window * 1000

    // Upsert: increment counter or create new entry
    const { data, error } = await this.supabase.rpc('rate_limit_increment', {
      p_key: key,
      p_window_ms: window * 1000,
      p_reset_at: new Date(resetAt).toISOString(),
    })

    if (error) {
      // Fallback: allow request on DB error to avoid blocking users
      console.error('[RateLimit] Supabase error, allowing request:', error.message)
      return { count: 1, reset: resetAt }
    }

    return { count: data.count as number, reset: new Date(data.reset_at as string).getTime() }
  }
}

// ---------------------------------------------------------------------------
// SQL Migration for Supabase (run once)
// ---------------------------------------------------------------------------
export const RATE_LIMIT_MIGRATION_SQL = `
-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function for atomic increment with window reset
CREATE OR REPLACE FUNCTION rate_limit_increment(
  p_key TEXT,
  p_window_ms BIGINT,
  p_reset_at TIMESTAMPTZ
) RETURNS TABLE(count INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_count INTEGER;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Delete expired entries
  DELETE FROM rate_limits WHERE key = p_key AND reset_at < NOW();

  -- Upsert
  INSERT INTO rate_limits (key, count, reset_at)
  VALUES (p_key, 1, p_reset_at)
  ON CONFLICT (key) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING rate_limits.count, rate_limits.reset_at
  INTO v_count, v_reset;

  RETURN QUERY SELECT v_count, v_reset;
END;
$$ LANGUAGE plpgsql;

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
`

// ---------------------------------------------------------------------------
// RateLimiter class
// ---------------------------------------------------------------------------
export class RateLimiter {
  private store: RateLimiterStore
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig, store?: RateLimiterStore) {
    this.config = {
      prefix: 'rl',
      ...config,
    }
    // Auto-select store based on environment
    this.store =
      store ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new SupabaseRateLimitStore()
        : new InMemoryStore())
  }

  /**
   * Extract identifier from a Next.js Request object.
   * Uses IP address or falls back to 'anonymous'.
   */
  private getIdentifier(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous'
    return ip
  }

  /**
   * Check rate limit for a given identifier (IP, user ID, tenant ID, etc.)
   */
  async checkByIdentifier(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.prefix}:${identifier}`
    const { count, reset } = await this.store.increment(key, this.config.window)
    const remaining = Math.max(0, this.config.limit - count)
    const success = count <= this.config.limit

    return {
      success,
      remaining,
      limit: this.config.limit,
      reset,
      retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
    }
  }

  /**
   * Check rate limit from a Next.js Request object (uses IP as identifier)
   */
  async check(request: Request): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(request)
    return this.checkByIdentifier(identifier)
  }

  /**
   * Generate standard rate limit response headers
   */
  static toHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
    }
    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = String(result.retryAfter)
    }
    return headers
  }
}

/**
 * Factory function for creating rate limiters
 */
export function createRateLimiter(config: RateLimitConfig, store?: RateLimiterStore): RateLimiter {
  return new RateLimiter(config, store)
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for common use cases
// ---------------------------------------------------------------------------

/** Strict limiter for AI generation endpoints (10 req/min per IP) */
export const aiGenerationLimiter = createRateLimiter({
  limit: 10,
  window: 60,
  prefix: 'ai-gen',
})

/** Standard API limiter (100 req/min per IP) */
export const apiLimiter = createRateLimiter({
  limit: 100,
  window: 60,
  prefix: 'api',
})

/** Auth limiter to prevent brute-force (5 req/min per IP) */
export const authLimiter = createRateLimiter({
  limit: 5,
  window: 60,
  prefix: 'auth',
})
