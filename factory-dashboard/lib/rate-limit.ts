/**
 * Rate Limiting Utility for Factory Dashboard API Routes
 *
 * Uses a sliding window algorithm with in-memory store.
 * For multi-instance production deployments, replace InMemoryStore
 * with a Redis/Supabase-backed store.
 */

interface RateLimitEntry {
  count: number
  reset: number
}

// Simple in-memory store (per-instance)
const store = new Map<string, RateLimitEntry>()

export interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  reset: number
  retryAfter?: number
}

/**
 * Check rate limit for a given identifier.
 * @param identifier - Unique key (e.g. IP address, user ID)
 * @param limit - Max requests allowed in the window
 * @param windowSeconds - Window duration in seconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}:${limit}:${windowSeconds}`
  const entry = store.get(key)

  if (!entry || now > entry.reset) {
    const reset = now + windowSeconds * 1000
    store.set(key, { count: 1, reset })
    return { success: true, remaining: limit - 1, limit, reset }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  const success = entry.count <= limit

  return {
    success,
    remaining,
    limit,
    reset: entry.reset,
    retryAfter: success ? undefined : Math.ceil((entry.reset - now) / 1000),
  }
}

/**
 * Extract IP address from a Next.js Request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp.trim()
  return 'anonymous'
}

/**
 * Apply rate limit to an API route.
 * Returns a Response with 429 status if limit exceeded, or null if allowed.
 *
 * Usage:
 *   const limited = applyRateLimit(request, { limit: 10, window: 60 })
 *   if (limited) return limited
 */
export function applyRateLimit(
  request: Request,
  options: { limit?: number; window?: number } = {}
): Response | null {
  const ip = getClientIp(request)
  const result = checkRateLimit(ip, options.limit ?? 10, options.window ?? 60)

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
          'Retry-After': String(result.retryAfter),
        },
      }
    )
  }

  return null
}
