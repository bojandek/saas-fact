/**
 * Supabase Integration with Circuit Breaker
 * Handles database operations with automatic fallbacks and retries
 */

import { CircuitBreaker, CircuitBreakerConfig } from '../index'

export interface SupabaseAdapterConfig {
  circuitBreakerConfig?: CircuitBreakerConfig
}

/**
 * Supabase Adapter - Wraps database queries with circuit breaker protection
 */
export class SupabaseAdapter {
  private breaker: CircuitBreaker
  private queryCache: Map<string, { data: any; timestamp: number }> = new Map()
  private maxCacheAge = 60000 // 1 minute

  constructor(config: SupabaseAdapterConfig = {}) {
    this.breaker = new CircuitBreaker({
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 180000, // 3 minutes for DB operations
      onFailure: (error) => {
        console.error('[SupabaseAdapter] Query failed:', error.message)
      },
      fallback: async (error) => {
        console.warn('[SupabaseAdapter] Circuit open, operation may be cached')
        throw error
      },
      ...config.circuitBreakerConfig,
    })
  }

  /**
   * Execute query with circuit breaker and caching
   */
  async query<T>(
    key: string,
    fn: () => Promise<T>,
    options: { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<T> {
    const { cache = true, cacheTTL = this.maxCacheAge } = options

    // Check cache first
    if (cache) {
      const cached = this.queryCache.get(key)
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        console.debug(`[SupabaseAdapter] Using cached result for ${key}`)
        return cached.data as T
      }
    }

    try {
      const result = await this.breaker.execute(fn, `query:${key}`)

      // Cache successful result
      if (cache) {
        this.queryCache.set(key, {
          data: result,
          timestamp: Date.now(),
        })
      }

      return result
    } catch (error) {
      // Return stale cache on circuit breaker open
      if (this.breaker.isOpen()) {
        const stale = this.queryCache.get(key)
        if (stale) {
          console.warn(
            `[SupabaseAdapter] Using stale cache for ${key} (circuit open)`
          )
          return stale.data as T
        }
      }

      throw error
    }
  }

  /**
   * Invalidate specific query cache
   */
  invalidate(key: string): void {
    this.queryCache.delete(key)
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keys = Array.from(this.queryCache.keys())
    keys.forEach((key) => {
      if (pattern.test(key)) {
        this.queryCache.delete(key)
      }
    })
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      state: this.breaker.getState(),
      metrics: this.breaker.getMetrics(),
      cacheSize: this.queryCache.size,
      isHealthy: this.breaker.isClosed(),
    }
  }

  /**
   * Check if circuit is open
   */
  isCircuitOpen(): boolean {
    return this.breaker.isOpen()
  }

  /**
   * Force reset (use with caution)
   */
  reset(): void {
    this.breaker.reset()
    this.queryCache.clear()
  }
}
