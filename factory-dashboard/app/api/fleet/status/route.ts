import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-helpers'

/**
 * GET /api/fleet/status
 *
 * Returns health status, deployment info, and Stripe mapping
 * for all SaaS applications managed by this Factory instance.
 *
 * In production this would:
 * 1. Read apps/ directory or a fleet registry table in Supabase
 * 2. Ping each app's /api/health endpoint
 * 3. Query Coolify API for deployment status
 * 4. Query Stripe API for subscription/revenue per app
 */
export const GET = withAuth(async (_req, _ctx) => {
  try {
    // Read fleet registry from environment or Supabase
    // For now we return a structured response that the dashboard can use
    const fleetRegistry = await getFleetRegistry()
    const appsWithStatus = await Promise.allSettled(
      fleetRegistry.map(app => checkAppHealth(app))
    )

    const apps = appsWithStatus.map((result, i) => {
      if (result.status === 'fulfilled') return result.value
      return {
        ...fleetRegistry[i],
        status: 'unknown' as const,
        healthCheck: { ok: false, error: 'Health check failed', latencyMs: null },
      }
    })

    const summary = {
      total: apps.length,
      healthy: apps.filter(a => a.status === 'healthy').length,
      degraded: apps.filter(a => a.status === 'degraded').length,
      down: apps.filter(a => a.status === 'down').length,
      unknown: apps.filter(a => a.status === 'unknown').length,
    }

    return NextResponse.json({ apps, summary, checkedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fleet status check failed' },
      { status: 500 }
    )
  }
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface FleetApp {
  id: string
  name: string
  displayName: string
  url: string | null
  coolifyAppId: string | null
  stripeProductId: string | null
  supabaseProjectRef: string | null
  environment: 'production' | 'staging' | 'development'
  createdAt: string
  lastDeploy: string | null
  orgId: string
}

interface AppWithStatus extends FleetApp {
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  healthCheck: {
    ok: boolean
    latencyMs: number | null
    error?: string
    version?: string
    dbConnected?: boolean
  }
  deployment: {
    status: string
    commitSha: string | null
    deployedAt: string | null
    buildDuration: number | null
  } | null
  stripe: {
    mrr: number
    activeSubscriptions: number
    trialSubscriptions: number
    churnRate: number
  } | null
}

// ── Fleet Registry ────────────────────────────────────────────────────────────

async function getFleetRegistry(): Promise<FleetApp[]> {
  // In production: SELECT * FROM fleet_registry WHERE factory_instance_id = $1
  // For now: read from environment variable or return demo data
  const registryEnv = process.env.FLEET_REGISTRY_JSON
  if (registryEnv) {
    try {
      return JSON.parse(registryEnv) as FleetApp[]
    } catch {
      // fall through to demo data
    }
  }

  // Demo fleet — replace with real Supabase query
  return [
    {
      id: 'app-001',
      name: 'saas-001-booking',
      displayName: 'BookEasy — Salon Booking',
      url: process.env.APP_SAAS_001_URL || null,
      coolifyAppId: process.env.COOLIFY_APP_001_ID || null,
      stripeProductId: process.env.STRIPE_PRODUCT_001 || null,
      supabaseProjectRef: process.env.SUPABASE_REF_001 || null,
      environment: 'production',
      createdAt: '2025-01-15T10:00:00Z',
      lastDeploy: '2025-03-10T14:30:00Z',
      orgId: 'org-default',
    },
    {
      id: 'app-002',
      name: 'saas-002-cms',
      displayName: 'ContentFlow CMS',
      url: process.env.APP_SAAS_002_URL || null,
      coolifyAppId: process.env.COOLIFY_APP_002_ID || null,
      stripeProductId: process.env.STRIPE_PRODUCT_002 || null,
      supabaseProjectRef: process.env.SUPABASE_REF_002 || null,
      environment: 'staging',
      createdAt: '2025-02-01T09:00:00Z',
      lastDeploy: '2025-03-12T11:00:00Z',
      orgId: 'org-default',
    },
  ]
}

// ── Health Check ──────────────────────────────────────────────────────────────

async function checkAppHealth(app: FleetApp): Promise<AppWithStatus> {
  let healthCheck: AppWithStatus['healthCheck'] = { ok: false, latencyMs: null }
  let status: AppWithStatus['status'] = 'unknown'

  if (app.url) {
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${app.url}/api/health`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SaaSFactory-FleetMonitor/1.0' },
      })
      clearTimeout(timeout)
      const latencyMs = Date.now() - start

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        healthCheck = {
          ok: true,
          latencyMs,
          version: data.version,
          dbConnected: data.db === 'connected',
        }
        status = latencyMs > 3000 ? 'degraded' : 'healthy'
      } else {
        healthCheck = { ok: false, latencyMs, error: `HTTP ${res.status}` }
        status = res.status >= 500 ? 'down' : 'degraded'
      }
    } catch (err) {
      healthCheck = {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Network error',
      }
      status = 'down'
    }
  }

  // Coolify deployment status
  let deployment: AppWithStatus['deployment'] = null
  if (app.coolifyAppId && process.env.COOLIFY_API_TOKEN) {
    try {
      const res = await fetch(
        `${process.env.COOLIFY_BASE_URL || 'https://app.coolify.io'}/api/v1/applications/${app.coolifyAppId}`,
        { headers: { Authorization: `Bearer ${process.env.COOLIFY_API_TOKEN}` } }
      )
      if (res.ok) {
        const data = await res.json()
        deployment = {
          status: data.status || 'unknown',
          commitSha: data.git_commit_sha || null,
          deployedAt: data.updated_at || null,
          buildDuration: data.last_build_duration_in_seconds || null,
        }
      }
    } catch {
      // Coolify unreachable — non-fatal
    }
  }

  // Stripe revenue data
  let stripe: AppWithStatus['stripe'] = null
  if (app.stripeProductId && process.env.STRIPE_SECRET_KEY) {
    try {
      // Simplified — in production use Stripe SDK
      const res = await fetch(
        `https://api.stripe.com/v1/subscriptions?price=${app.stripeProductId}&status=active&limit=100`,
        { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const subs = data.data || []
        const mrr = subs.reduce((sum: number, s: { plan?: { amount?: number } }) =>
          sum + (s.plan?.amount || 0) / 100, 0)
        stripe = {
          mrr,
          activeSubscriptions: subs.length,
          trialSubscriptions: subs.filter((s: { status?: string }) => s.status === 'trialing').length,
          churnRate: 0, // Would need historical data
        }
      }
    } catch {
      // Stripe unreachable — non-fatal
    }
  }

  return { ...app, status, healthCheck, deployment, stripe }
}
