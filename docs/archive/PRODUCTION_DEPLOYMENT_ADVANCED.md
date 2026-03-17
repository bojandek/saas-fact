# Production Deployment Guide - Advanced Features

Complete guide for deploying Circuit Breaker, Intelligent Caching, Zero-Downtime Migrations, and Monitoring & Alerting.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Routes / Server Components                        │   │
│  └──────────────┬───────────────────────────────────────┘   │
├─────────────────┼─────────────────────────────────────────────┤
│                 │ Observability & Monitoring                  │
│   ┌─────────────▼──────────────┐  ┌──────────────────────┐   │
│   │ Monitoring Engine          │  │ Alert Rules          │   │
│   │ - SLO Tracking             │  │ - Error Rate > 5%    │   │
│   │ - Incident Response        │  │ - Latency > 500ms    │   │
│   │ - Health Reports           │  │ - Service Down       │   │
│   └────────────────────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  Resilience Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Circuit Breaker  │  │ InteligentCache  │                 │
│  │ - Stripe CB      │  │ - Redis L2       │                 │
│  │ - Supabase CB    │  │ - Local L1       │                 │
│  │ - Fallbacks      │  │ - SWR Pattern    │                 │
│  └──────────────────┘  └──────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Stripe API       │  │ Supabase DB      │                 │
│  │ (with CB)        │  │ (with CB + Cache)│                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Zero-Downtime Migrations                             │   │
│  │ - Backward-compatible schema updates                 │   │
│  │ - Batch data transformations                         │   │
│  │ - Safe column operations                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 1. Circuit Breaker Setup

### Environment Configuration

```bash
# .env.production
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_STRIPE_THRESHOLD=5
CIRCUIT_BREAKER_STRIPE_TIMEOUT=120000
CIRCUIT_BREAKER_DB_THRESHOLD=10
CIRCUIT_BREAKER_DB_TIMEOUT=180000
```

### Initialization

```typescript
// apps/saas-001-booking/app/api/initialize.ts
import { registerGlobalBreaker } from '@saas-factory/blocks-circuit-breaker'
import { StripeAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'
import { getMonitoringEngine } from '@saas-factory/blocks-observability'

export function initializeResilience() {
  const monitoring = getMonitoringEngine()

  // Register Stripe circuit breaker
  const stripeBreaker = registerGlobalBreaker('stripe', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 120000,
    onStateChange: (state) => {
      console.log(`[Stripe] Circuit state: ${state}`)
      
      // Alert on state changes
      if (state === 'OPEN') {
        monitoring.registerAlert({
          id: `stripe_${Date.now()}`,
          name: 'Stripe Payment Service Down',
          condition: () => false, // Already fired
          severity: 'critical',
          channels: ['slack', 'pagerduty'],
          enabled: true,
        })
      }
    },
    onFailure: (error) => {
      console.error('[Stripe] Operation failed:', error)
    }
  })

  // Register database circuit breaker
  registerGlobalBreaker('supabase', {
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 180000,
    onStateChange: (state) => {
      console.log(`[Supabase] Circuit state: ${state}`)
    }
  })

  console.log('[Init] Circuit breakers initialized')
}
```

### Usage in API Routes

```typescript
// apps/saas-001-booking/app/api/checkout/route.ts
import { getGlobalBreaker } from '@saas-factory/blocks-circuit-breaker'
import { StripeAdapter } from '@saas-factory/blocks-circuit-breaker/adapters'

const stripeAdapter = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY!,
})

export async function POST(req: Request) {
  try {
    // This uses circuit breaker internally
    const paymentIntent = await stripeAdapter.createPaymentIntent({
      amount: 5000,
      currency: 'usd',
      customer: customerId,
    })

    return Response.json({ success: true, intentId: paymentIntent.id })
  } catch (error) {
    // Circuit is open - use fallback
    if (stripeAdapter.getStatus().state === 'OPEN') {
      // Queue payment for manual processing
      await queuePaymentForManualProcessing(customerId, 5000)
      return Response.json(
        { success: false, message: 'Payment queued for processing' },
        { status: 202 }
      )
    }

    throw error
  }
}
```

## 2. Intelligent Caching Setup

### Environment Configuration

```bash
# .env.production
UPSTASH_REDIS_REST_URL=https://<region>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
CACHE_TTL=3600
CACHE_COMPRESSION=true
```

### Initialization

```typescript
// apps/saas-001-booking/app/api/cache-init.ts
import { getCacheManager } from '@saas-factory/blocks-cache'

export async function initializeCache() {
  const cache = getCacheManager()

  // Check health
  const isHealthy = await cache.healthCheck()
  if (!isHealthy) {
    console.error('[Cache] Redis health check failed!')
  }

  // Prefetch critical data
  await cache.prefetchBatch([
    {
      key: 'pricing:plans',
      fn: async () => {
        const { data } = await supabase
          .from('pricing_plans')
          .select('*')
        return data
      },
      config: { ttl: 86400, tags: ['pricing'] } // 24h
    },
    {
      key: 'currencies:all',
      fn: async () => {
        const { data } = await supabase
          .from('currencies')
          .select('id, code, name')
        return data
      },
      config: { ttl: 604800, tags: ['config'] } // 1 week
    }
  ])

  console.log('[Cache] Initialized with prefetch')
}
```

### Usage in Data Queries

```typescript
// packages/db/src/queries.ts
import { getCacheManager } from '@saas-factory/blocks-cache'

const cache = getCacheManager()

export async function getUserWithCache(userId: string) {
  return cache.get(
    `user:${userId}`,
    async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      return data
    },
    {
      ttl: 3600,
      tags: ['users', `user:${userId}`]
    }
  )
}

export async function getSubscriptionWithCache(userId: string) {
  return cache.swr(
    `subscription:${userId}`,
    async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()
      return data
    },
    {
      ttl: 300,
      staleAge: 600, // Serve stale for 10 minutes
      tags: ['subscriptions']
    }
  )
}

// Cache invalidation on mutations
export async function updateUserProfile(userId: string, updates: any) {
  const { data } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()

  // Invalidate cache
  await cache.invalidate(`user:${userId}`)
  await cache.invalidateTag('users')

  return data
}
```

### Prefetching Strategy

```typescript
// apps/saas-001-booking/middleware.ts
import { getCacheManager } from '@saas-factory/blocks-cache'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const cache = getCacheManager()

  // Cache user data during auth
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const userId = getUserFromSession(request)

    if (userId) {
      // Prefetch user data in background
      cache.prefetch(`user:${userId}`, async () => {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        return data
      }).catch(() => {
        // Prefetch failure is non-blocking
      })
    }
  }

  return NextResponse.next()
}
```

## 3. Zero-Downtime Migrations Setup

### Environment Configuration

```bash
# .env.production
MIGRATION_TIMEOUT=300000
MIGRATION_BATCH_SIZE=1000
MIGRATION_POLL_INTERVAL=1000
```

### Migration Definitions

```typescript
// blocks/migrations/src/migrations/2024-03-users-email-lower.ts
import { Migration, ZeroDowntimeMigrationManager } from '@saas-factory/blocks-migrations'

export const migrateUserEmailLower: Migration = {
  id: '2024-03-users-email-lower',
  name: 'Convert emails to lowercase',
  description: 'Normalize all user emails to lowercase for consistency',
  backward_compatible: true,
  
  upFn: async (supabase) => {
    // Step 1: Add new column
    await supabase.rpc('add_column', {
      table: 'users',
      column_name: 'email_normalized',
      column_type: 'text',
    })

    // Step 2: Backfill with batching (non-blocking)
    const manager = new ZeroDowntimeMigrationManager({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      batchSize: 1000,
    })

    await manager.batchUpdate(
      'SELECT id, email FROM users',
      async (batch) => {
        const updates = batch.map((row: any) => ({
          id: row.id,
          email_normalized: row.email.toLowerCase(),
        }))

        await supabase.rpc('batch_update', {
          table: 'users',
          records: updates,
        })
      },
      { chunkSize: 1000, delayMs: 10 }
    )

    // Step 3: Add constraint after backfill
    await supabase.rpc('add_unique_constraint', {
      table: 'users',
      column: 'email_normalized',
    })

    console.log('✓ Migration complete')
  },

  downFn: async (supabase) => {
    // Rollback: drop new column
    await supabase.rpc('drop_column', {
      table: 'users',
      column_name: 'email_normalized',
    })
  }
}
```

### Safe Column Operations

```typescript
// blocks/migrations/src/migrations/2024-03-rename-columns.ts
export const migrateRenameColumns: Migration = {
  id: '2024-03-rename-columns',
  name: 'Rename created_at to created',
  description: 'Rename timestamp columns for better naming',
  backward_compatible: true,
  
  upFn: async (supabase) => {
    // Safe rename with trigger to keep both columns in sync
    const manager = new ZeroDowntimeMigrationManager({...})
    
    await manager.renameColumnSafely(
      'orders',
      'created_at',
      'created'
    )
  },

  downFn: async (supabase) => {
    const manager = new ZeroDowntimeMigrationManager({...})
    await manager.renameColumnSafely('orders', 'created', 'created_at')
  }
}
```

### Running Migrations in Production

```typescript
// apps/saas-001-booking/scripts/migrate-prod.ts
import { ZeroDowntimeMigrationManager } from '@saas-factory/blocks-migrations'
import { migrateUserEmailLower } from './migrations/2024-03-users-email-lower'

async function runProductionMigrations() {
  const manager = new ZeroDowntimeMigrationManager({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    timeout: 300000,
    batchSize: 1000,
  })

  // Register migrations
  manager.registerMigration(migrateUserEmailLower)

  // Run all pending migrations
  const results = await manager.migrateUp()

  console.log('Migration Results:')
  results.forEach((result) => {
    console.log(
      `${result.status === 'completed' ? '✓' : '✗'} ${result.name}` +
      `${result.duration ? ` (${result.duration}ms)` : ''}`
    )
    if (result.error) {
      console.error(`  Error: ${result.error}`)
    }
  })
}

// Run on deployment
runProductionMigrations().catch(console.error)
```

## 4. Monitoring & Alerting Setup

### Environment Configuration

```bash
# .env.production
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_API_KEY=<key>
PAGERDUTY_SERVICE_ID=<id>
MONITORING_ENABLED=true
```

### Monitoring Initialization

```typescript
// apps/saas-001-booking/app/api/monitoring-init.ts
import { getMonitoringEngine } from '@saas-factory/blocks-observability'

export function initializeMonitoring() {
  const monitoring = getMonitoringEngine()

  // Define SLOs
  monitoring.registerSLO({
    name: 'API Availability',
    targetPercentage: 99.9,
    window: 'daily',
    metric: 'uptime',
    description: 'API response success rate'
  })

  monitoring.registerSLO({
    name: 'Payment Processing',
    targetPercentage: 99.5,
    window: 'daily',
    metric: 'payment_success',
    description: 'Stripe payment success rate'
  })

  monitoring.registerSLO({
    name: 'Database Performance',
    targetPercentage: 99,
    window: 'hourly',
    metric: 'db_latency',
    description: 'Database query p95 latency < 500ms'
  })

  // Define alerts
  monitoring.registerAlert({
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5%',
    condition: (metrics) => metrics.errorRate > 5,
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    cooldown: 300000, // 5 minutes
    enabled: true,
  })

  monitoring.registerAlert({
    id: 'high_latency',
    name: 'High Latency',
    description: 'P95 latency exceeds 1000ms',
    condition: (metrics) => metrics.p95Latency > 1000,
    severity: 'warning',
    channels: ['slack'],
    cooldown: 600000, // 10 minutes
    enabled: true,
  })

  monitoring.registerAlert({
    id: 'stripe_down',
    name: 'Stripe Service Down',
    description: 'Stripe API is unreachable',
    condition: (metrics) => !metrics.stripeHealth,
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
  })

  monitoring.registerAlert({
    id: 'db_circuit_open',
    name: 'Database Circuit Breaker Open',
    description: 'Database circuit breaker is in OPEN state',
    condition: (metrics) => metrics.circuitBreakerStates['supabase'] === 'OPEN',
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
  })

  monitoring.registerAlert({
    id: 'cache_down',
    name: 'Redis Cache Down',
    description: 'Redis cache is unreachable',
    condition: (metrics) => !metrics.redisHealth,
    severity: 'warning',
    channels: ['slack'],
    cooldown: 600000,
    enabled: true,
  })

  // Register handlers for real services
  monitoring.registerAlertHandler('slack', async (message, incident) => {
    await sendToSlack(process.env.SLACK_WEBHOOK_URL!, message)
  })

  monitoring.registerAlertHandler('pagerduty', async (message, incident) => {
    await sendToPagerDuty({
      title: incident.title,
      severity: incident.severity === 'critical' ? 'critical' : 'warning',
      description: message,
      serviceId: process.env.PAGERDUTY_SERVICE_ID!,
    })
  })

  console.log('[Init] Monitoring initialized')
}
```

### Metrics Collection

```typescript
// apps/saas-001-booking/app/api/metrics/route.ts
import { getMonitoringEngine } from '@saas-factory/blocks-observability'
import { getGlobalPool } from '@saas-factory/blocks-circuit-breaker'
import { getCacheManager } from '@saas-factory/blocks-cache'

export async function POST(req: Request) {
  const monitoring = getMonitoringEngine()
  const circuitPool = getGlobalPool()
  const cache = getCacheManager()

  // Collect metrics
  const metrics: MetricsSnapshot = {
    timestamp: new Date(),
    requestCount: await getRequestCount(),
    errorCount: await getErrorCount(),
    errorRate: await calculateErrorRate(),
    p50Latency: await getLatencyPercentile(50),
    p95Latency: await getLatencyPercentile(95),
    p99Latency: await getLatencyPercentile(99),
    stripeHealth: await checkStripeHealth(),
    supabaseHealth: await checkSupabaseHealth(),
    redisHealth: await cache.healthCheck(),
    circuitBreakerStates: circuitPool.getAllMetrics(),
    activeUsers: await getActiveUsers(),
    newSignups: await getNewSignups(),
    failedPayments: await getFailedPayments(),
  }

  // Process metrics and check alerts
  await monitoring.processMetrics(metrics)

  return Response.json({ success: true })
}
```

### Health Dashboard

```typescript
// apps/saas-001-booking/app/api/health/route.ts
export async function GET() {
  const monitoring = getMonitoringEngine()
  const health = monitoring.getHealthReport()

  return Response.json({
    status: health.activeIncidents === 0 ? 'healthy' : 'degraded',
    slos: health.slos,
    incidents: health.activeIncidents,
    avgLatency: health.avgLatency,
    recentErrors: health.recentErrors,
  })
}
```

## 5. Integration in Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile

# Copy code
COPY . .

# Build
RUN pnpm run build

# Initialize production systems
ENV NODE_ENV=production
RUN pnpm run migrations:up || true

# Start
CMD ["pnpm", "start"]
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm run test

      - name: Build application
        run: pnpm run build

      - name: Deploy to Coolify
        env:
          COOLIFY_API_TOKEN: ${{ secrets.COOLIFY_API_TOKEN }}
        run: |
          pnpm run deploy

      - name: Run migrations
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          pnpm run migrations:up

      - name: Verify deployment
        run: |
          curl -f https://api.example.com/health || exit 1
```

## 6. Monitoring Dashboards

View real-time metrics at:

- **Health Dashboard**: `/api/health`
- **SLO Status**: `/api/monitoring/slos`
- **Incidents**: `/api/monitoring/incidents`
- **Metrics**: `/api/monitoring/metrics`

## 7. Incident Response Playbook

### High Error Rate (>5%)

1. ✓ Check circuit breaker states
2. ✓ Review recent deployments
3. ✓ Check external service health (Stripe, Supabase)
4. ✓ Enable debug logging
5. ✓ Scale up resources if needed

### Payment Processing Failure

1. ✓ Check Stripe circuit breaker status
2. ✓ Verify Stripe API health
3. ✓ Review recent Stripe API changes
4. ✓ Check payment queue status
5. ✓ Manual payment processing if needed

### Database Circuit Breaker Open

1. ✓ Check Supabase status page
2. ✓ Verify connection pool
3. ✓ Check query performance
4. ✓ Resume circuit breaker after verification

## 8. Rollback Procedures

### Application Rollback

```bash
# Rollback to previous deployment
pnpm run rollback:app
```

### Database Rollback

```bash
# Rollback last migration
pnpm run migrations:down
```

### Cache Flush

```bash
# Clear all cached data
pnpm run cache:flush
```
