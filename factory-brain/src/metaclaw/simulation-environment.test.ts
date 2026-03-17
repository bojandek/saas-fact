import { describe, it, expect } from 'vitest'
import { simulateFitness, compareGenomes, evaluatePopulation } from './simulation-environment'
import { SaaSGenome } from './types'

// Helper to create a minimal valid SaaSGenome
function createGenome(overrides: Partial<SaaSGenome> = {}): SaaSGenome {
  return {
    id: `genome-${Math.random().toString(36).slice(2, 8)}`,
    appName: 'Test SaaS',
    version: 1,
    architecture: {
      techStack: ['Next.js', 'PostgreSQL', 'Redis'],
      apiStyle: 'REST',
      databasePattern: 'Monolith',
      cachingStrategy: 'Redis',
      messageQueue: 'None',
    },
    features: {
      enabled: ['auth', 'billing', 'analytics', 'notifications', 'dashboard'],
      versions: {},
      experiments: [],
    },
    performance: {
      cachePolicy: { ttl: 3600, strategy: 'LRU', maxSize: 1000 } as never,
      rateLimits: [],
      dbIndices: ['user_id', 'tenant_id', 'created_at'],
      asyncJobs: [],
      cdn: true,
      edgeComputing: false,
    },
    monetization: {
      pricingModel: 'Freemium',
      tierConfig: [],
      paymentGateway: 'Stripe',
      trialDays: 14,
    },
    ux: {
      components: {} as never,
      workflows: [],
      designSystem: {} as never,
      mobileOptimized: true,
    },
    fitness: {
      performance: 0,
      userSatisfaction: 0,
      costEfficiency: 0,
      featureCompleteness: 0,
      innovationIndex: 0,
      overall: 0,
    },
    createdAt: new Date(),
    generation: 0,
    ...overrides,
  }
}

describe('simulateFitness', () => {
  it('should return a fitness score with all required fields', () => {
    const genome = createGenome()
    const result = simulateFitness(genome)

    expect(result.fitness.performance).toBeGreaterThanOrEqual(0)
    expect(result.fitness.performance).toBeLessThanOrEqual(100)
    expect(result.fitness.userSatisfaction).toBeGreaterThanOrEqual(0)
    expect(result.fitness.costEfficiency).toBeGreaterThanOrEqual(0)
    expect(result.fitness.featureCompleteness).toBeGreaterThanOrEqual(0)
    expect(result.fitness.innovationIndex).toBeGreaterThanOrEqual(0)
    expect(result.fitness.overall).toBeGreaterThan(0)
  })

  it('should return deterministic results for the same genome', () => {
    const genome = createGenome()
    const result1 = simulateFitness(genome)
    const result2 = simulateFitness(genome)

    // Core scores should be deterministic (excluding NPS which has small random component)
    expect(result1.fitness.performance).toBe(result2.fitness.performance)
    expect(result1.fitness.costEfficiency).toBe(result2.fitness.costEfficiency)
    expect(result1.fitness.featureCompleteness).toBe(result2.fitness.featureCompleteness)
  })

  it('should give higher performance score to genome with CDN and edge computing', () => {
    const withCDN = createGenome({
      performance: {
        cachePolicy: {} as never,
        rateLimits: [],
        dbIndices: ['user_id', 'tenant_id', 'created_at'],
        asyncJobs: [],
        cdn: true,
        edgeComputing: true,
      },
    })
    const withoutCDN = createGenome({
      performance: {
        cachePolicy: {} as never,
        rateLimits: [],
        dbIndices: ['user_id', 'tenant_id', 'created_at'],
        asyncJobs: [],
        cdn: false,
        edgeComputing: false,
      },
    })

    const resultWith = simulateFitness(withCDN)
    const resultWithout = simulateFitness(withoutCDN)

    expect(resultWith.fitness.performance).toBeGreaterThan(resultWithout.fitness.performance)
  })

  it('should warn about missing database indices', () => {
    const genome = createGenome({
      performance: {
        cachePolicy: {} as never,
        rateLimits: [],
        dbIndices: [], // No indices
        asyncJobs: [],
        cdn: false,
        edgeComputing: false,
      },
    })
    const result = simulateFitness(genome)

    expect(result.warnings.some((w) => w.includes('indices'))).toBe(true)
    expect(result.recommendations.some((r) => r.includes('indices'))).toBe(true)
  })

  it('should warn about missing mobile optimization for B2C', () => {
    const genome = createGenome({
      ux: {
        components: {} as never,
        workflows: [],
        designSystem: {} as never,
        mobileOptimized: false,
      },
    })
    const result = simulateFitness(genome, {
      marketSegment: 'b2c',
      expectedMAU: 5000,
      competitionLevel: 0.7,
      budgetLevel: 0.5,
    })

    expect(result.warnings.some((w) => w.toLowerCase().includes('mobile'))).toBe(true)
  })

  it('should give higher cost efficiency to Serverless vs Microservices', () => {
    const serverless = createGenome({
      architecture: {
        techStack: ['Next.js', 'PostgreSQL'],
        apiStyle: 'REST',
        databasePattern: 'ServerlessDB',
        cachingStrategy: 'CDN',
        messageQueue: 'None',
      },
    })
    const microservices = createGenome({
      architecture: {
        techStack: ['Next.js', 'PostgreSQL'],
        apiStyle: 'REST',
        databasePattern: 'Microservices',
        cachingStrategy: 'CDN',
        messageQueue: 'Kafka',
      },
    })

    const serverlessResult = simulateFitness(serverless)
    const microservicesResult = simulateFitness(microservices)

    expect(serverlessResult.fitness.costEfficiency).toBeGreaterThan(
      microservicesResult.fitness.costEfficiency
    )
  })

  it('should include estimated metrics', () => {
    const genome = createGenome()
    const result = simulateFitness(genome)

    expect(result.metrics.estimatedPageLoadMs).toBeGreaterThan(0)
    expect(result.metrics.estimatedMonthlyCostUSD).toBeGreaterThan(0)
    expect(result.metrics.estimatedConversionRate).toBeGreaterThan(0)
    expect(result.metrics.estimatedConversionRate).toBeLessThanOrEqual(0.25)
    expect(result.metrics.estimatedChurnRate).toBeGreaterThan(0)
    expect(result.metrics.featureCoverage).toBeGreaterThanOrEqual(0)
    expect(result.metrics.featureCoverage).toBeLessThanOrEqual(100)
  })
})

describe('compareGenomes', () => {
  it('should return the genome with higher fitness as winner', () => {
    const strong = createGenome({
      performance: {
        cachePolicy: {} as never,
        rateLimits: [],
        dbIndices: ['user_id', 'tenant_id', 'created_at', 'email'],
        asyncJobs: [],
        cdn: true,
        edgeComputing: true,
      },
      ux: {
        components: {} as never,
        workflows: [],
        designSystem: {} as never,
        mobileOptimized: true,
      },
    })
    const weak = createGenome({
      performance: {
        cachePolicy: {} as never,
        rateLimits: [],
        dbIndices: [],
        asyncJobs: [],
        cdn: false,
        edgeComputing: false,
      },
      ux: {
        components: {} as never,
        workflows: [],
        designSystem: {} as never,
        mobileOptimized: false,
      },
    })

    const { winner, loser } = compareGenomes(strong, weak)
    expect(winner.id).toBe(strong.id)
    expect(loser.id).toBe(weak.id)
  })
})

describe('evaluatePopulation', () => {
  it('should return results sorted by fitness (descending)', () => {
    const genomes = [
      createGenome({ id: 'g1' }),
      createGenome({ id: 'g2' }),
      createGenome({ id: 'g3' }),
    ]

    const results = evaluatePopulation(genomes)

    expect(results.length).toBe(3)
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].result.fitness.overall).toBeGreaterThanOrEqual(
        results[i + 1].result.fitness.overall
      )
    }
  })
})
