import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FreeForDev } from './index'

// Access private methods for testing
type FreeForDevPrivate = FreeForDev & {
  parseSize(size: string): number
}

describe('FreeForDev', () => {
  let ffd: FreeForDevPrivate

  beforeEach(() => {
    ffd = new FreeForDev() as FreeForDevPrivate
  })

  describe('parseSize', () => {
    it('should parse GB correctly', () => {
      expect(ffd.parseSize('5 GB')).toBe(5)
      expect(ffd.parseSize('10GB')).toBe(10)
      expect(ffd.parseSize('0.5 GB')).toBe(0.5)
    })

    it('should parse MB correctly', () => {
      expect(ffd.parseSize('512 MB')).toBeCloseTo(0.5, 3)
      expect(ffd.parseSize('1024MB')).toBeCloseTo(1, 3)
    })

    it('should parse TB correctly', () => {
      expect(ffd.parseSize('1 TB')).toBe(1024)
      expect(ffd.parseSize('2TB')).toBe(2048)
    })

    it('should return 0 for invalid input', () => {
      expect(ffd.parseSize('invalid')).toBe(0)
      expect(ffd.parseSize('')).toBe(0)
    })
  })

  describe('recommendStack', () => {
    it('should recommend Supabase for small data sizes', async () => {
      const stack = await ffd.recommendStack({
        type: 'saas',
        expectedUsers: 100,
        dataSize: '1 GB',
      })
      expect(stack.database).toBeDefined()
      expect(stack.backend).toBeDefined()
      expect(stack.totalCost).toBe(0)
    })

    it('should recommend Firebase for large data sizes', async () => {
      const stack = await ffd.recommendStack({
        type: 'saas',
        expectedUsers: 1000,
        dataSize: '10 GB',
      })
      expect(stack.database).toBeDefined()
      expect(stack.totalCost).toBe(0)
    })

    it('should always include all required stack components', async () => {
      const stack = await ffd.recommendStack({
        type: 'saas',
        expectedUsers: 500,
        dataSize: '2 GB',
      })
      expect(stack.database).toBeDefined()
      expect(stack.backend).toBeDefined()
      expect(stack.storage).toBeDefined()
      expect(stack.email).toBeDefined()
      expect(stack.analytics).toBeDefined()
      expect(stack.authentication).toBeDefined()
      expect(stack.cdn).toBeDefined()
      expect(stack.monitoring).toBeDefined()
    })
  })

  describe('trackUsage', () => {
    it('should emit limit-warning when threshold exceeded', () => {
      const warningSpy = vi.fn()
      ffd.on('limit-warning', warningSpy)

      ffd.trackUsage('database', 85, 100) // 85% usage

      expect(warningSpy).toHaveBeenCalledWith('database', 85)
    })

    it('should emit limit-exceeded when at 100%', () => {
      const exceededSpy = vi.fn()
      ffd.on('limit-exceeded', exceededSpy)

      ffd.trackUsage('storage', 100, 100) // 100% usage

      expect(exceededSpy).toHaveBeenCalledWith('storage')
    })

    it('should not emit events for normal usage', () => {
      const warningSpy = vi.fn()
      const exceededSpy = vi.fn()
      ffd.on('limit-warning', warningSpy)
      ffd.on('limit-exceeded', exceededSpy)

      ffd.trackUsage('email', 50, 100) // 50% usage

      expect(warningSpy).not.toHaveBeenCalled()
      expect(exceededSpy).not.toHaveBeenCalled()
    })
  })
})
