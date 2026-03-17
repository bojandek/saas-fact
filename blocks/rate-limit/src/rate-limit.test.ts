import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, InMemoryStore, createRateLimiter } from './index'

describe('RateLimiter', () => {
  let store: InMemoryStore
  let limiter: RateLimiter

  beforeEach(() => {
    store = new InMemoryStore()
    limiter = new RateLimiter({ limit: 3, window: 60, prefix: 'test' }, store)
  })

  describe('checkByIdentifier', () => {
    it('should allow requests within limit', async () => {
      const result = await limiter.checkByIdentifier('user-1')
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(2)
      expect(result.limit).toBe(3)
    })

    it('should decrement remaining on each request', async () => {
      await limiter.checkByIdentifier('user-2')
      const result = await limiter.checkByIdentifier('user-2')
      expect(result.remaining).toBe(1)
    })

    it('should block requests exceeding the limit', async () => {
      await limiter.checkByIdentifier('user-3')
      await limiter.checkByIdentifier('user-3')
      await limiter.checkByIdentifier('user-3')
      const result = await limiter.checkByIdentifier('user-3')
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should track different identifiers independently', async () => {
      await limiter.checkByIdentifier('user-a')
      await limiter.checkByIdentifier('user-a')
      const resultA = await limiter.checkByIdentifier('user-a')
      const resultB = await limiter.checkByIdentifier('user-b')

      expect(resultA.remaining).toBe(0)
      expect(resultB.remaining).toBe(2)
    })
  })

  describe('toHeaders', () => {
    it('should generate correct rate limit headers', async () => {
      const result = await limiter.checkByIdentifier('header-test')
      const headers = RateLimiter.toHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('3')
      expect(headers['X-RateLimit-Remaining']).toBe('2')
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should include Retry-After header when blocked', async () => {
      await limiter.checkByIdentifier('blocked-user')
      await limiter.checkByIdentifier('blocked-user')
      await limiter.checkByIdentifier('blocked-user')
      const result = await limiter.checkByIdentifier('blocked-user')
      const headers = RateLimiter.toHeaders(result)

      expect(headers['Retry-After']).toBeDefined()
    })
  })

  describe('createRateLimiter factory', () => {
    it('should create a limiter with correct config', async () => {
      const customLimiter = createRateLimiter({ limit: 5, window: 30 }, store)
      const result = await customLimiter.checkByIdentifier('factory-test')
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
    })
  })
})
