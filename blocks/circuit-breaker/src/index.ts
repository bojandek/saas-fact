/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures with automatic fallbacks
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold?: number // failures to trip, default 5
  successThreshold?: number // successes to close, default 2
  timeout?: number // ms to wait before half-open, default 60000
  onStateChange?: (state: CircuitBreakerState) => void
  onFailure?: (error: Error) => void
  fallback?: <T>(error: Error) => Promise<T> | T
}

export interface CircuitBreakerMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  consecutiveFailures: number
  lastFailureTime?: Date
  lastStateChangeTime: Date
}

/**
 * Circuit Breaker - Protects against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: Date
  private lastStateChangeTime = new Date()
  private metrics: CircuitBreakerMetrics
  
  constructor(private config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      ...config,
    }

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      lastStateChangeTime: new Date(),
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    this.metrics.totalRequests++

    // Check if circuit should transition to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime?.getTime() || 0)
      if (timeSinceLastFailure > (this.config.timeout || 60000)) {
        this.transitionTo('HALF_OPEN')
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${context || 'operation'}. ${timeSinceLastFailure}ms since last failure.`
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      this.metrics.successfulRequests++
      return result
    } catch (error) {
      this.onFailure(error as Error)
      this.metrics.failedRequests++

      // Try fallback if available
      if (this.config.fallback) {
        try {
          return await Promise.resolve(
            this.config.fallback(error as Error)
          ) as T
        } catch (fallbackError) {
          throw error // Throw original error if fallback also fails
        }
      }

      throw error
    }
  }

  /**
   * Sync version for non-promise operations
   */
  executeSync<T>(
    operation: () => T,
    context?: string
  ): T {
    this.metrics.totalRequests++

    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime?.getTime() || 0)
      if (timeSinceLastFailure > (this.config.timeout || 60000)) {
        this.transitionTo('HALF_OPEN')
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${context || 'operation'}`
        )
      }
    }

    try {
      const result = operation()
      this.onSuccess()
      this.metrics.successfulRequests++
      return result
    } catch (error) {
      this.onFailure(error as Error)
      this.metrics.failedRequests++

      if (this.config.fallback) {
        try {
          return this.config.fallback(error as Error) as T
        } catch (fallbackError) {
          throw error
        }
      }

      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0

    if (this.state === 'HALF_OPEN') {
      this.successCount++

      if (
        this.successCount >=
        (this.config.successThreshold || 2)
      ) {
        this.transitionTo('CLOSED')
      }
    } else if (this.state === 'CLOSED') {
      this.successCount = 0
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++
    this.lastFailureTime = new Date()
    this.metrics.consecutiveFailures = this.failureCount

    if (this.config.onFailure) {
      this.config.onFailure(error)
    }

    if (this.state === 'HALF_OPEN') {
      // Reopen circuit on any failure in HALF_OPEN state
      this.transitionTo('OPEN')
    } else if (
      this.state === 'CLOSED' &&
      this.failureCount >= (this.config.failureThreshold || 5)
    ) {
      this.transitionTo('OPEN')
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (newState !== this.state) {
      this.state = newState
      this.successCount = 0

      if (newState === 'OPEN') {
        this.failureCount = 0
      }

      this.lastStateChangeTime = new Date()

      if (this.config.onStateChange) {
        this.config.onStateChange(newState)
      }
    }
  }

  // Getters
  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics }
  }

  isOpen(): boolean {
    return this.state === 'OPEN'
  }

  isClosed(): boolean {
    return this.state === 'CLOSED'
  }

  isHalfOpen(): boolean {
    return this.state === 'HALF_OPEN'
  }

  // Manual control
  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
    this.metrics.consecutiveFailures = 0
    this.transitionTo('CLOSED')
  }

  forceOpen(): void {
    this.transitionTo('OPEN')
  }

  forceClosed(): void {
    this.transitionTo('CLOSED')
  }
}

/**
 * Circuit Breaker Pool - Manage multiple breakers
 */
export class CircuitBreakerPool {
  private breakers: Map<string, CircuitBreaker> = new Map()

  registerBreaker(
    name: string,
    config?: CircuitBreakerConfig
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(config)
    this.breakers.set(name, breaker)
    return breaker
  }

  getBreaker(name: string): CircuitBreaker {
    const breaker = this.breakers.get(name)
    if (!breaker) {
      throw new Error(`Circuit breaker not found: ${name}`)
    }
    return breaker
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const result: Record<string, CircuitBreakerMetrics> = {}
    this.breakers.forEach((breaker, name) => {
      result[name] = breaker.getMetrics()
    })
    return result
  }

  resetBreaker(name: string): void {
    this.getBreaker(name).reset()
  }

  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset())
  }
}

/**
 * Custom Error for Circuit Breaker OPEN state
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

// Global pool for convenience
const globalPool = new CircuitBreakerPool()

export function registerGlobalBreaker(
  name: string,
  config?: CircuitBreakerConfig
): CircuitBreaker {
  return globalPool.registerBreaker(name, config)
}

export function getGlobalBreaker(name: string): CircuitBreaker {
  return globalPool.getBreaker(name)
}

export function getGlobalPool(): CircuitBreakerPool {
  return globalPool
}
