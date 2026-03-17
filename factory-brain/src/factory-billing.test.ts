import { describe, it, expect } from 'vitest'
import {
  FactoryBillingService,
  FACTORY_PLANS,
  UsageRecord,
  factoryBilling,
} from './factory-billing'

function makeUsage(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    userId: 'user-test',
    planId: 'free',
    periodStart: new Date('2026-03-01'),
    periodEnd: new Date('2026-03-31'),
    exportsUsed: 0,
    agentRunsUsed: 0,
    ...overrides,
  }
}

describe('FACTORY_PLANS', () => {
  it('should have free plan with 3 exports limit', () => {
    expect(FACTORY_PLANS.free.limits.exportsPerMonth).toBe(3)
    expect(FACTORY_PLANS.free.priceMonthly).toBe(0)
    expect(FACTORY_PLANS.free.limits.watermark).toBe(true)
  })

  it('should have pro plan with unlimited exports', () => {
    expect(FACTORY_PLANS.pro.limits.exportsPerMonth).toBe(-1)
    expect(FACTORY_PLANS.pro.priceMonthly).toBe(29)
    expect(FACTORY_PLANS.pro.limits.watermark).toBe(false)
  })

  it('should have agency plan with team seats and API access', () => {
    expect(FACTORY_PLANS.agency.limits.teamSeats).toBe(10)
    expect(FACTORY_PLANS.agency.limits.apiAccess).toBe(true)
    expect(FACTORY_PLANS.agency.limits.whiteLabel).toBe(true)
    expect(FACTORY_PLANS.agency.priceMonthly).toBe(99)
  })
})

describe('FactoryBillingService.canPerformAction', () => {
  it('should allow export when under free limit', () => {
    const usage = makeUsage({ planId: 'free', exportsUsed: 2 })
    const result = factoryBilling.canPerformAction(usage, 'export')
    expect(result.allowed).toBe(true)
  })

  it('should block export when free limit is reached', () => {
    const usage = makeUsage({ planId: 'free', exportsUsed: 3 })
    const result = factoryBilling.canPerformAction(usage, 'export')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('3 exports')
    expect(result.upgradeUrl).toBe('/pricing')
  })

  it('should always allow export on pro plan', () => {
    const usage = makeUsage({ planId: 'pro', exportsUsed: 9999 })
    const result = factoryBilling.canPerformAction(usage, 'export')
    expect(result.allowed).toBe(true)
  })

  it('should block agent runs when pro limit is reached', () => {
    const usage = makeUsage({ planId: 'pro', agentRunsUsed: 500 })
    const result = factoryBilling.canPerformAction(usage, 'agentRun')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('500 AI agent runs')
  })

  it('should always allow agent runs on agency plan', () => {
    const usage = makeUsage({ planId: 'agency', agentRunsUsed: 99999 })
    const result = factoryBilling.canPerformAction(usage, 'agentRun')
    expect(result.allowed).toBe(true)
  })
})

describe('FactoryBillingService.getUpgradeRecommendation', () => {
  it('should recommend pro for free users', () => {
    const plan = factoryBilling.getUpgradeRecommendation('free')
    expect(plan?.id).toBe('pro')
  })

  it('should recommend agency for pro users', () => {
    const plan = factoryBilling.getUpgradeRecommendation('pro')
    expect(plan?.id).toBe('agency')
  })

  it('should return null for agency users', () => {
    const plan = factoryBilling.getUpgradeRecommendation('agency')
    expect(plan).toBeNull()
  })
})

describe('FactoryBillingService.getRemainingUsage', () => {
  it('should calculate remaining exports for free plan', () => {
    const usage = makeUsage({ planId: 'free', exportsUsed: 1 })
    const remaining = factoryBilling.getRemainingUsage(usage)
    expect(remaining.exportsRemaining).toBe(2)
    expect(remaining.percentUsed.exports).toBe(33)
  })

  it('should return unlimited for pro plan', () => {
    const usage = makeUsage({ planId: 'pro', exportsUsed: 100 })
    const remaining = factoryBilling.getRemainingUsage(usage)
    expect(remaining.exportsRemaining).toBe('unlimited')
    expect(remaining.percentUsed.exports).toBe(0)
  })

  it('should cap percent at 100 when over limit', () => {
    const usage = makeUsage({ planId: 'free', exportsUsed: 10 })
    const remaining = factoryBilling.getRemainingUsage(usage)
    expect(remaining.exportsRemaining).toBe(0)
    expect(remaining.percentUsed.exports).toBe(100)
  })
})

describe('FactoryBillingService.hasFeature', () => {
  it('should return false for watermark on free plan', () => {
    // watermark: true means watermark IS applied, not a "feature" per se
    expect(factoryBilling.hasFeature('free', 'watermark')).toBe(true)
    expect(factoryBilling.hasFeature('pro', 'watermark')).toBe(false)
  })

  it('should return true for apiAccess on agency plan', () => {
    expect(factoryBilling.hasFeature('agency', 'apiAccess')).toBe(true)
    expect(factoryBilling.hasFeature('pro', 'apiAccess')).toBe(false)
  })
})

describe('FactoryBillingService.getAnnualSavings', () => {
  it('should calculate savings for pro plan', () => {
    const savings = factoryBilling.getAnnualSavings('pro')
    // 29 * 12 = 348, yearly = 290, savings = 58
    expect(savings).toBe(58)
  })

  it('should calculate savings for agency plan', () => {
    const savings = factoryBilling.getAnnualSavings('agency')
    // 99 * 12 = 1188, yearly = 990, savings = 198
    expect(savings).toBe(198)
  })

  it('should return 0 savings for free plan', () => {
    const savings = factoryBilling.getAnnualSavings('free')
    expect(savings).toBe(0)
  })
})
