import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeatureFlagManager, FeatureFlag, FeatureRule } from './index'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))

// Access private methods via type casting for testing
type FeatureFlagManagerPrivate = FeatureFlagManager & {
  hashUserId(userId: string): number
  evaluateRules(rules: FeatureRule[], userId: string, context?: Record<string, unknown>): boolean | null
}

describe('FeatureFlagManager', () => {
  let manager: FeatureFlagManagerPrivate

  beforeEach(() => {
    manager = new FeatureFlagManager() as FeatureFlagManagerPrivate
  })

  describe('hashUserId', () => {
    it('should return a non-negative integer', () => {
      const hash = manager.hashUserId('user-123')
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(hash)).toBe(true)
    })

    it('should return consistent results for the same input', () => {
      const hash1 = manager.hashUserId('user-abc')
      const hash2 = manager.hashUserId('user-abc')
      expect(hash1).toBe(hash2)
    })

    it('should return different hashes for different users', () => {
      const hash1 = manager.hashUserId('user-001')
      const hash2 = manager.hashUserId('user-002')
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', () => {
      const hash = manager.hashUserId('')
      expect(hash).toBe(0)
    })
  })

  describe('evaluateRules', () => {
    it('should return null when no rules match', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'user_id', value: 'user-999', action: 'enable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123')
      expect(result).toBeNull()
    })

    it('should enable when user_id rule matches', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'user_id', value: 'user-123', action: 'enable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123')
      expect(result).toBe(true)
    })

    it('should disable when user_id rule matches with disable action', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'user_id', value: 'user-123', action: 'disable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123')
      expect(result).toBe(false)
    })

    it('should match email rule with context', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'email', value: 'admin@example.com', action: 'enable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123', { email: 'admin@example.com' })
      expect(result).toBe(true)
    })

    it('should match plan rule with context', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'plan', value: 'enterprise', action: 'enable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123', { plan: 'enterprise' })
      expect(result).toBe(true)
    })

    it('should not match plan rule when plan differs', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'plan', value: 'enterprise', action: 'enable' },
      ]
      const result = manager.evaluateRules(rules, 'user-123', { plan: 'free' })
      expect(result).toBeNull()
    })

    it('should evaluate rules in order and return first match', () => {
      const rules: FeatureRule[] = [
        { id: 'r1', condition: 'user_id', value: 'user-123', action: 'disable' },
        { id: 'r2', condition: 'user_id', value: 'user-123', action: 'enable' },
      ]
      // First matching rule should win
      const result = manager.evaluateRules(rules, 'user-123')
      expect(result).toBe(false)
    })
  })

  describe('rollout percentage distribution', () => {
    it('should distribute users consistently based on hash', () => {
      // Test that the hash function distributes users across 0-99 range
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`)
      const hashes = userIds.map((id) => manager.hashUserId(id) % 100)

      // All hashes should be in valid range
      hashes.forEach((h) => {
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThan(100)
      })

      // Distribution should not be all the same value
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBeGreaterThan(10)
    })
  })
})
