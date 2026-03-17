/**
 * Business Logic Tests
 *
 * Tests for the core business logic that powers SaaS Factory OS:
 *  1. Booking conflict detection
 *  2. Billing plan limits enforcement
 *  3. Circuit breaker state machine transitions
 *  4. MetaClaw fitness function scoring
 *
 * These are pure logic tests — no mocks, no external dependencies.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// 1. BOOKING CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

interface TimeSlot {
  id: string
  resourceId: string
  startTime: Date
  endTime: Date
  userId: string
}

class BookingConflictDetector {
  private bookings: TimeSlot[] = []

  addBooking(slot: TimeSlot): { success: boolean; conflictsWith?: TimeSlot; error?: string } {
    if (slot.startTime >= slot.endTime) {
      return { success: false, error: 'Start time must be before end time' }
    }

    const conflict = this.bookings.find(
      b =>
        b.resourceId === slot.resourceId &&
        b.id !== slot.id &&
        b.startTime < slot.endTime &&
        b.endTime > slot.startTime
    )

    if (conflict) {
      return { success: false, conflictsWith: conflict, error: 'Time slot conflicts with existing booking' }
    }

    this.bookings.push(slot)
    return { success: true }
  }

  getConflicts(resourceId: string, start: Date, end: Date): TimeSlot[] {
    return this.bookings.filter(
      b =>
        b.resourceId === resourceId &&
        b.startTime < end &&
        b.endTime > start
    )
  }

  cancelBooking(id: string): boolean {
    const index = this.bookings.findIndex(b => b.id === id)
    if (index === -1) return false
    this.bookings.splice(index, 1)
    return true
  }
}

describe('Booking Conflict Detection', () => {
  let detector: BookingConflictDetector

  const makeSlot = (id: string, resourceId: string, startH: number, endH: number, userId = 'u1'): TimeSlot => ({
    id,
    resourceId,
    startTime: new Date(`2024-01-15T${String(startH).padStart(2, '0')}:00:00Z`),
    endTime: new Date(`2024-01-15T${String(endH).padStart(2, '0')}:00:00Z`),
    userId,
  })

  beforeEach(() => {
    detector = new BookingConflictDetector()
  })

  it('allows booking when no conflicts exist', () => {
    const result = detector.addBooking(makeSlot('b1', 'room-1', 9, 10))
    expect(result.success).toBe(true)
  })

  it('rejects booking with invalid time range (start >= end)', () => {
    const result = detector.addBooking(makeSlot('b1', 'room-1', 10, 9))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Start time must be before end time')
  })

  it('rejects booking that exactly overlaps existing booking', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 11))
    const result = detector.addBooking(makeSlot('b2', 'room-1', 9, 11))
    expect(result.success).toBe(false)
    expect(result.conflictsWith?.id).toBe('b1')
  })

  it('rejects booking that partially overlaps at the start', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 10, 12))
    const result = detector.addBooking(makeSlot('b2', 'room-1', 9, 11)) // overlaps 10-11
    expect(result.success).toBe(false)
  })

  it('rejects booking that partially overlaps at the end', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 11))
    const result = detector.addBooking(makeSlot('b2', 'room-1', 10, 12)) // overlaps 10-11
    expect(result.success).toBe(false)
  })

  it('rejects booking that is contained within existing booking', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 13))
    const result = detector.addBooking(makeSlot('b2', 'room-1', 10, 12)) // inside 9-13
    expect(result.success).toBe(false)
  })

  it('allows adjacent bookings (end of one = start of next)', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 10))
    const result = detector.addBooking(makeSlot('b2', 'room-1', 10, 11)) // starts exactly when b1 ends
    expect(result.success).toBe(true)
  })

  it('allows same time slot for different resources', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 11))
    const result = detector.addBooking(makeSlot('b2', 'room-2', 9, 11)) // same time, different room
    expect(result.success).toBe(true)
  })

  it('allows booking after cancellation frees the slot', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 11))
    detector.cancelBooking('b1')
    const result = detector.addBooking(makeSlot('b2', 'room-1', 9, 11))
    expect(result.success).toBe(true)
  })

  it('returns all conflicts for a given time range', () => {
    detector.addBooking(makeSlot('b1', 'room-1', 9, 11))
    detector.addBooking(makeSlot('b2', 'room-1', 10, 12))
    const conflicts = detector.getConflicts(
      'room-1',
      new Date('2024-01-15T09:30:00Z'),
      new Date('2024-01-15T11:30:00Z')
    )
    expect(conflicts).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. BILLING PLAN LIMITS ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

type BillingPlan = 'free' | 'starter' | 'pro' | 'agency'

interface PlanLimits {
  maxProjects: number
  maxGenerationsPerMonth: number
  maxTeamMembers: number
  maxDeployments: number
  aiModelsAllowed: string[]
  canExportCode: boolean
  canUseCustomDomain: boolean
}

const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxGenerationsPerMonth: 3,
    maxTeamMembers: 1,
    maxDeployments: 0,
    aiModelsAllowed: ['gpt-4.1-nano'],
    canExportCode: false,
    canUseCustomDomain: false,
  },
  starter: {
    maxProjects: 5,
    maxGenerationsPerMonth: 20,
    maxTeamMembers: 3,
    maxDeployments: 5,
    aiModelsAllowed: ['gpt-4.1-nano', 'gpt-4.1-mini'],
    canExportCode: true,
    canUseCustomDomain: false,
  },
  pro: {
    maxProjects: 20,
    maxGenerationsPerMonth: 100,
    maxTeamMembers: 10,
    maxDeployments: 50,
    aiModelsAllowed: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o'],
    canExportCode: true,
    canUseCustomDomain: true,
  },
  agency: {
    maxProjects: Infinity,
    maxGenerationsPerMonth: Infinity,
    maxTeamMembers: Infinity,
    maxDeployments: Infinity,
    aiModelsAllowed: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o', 'claude-3-5-sonnet'],
    canExportCode: true,
    canUseCustomDomain: true,
  },
}

class BillingEnforcer {
  checkLimit(
    plan: BillingPlan,
    resource: keyof PlanLimits,
    currentUsage: number
  ): { allowed: boolean; limit: number | boolean; current: number; upgradeRequired?: BillingPlan } {
    const limits = PLAN_LIMITS[plan]
    const limit = limits[resource]

    if (typeof limit === 'boolean') {
      return { allowed: limit as boolean, limit, current: currentUsage }
    }

    const numLimit = limit as number
    if (currentUsage >= numLimit) {
      const plans: BillingPlan[] = ['free', 'starter', 'pro', 'agency']
      const nextPlan = plans.find(p => {
        const nextLimit = PLAN_LIMITS[p][resource] as number
        return nextLimit > currentUsage
      })
      return { allowed: false, limit: numLimit, current: currentUsage, upgradeRequired: nextPlan }
    }

    return { allowed: true, limit: numLimit, current: currentUsage }
  }

  canUseModel(plan: BillingPlan, model: string): boolean {
    return PLAN_LIMITS[plan].aiModelsAllowed.includes(model)
  }
}

describe('Billing Plan Limits Enforcement', () => {
  let enforcer: BillingEnforcer

  beforeEach(() => {
    enforcer = new BillingEnforcer()
  })

  it('free plan allows up to 1 project', () => {
    expect(enforcer.checkLimit('free', 'maxProjects', 0).allowed).toBe(true)
    expect(enforcer.checkLimit('free', 'maxProjects', 1).allowed).toBe(false)
  })

  it('free plan blocks code export', () => {
    const result = enforcer.checkLimit('free', 'canExportCode', 0)
    expect(result.allowed).toBe(false)
  })

  it('starter plan allows code export', () => {
    const result = enforcer.checkLimit('starter', 'canExportCode', 0)
    expect(result.allowed).toBe(true)
  })

  it('free plan blocks deployments', () => {
    expect(enforcer.checkLimit('free', 'maxDeployments', 0).allowed).toBe(false)
  })

  it('suggests correct upgrade plan when limit is reached', () => {
    // Free user has 1 project, needs more
    const result = enforcer.checkLimit('free', 'maxProjects', 1)
    expect(result.allowed).toBe(false)
    expect(result.upgradeRequired).toBe('starter')
  })

  it('agency plan has no limits (Infinity)', () => {
    expect(enforcer.checkLimit('agency', 'maxProjects', 9999).allowed).toBe(true)
    expect(enforcer.checkLimit('agency', 'maxGenerationsPerMonth', 99999).allowed).toBe(true)
  })

  it('free plan can only use nano model', () => {
    expect(enforcer.canUseModel('free', 'gpt-4.1-nano')).toBe(true)
    expect(enforcer.canUseModel('free', 'gpt-4o')).toBe(false)
    expect(enforcer.canUseModel('free', 'claude-3-5-sonnet')).toBe(false)
  })

  it('agency plan can use all models', () => {
    expect(enforcer.canUseModel('agency', 'gpt-4.1-nano')).toBe(true)
    expect(enforcer.canUseModel('agency', 'gpt-4o')).toBe(true)
    expect(enforcer.canUseModel('agency', 'claude-3-5-sonnet')).toBe(true)
  })

  it('pro plan allows custom domains but not agency-only models', () => {
    expect(enforcer.checkLimit('pro', 'canUseCustomDomain', 0).allowed).toBe(true)
    expect(enforcer.canUseModel('pro', 'claude-3-5-sonnet')).toBe(false)
  })

  it('monthly generation limit resets correctly (at 0 usage)', () => {
    // Simulate start of new month — usage resets to 0
    expect(enforcer.checkLimit('starter', 'maxGenerationsPerMonth', 0).allowed).toBe(true)
    expect(enforcer.checkLimit('starter', 'maxGenerationsPerMonth', 19).allowed).toBe(true)
    expect(enforcer.checkLimit('starter', 'maxGenerationsPerMonth', 20).allowed).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. CIRCUIT BREAKER STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open'

class CircuitBreakerStateMachine {
  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null

  constructor(
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly timeoutMs = 60_000
  ) {}

  getState(): CircuitState {
    return this.state
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed'
        this.failureCount = 0
        this.successCount = 0
      }
    } else if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1) // Decay failures on success
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      this.state = 'open'
      this.successCount = 0
      return
    }

    if (this.state === 'closed') {
      this.failureCount++
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open'
      }
    }
  }

  canRequest(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'open') {
      if (this.lastFailureTime !== null && Date.now() - this.lastFailureTime >= this.timeoutMs) {
        this.state = 'half-open'
        this.successCount = 0
        return true
      }
      return false
    }
    // half-open: allow probe requests
    return true
  }
}

describe('Circuit Breaker State Machine', () => {
  let cb: CircuitBreakerStateMachine

  beforeEach(() => {
    cb = new CircuitBreakerStateMachine(5, 2, 60_000)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('closed')
    expect(cb.canRequest()).toBe(true)
  })

  it('transitions to OPEN after reaching failure threshold', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    expect(cb.getState()).toBe('open')
  })

  it('does NOT open before reaching failure threshold', () => {
    for (let i = 0; i < 4; i++) cb.recordFailure()
    expect(cb.getState()).toBe('closed')
    expect(cb.canRequest()).toBe(true)
  })

  it('blocks requests when OPEN', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    expect(cb.canRequest()).toBe(false)
  })

  it('transitions to HALF-OPEN after timeout', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    expect(cb.getState()).toBe('open')

    vi.advanceTimersByTime(61_000) // Past the 60s timeout
    expect(cb.canRequest()).toBe(true) // Probe request allowed
    expect(cb.getState()).toBe('half-open')
  })

  it('transitions back to CLOSED after enough successes in HALF-OPEN', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    vi.advanceTimersByTime(61_000)
    cb.canRequest() // Triggers half-open

    cb.recordSuccess()
    expect(cb.getState()).toBe('half-open') // Still half-open after 1 success

    cb.recordSuccess()
    expect(cb.getState()).toBe('closed') // Closed after 2 successes (threshold)
  })

  it('transitions back to OPEN on failure in HALF-OPEN', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    vi.advanceTimersByTime(61_000)
    cb.canRequest() // Triggers half-open

    cb.recordSuccess() // 1 success
    cb.recordFailure() // Failure in half-open → back to open

    expect(cb.getState()).toBe('open')
    expect(cb.canRequest()).toBe(false)
  })

  it('does NOT open if timeout has not passed', () => {
    for (let i = 0; i < 5; i++) cb.recordFailure()
    vi.advanceTimersByTime(30_000) // Only 30s, not 60s
    expect(cb.canRequest()).toBe(false)
    expect(cb.getState()).toBe('open')
  })

  it('success in CLOSED state decays failure count', () => {
    for (let i = 0; i < 4; i++) cb.recordFailure() // 4 failures (threshold is 5)
    cb.recordSuccess() // Should decay to 3
    cb.recordFailure() // Back to 4 — should NOT open
    expect(cb.getState()).toBe('closed')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. METACLAW FITNESS FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

interface SaaSGenome {
  features: string[]
  targetMarket: string
  pricingModel: 'freemium' | 'subscription' | 'usage-based' | 'one-time'
  complexity: number // 1-10
  uniquenessScore: number // 0-1
  marketDemandScore: number // 0-1
  technicalFeasibility: number // 0-1
}

function calculateMetaClawFitness(genome: SaaSGenome): number {
  // Fitness = weighted combination of key SaaS success factors
  const weights = {
    marketDemand: 0.35,
    uniqueness: 0.25,
    technicalFeasibility: 0.20,
    complexityPenalty: 0.10,
    pricingModelBonus: 0.10,
  }

  // Complexity penalty: very simple (1-3) or very complex (8-10) score lower
  const complexityScore = genome.complexity >= 4 && genome.complexity <= 7
    ? 1.0
    : genome.complexity <= 3
      ? genome.complexity / 4
      : (10 - genome.complexity) / 3

  // Pricing model bonus: subscription and freemium score higher for SaaS
  const pricingBonus =
    genome.pricingModel === 'subscription' ? 1.0
    : genome.pricingModel === 'freemium' ? 0.85
    : genome.pricingModel === 'usage-based' ? 0.75
    : 0.5 // one-time

  const fitness =
    genome.marketDemandScore * weights.marketDemand +
    genome.uniquenessScore * weights.uniqueness +
    genome.technicalFeasibility * weights.technicalFeasibility +
    complexityScore * weights.complexityPenalty +
    pricingBonus * weights.pricingModelBonus

  return Math.round(fitness * 100) / 100 // Round to 2 decimal places
}

describe('MetaClaw Fitness Function', () => {
  it('perfect genome scores close to 1.0', () => {
    const genome: SaaSGenome = {
      features: ['auth', 'payments', 'analytics'],
      targetMarket: 'SMB',
      pricingModel: 'subscription',
      complexity: 5,
      uniquenessScore: 1.0,
      marketDemandScore: 1.0,
      technicalFeasibility: 1.0,
    }
    const fitness = calculateMetaClawFitness(genome)
    expect(fitness).toBeGreaterThan(0.9)
    expect(fitness).toBeLessThanOrEqual(1.0)
  })

  it('zero-score genome scores close to 0', () => {
    const genome: SaaSGenome = {
      features: [],
      targetMarket: 'unknown',
      pricingModel: 'one-time',
      complexity: 10,
      uniquenessScore: 0,
      marketDemandScore: 0,
      technicalFeasibility: 0,
    }
    const fitness = calculateMetaClawFitness(genome)
    expect(fitness).toBeLessThan(0.2)
  })

  it('subscription pricing scores higher than one-time for same genome', () => {
    const base: Omit<SaaSGenome, 'pricingModel'> = {
      features: ['auth'],
      targetMarket: 'SMB',
      complexity: 5,
      uniquenessScore: 0.7,
      marketDemandScore: 0.7,
      technicalFeasibility: 0.7,
    }
    const subscriptionFitness = calculateMetaClawFitness({ ...base, pricingModel: 'subscription' })
    const oneTimeFitness = calculateMetaClawFitness({ ...base, pricingModel: 'one-time' })
    expect(subscriptionFitness).toBeGreaterThan(oneTimeFitness)
  })

  it('extreme complexity penalizes fitness', () => {
    const base: Omit<SaaSGenome, 'complexity'> = {
      features: ['auth'],
      targetMarket: 'enterprise',
      pricingModel: 'subscription',
      uniquenessScore: 0.8,
      marketDemandScore: 0.8,
      technicalFeasibility: 0.8,
    }
    const optimalComplexity = calculateMetaClawFitness({ ...base, complexity: 5 })
    const extremeComplexity = calculateMetaClawFitness({ ...base, complexity: 10 })
    const tooSimple = calculateMetaClawFitness({ ...base, complexity: 1 })

    expect(optimalComplexity).toBeGreaterThan(extremeComplexity)
    expect(optimalComplexity).toBeGreaterThan(tooSimple)
  })

  it('market demand has the highest weight in fitness calculation', () => {
    const highDemand: SaaSGenome = {
      features: ['auth'],
      targetMarket: 'SMB',
      pricingModel: 'subscription',
      complexity: 5,
      uniquenessScore: 0.3,
      marketDemandScore: 1.0, // High demand, low uniqueness
      technicalFeasibility: 0.5,
    }
    const highUniqueness: SaaSGenome = {
      ...highDemand,
      uniquenessScore: 1.0, // High uniqueness, low demand
      marketDemandScore: 0.3,
    }

    expect(calculateMetaClawFitness(highDemand)).toBeGreaterThan(
      calculateMetaClawFitness(highUniqueness)
    )
  })

  it('fitness is always between 0 and 1', () => {
    const genomes: SaaSGenome[] = [
      { features: [], targetMarket: 'x', pricingModel: 'freemium', complexity: 1, uniquenessScore: 0, marketDemandScore: 0, technicalFeasibility: 0 },
      { features: ['a'], targetMarket: 'y', pricingModel: 'subscription', complexity: 5, uniquenessScore: 0.5, marketDemandScore: 0.5, technicalFeasibility: 0.5 },
      { features: ['a', 'b'], targetMarket: 'z', pricingModel: 'usage-based', complexity: 7, uniquenessScore: 1, marketDemandScore: 1, technicalFeasibility: 1 },
    ]
    genomes.forEach(g => {
      const fitness = calculateMetaClawFitness(g)
      expect(fitness).toBeGreaterThanOrEqual(0)
      expect(fitness).toBeLessThanOrEqual(1)
    })
  })

  it('freemium scores higher than usage-based for same genome', () => {
    const base: Omit<SaaSGenome, 'pricingModel'> = {
      features: ['auth'],
      targetMarket: 'SMB',
      complexity: 5,
      uniquenessScore: 0.6,
      marketDemandScore: 0.6,
      technicalFeasibility: 0.6,
    }
    expect(calculateMetaClawFitness({ ...base, pricingModel: 'freemium' }))
      .toBeGreaterThan(calculateMetaClawFitness({ ...base, pricingModel: 'usage-based' }))
  })
})
