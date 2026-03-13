import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CircuitBreaker,
  CircuitBreakerPool,
  CircuitBreakerOpenError,
} from './index'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
    })
  })

  describe('CLOSED state', () => {
    it('should execute successful operations', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledOnce()
      expect(breaker.isClosed()).toBe(true)
    })

    it('should allow operations to fail individually', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(breaker.execute(fn)).rejects.toThrow('fail')
      expect(breaker.isClosed()).toBe(true)
    })

    it('should transition to OPEN after threshold failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow()
      }

      expect(breaker.isOpen()).toBe(true)
    })
  })

  describe('OPEN state', () => {
    it('should reject operations immediately', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow()
      }

      expect(breaker.isOpen()).toBe(true)

      const newFn = vi.fn().mockResolvedValue('success')
      await expect(breaker.execute(newFn)).rejects.toThrow(
        CircuitBreakerOpenError
      )
    })

    it('should transition to HALF_OPEN after timeout', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow()
      }

      expect(breaker.isOpen()).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      const successFn = vi.fn().mockResolvedValue('success')
      const result = await breaker.execute(successFn)

      expect(result).toBe('success')
      expect(breaker.isHalfOpen()).toBe(true)
    })

    it('should use fallback when available', async () => {
      const fallback = vi.fn().mockResolvedValue('fallback_result')
      const breaker2 = new CircuitBreaker({
        failureThreshold: 2,
        fallback,
      })

      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(breaker2.execute(fn)).rejects.toThrow()
      await expect(breaker2.execute(fn)).rejects.toThrow()

      const result = await breaker2.execute(fn)
      expect(result).toBe('fallback_result')
      expect(fallback).toHaveBeenCalled()
    })
  })

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow()
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    it('should transition to CLOSED after success threshold', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      await breaker.execute(fn)
      expect(breaker.isHalfOpen()).toBe(true)

      await breaker.execute(fn)
      expect(breaker.isClosed()).toBe(true)
    })

    it('should transition back to OPEN on failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(breaker.execute(fn)).rejects.toThrow()
      expect(breaker.isOpen()).toBe(true)
    })
  })

  describe('Metrics', () => {
    it('should track metrics correctly', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success')

      await breaker.execute(fn)
      await expect(breaker.execute(fn)).rejects.toThrow()
      await breaker.execute(fn)

      const metrics = breaker.getMetrics()
      expect(metrics.totalRequests).toBe(3)
      expect(metrics.successfulRequests).toBe(2)
      expect(metrics.failedRequests).toBe(1)
    })
  })

  describe('Manual control', () => {
    it('should allow manual state control', () => {
      breaker.forceOpen()
      expect(breaker.isOpen()).toBe(true)

      breaker.forceClosed()
      expect(breaker.isClosed()).toBe(true)
    })

    it('should reset state and metrics', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow()
      }

      expect(breaker.isOpen()).toBe(true)

      breaker.reset()
      expect(breaker.isClosed()).toBe(true)
      expect(breaker.getMetrics().failedRequests).toBe(0)
    })
  })
})

describe('CircuitBreakerPool', () => {
  it('should manage multiple breakers', () => {
    const pool = new CircuitBreakerPool()

    const breaker1 = pool.registerBreaker('api', {
      failureThreshold: 3,
    })
    const breaker2 = pool.registerBreaker('db', {
      failureThreshold: 5,
    })

    expect(pool.getBreaker('api')).toBe(breaker1)
    expect(pool.getBreaker('db')).toBe(breaker2)
  })

  it('should get all metrics', () => {
    const pool = new CircuitBreakerPool()
    pool.registerBreaker('api')
    pool.registerBreaker('db')

    const metrics = pool.getAllMetrics()
    expect(metrics).toHaveProperty('api')
    expect(metrics).toHaveProperty('db')
  })
})
