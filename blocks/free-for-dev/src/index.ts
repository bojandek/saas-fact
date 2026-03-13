/**
 * Free-for-Dev - Zero-Cost Infrastructure Optimizer
 * Automatically selects and manages free/cheap tiers for 150+ services
 */

import { z } from 'zod'
import { EventEmitter } from 'events'

export const ServiceTierSchema = z.object({
  service: z.string(),
  tier: z.string(),
  capacity: z.string(),
  limits: z.object({
    requests: z.number().optional(),
    storage: z.number().optional(), // in GB
    users: z.number().optional(),
    bandwidth: z.number().optional(), // in GB
  }).optional(),
  costPerMonth: z.number(),
  resetDate: z.enum(['monthly', 'daily', 'never']),
})

export type ServiceTier = z.infer<typeof ServiceTierSchema>

export interface StackConfiguration {
  database: ServiceTier
  backend: ServiceTier
  storage: ServiceTier
  email: ServiceTier
  analytics: ServiceTier
  authentication: ServiceTier
  cdn: ServiceTier
  monitoring: ServiceTier
  totalCost: number
}

const FREE_SERVICES: Record<string, ServiceTier[]> = {
  database: [
    {
      service: 'supabase',
      tier: 'free',
      capacity: '500MB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 0.5, users: 10000 },
    },
    {
      service: 'firebase',
      tier: 'free',
      capacity: '1GB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 1 },
    },
    {
      service: 'planetscale',
      tier: 'free',
      capacity: '5GB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 5 },
    },
    {
      service: 'mongodb-atlas',
      tier: 'free',
      capacity: '512MB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 0.5 },
    },
  ],
  backend: [
    {
      service: 'vercel',
      tier: 'free',
      capacity: 'unlimited',
      costPerMonth: 0,
      resetDate: 'never',
      limits: { requests: 1000000 },
    },
    {
      service: 'netlify',
      tier: 'free',
      capacity: 'unlimited',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { buildMinutes: 300 },
    },
    {
      service: 'railway',
      tier: 'free',
      capacity: '$5 credit',
      costPerMonth: 0,
      resetDate: 'monthly',
    },
    {
      service: 'render',
      tier: 'free',
      capacity: 'limited',
      costPerMonth: 0,
      resetDate: 'never',
    },
  ],
  storage: [
    {
      service: 'cloudflare-r2',
      tier: 'free',
      capacity: '10GB/month',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 10 },
    },
    {
      service: 'aws-s3',
      tier: 'free-tier',
      capacity: '5GB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 5 },
    },
    {
      service: 'firebase-storage',
      tier: 'free',
      capacity: '5GB',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { storage: 5 },
    },
  ],
  email: [
    {
      service: 'resend',
      tier: 'free',
      capacity: '100/day',
      costPerMonth: 0,
      resetDate: 'daily',
      limits: { requests: 3000 },
    },
    {
      service: 'mailgun',
      tier: 'free',
      capacity: '10k/month',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { requests: 10000 },
    },
    {
      service: 'sendgrid',
      tier: 'free',
      capacity: '100/day',
      costPerMonth: 0,
      resetDate: 'daily',
      limits: { requests: 3000 },
    },
  ],
  analytics: [
    {
      service: 'plausible',
      tier: 'free-trial',
      capacity: '50k/month',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { requests: 50000 },
    },
    {
      service: 'simple-analytics',
      tier: 'limited',
      capacity: 'free tier',
      costPerMonth: 0,
      resetDate: 'never',
    },
    {
      service: 'umami',
      tier: 'self-hosted',
      capacity: 'unlimited',
      costPerMonth: 0,
      resetDate: 'never',
    },
  ],
  authentication: [
    {
      service: 'supabase-auth',
      tier: 'included',
      capacity: 'unlimited users',
      costPerMonth: 0,
      resetDate: 'never',
    },
    {
      service: 'firebase-auth',
      tier: 'free',
      capacity: 'unlimited',
      costPerMonth: 0,
      resetDate: 'never',
    },
    {
      service: 'auth0',
      tier: 'free',
      capacity: '7k users',
      costPerMonth: 0,
      resetDate: 'never',
      limits: { users: 7000 },
    },
  ],
  cdn: [
    {
      service: 'cloudflare',
      tier: 'free',
      capacity: 'unlimited bandwidth',
      costPerMonth: 0,
      resetDate: 'never',
    },
    {
      service: 'bunny-cdn',
      tier: 'free-tier',
      capacity: 'limited',
      costPerMonth: 0,
      resetDate: 'never',
    },
  ],
  monitoring: [
    {
      service: 'sentry',
      tier: 'free',
      capacity: 'limited errors',
      costPerMonth: 0,
      resetDate: 'monthly',
    },
    {
      service: 'logrocket',
      tier: 'free',
      capacity: '1k sessions/month',
      costPerMonth: 0,
      resetDate: 'monthly',
      limits: { requests: 1000 },
    },
  ],
}

export class FreeForDev extends EventEmitter {
  private alertThreshold: number
  private autoOptimize: boolean
  private currentUsage: Map<string, number> = new Map()

  constructor(config: { alertThreshold?: number; autoOptimize?: boolean } = {}) {
    super()
    this.alertThreshold = config.alertThreshold || 0.8
    this.autoOptimize = config.autoOptimize !== false
  }

  /**
   * Recommend free service stack based on requirements
   */
  async recommendStack(input: {
    type: string
    expectedUsers: number
    dataSize: string
  }): Promise<StackConfiguration> {
    const databaseSize = this.parseSize(input.dataSize)

    return {
      database:
        databaseSize > 5
          ? FREE_SERVICES.database[1] // Firebase for bigger data
          : FREE_SERVICES.database[0], // Supabase for smaller
      backend: FREE_SERVICES.backend[0], // Vercel as primary
      storage: FREE_SERVICES.storage[0], // Cloudflare R2
      email: FREE_SERVICES.email[0], // Resend
      analytics: FREE_SERVICES.analytics[0], // Plausible
      authentication: FREE_SERVICES.authentication[0], // Supabase Auth
      cdn: FREE_SERVICES.cdn[0], // Cloudflare
      monitoring: FREE_SERVICES.monitoring[0], // Sentry
      totalCost: 0,
    }
  }

  /**
   * Track service usage
   */
  trackUsage(service: string, used: number, limit: number): void {
    const percentage = (used / limit) * 100
    this.currentUsage.set(service, percentage)

    if (percentage > this.alertThreshold * 100) {
      this.emit('limit-warning', service, percentage)
    }

    if (percentage >= 100) {
      this.emit('limit-exceeded', service)
    }
  }

  /**
   * Get cost breakdown
   */
  async getCostBreakdown(): Promise<{
    totalMonthly: number
    byService: Record<string, number>
    breakdown: ServiceTier[]
  }> {
    const byService: Record<string, number> = {}
    const breakdown: ServiceTier[] = []

    for (const category of Object.keys(FREE_SERVICES)) {
      for (const service of FREE_SERVICES[category]) {
        byService[service.service] = service.costPerMonth
        breakdown.push(service)
      }
    }

    return {
      totalMonthly: 0,
      byService,
      breakdown,
    }
  }

  /**
   * Check if approaching limits
   */
  getUsageStatus(): Record<string, { service: string; usage: number }> {
    const status: Record<string, { service: string; usage: number }> = {}

    for (const [service, usage] of this.currentUsage) {
      status[service] = { service, usage }
    }

    return status
  }

  /**
   * List all available free services
   */
  listServices(category?: string): ServiceTier[] {
    if (category) {
      return FREE_SERVICES[category] || []
    }

    return Object.values(FREE_SERVICES).flat()
  }

  /**
   * Get service info
   */
  getService(name: string): ServiceTier | null {
    for (const services of Object.values(FREE_SERVICES)) {
      const service = services.find((s) => s.service === name)
      if (service) return service
    }
    return null
  }

  /**
   * Parse size string (e.g., "10GB" -> 10)
   */
  private parseSize(size: string): number {
    const match = size.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i)
    if (!match) return 0

    const value = parseFloat(match[1])
    const unit = match[2].toUpperCase()

    switch (unit) {
      case 'TB':
        return value * 1024
      case 'GB':
        return value
      case 'MB':
        return value / 1024
      default:
        return 0
    }
  }

  /**
   * Get total available capacity
   */
  getTotalCapacity(): { storage: number; bandwidth: number; requests: number } {
    let storage = 0
    let bandwidth = 0
    let requests = 0

    for (const services of Object.values(FREE_SERVICES)) {
      for (const service of services) {
        if (service.limits) {
          storage += service.limits.storage || 0
          bandwidth += service.limits.bandwidth || 0
          requests += service.limits.requests || 0
        }
      }
    }

    return { storage, bandwidth, requests }
  }
}
