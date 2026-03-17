'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthCheck {
  ok: boolean
  latencyMs: number | null
  error?: string
  version?: string
  dbConnected?: boolean
}

interface Deployment {
  status: string
  commitSha: string | null
  deployedAt: string | null
  buildDuration: number | null
}

interface StripeData {
  mrr: number
  activeSubscriptions: number
  trialSubscriptions: number
  churnRate: number
}

interface FleetApp {
  id: string
  name: string
  displayName: string
  url: string | null
  environment: 'production' | 'staging' | 'development'
  createdAt: string
  lastDeploy: string | null
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  healthCheck: HealthCheck
  deployment: Deployment | null
  stripe: StripeData | null
}

interface FleetSummary {
  total: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FleetApp['status'] }) {
  const config = {
    healthy: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', label: 'Healthy' },
    degraded: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Degraded' },
    down: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500 animate-pulse', label: 'Down' },
    unknown: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400', label: 'Unknown' },
  }[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ── App Card ──────────────────────────────────────────────────────────────────

function AppCard({ app, onMigrate }: { app: FleetApp; onMigrate: (name: string) => void }) {
  const envColor = {
    production: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    staging: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    development: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
  }[app.environment]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{app.displayName}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{app.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${envColor}`}>{app.environment}</span>
          <StatusBadge status={app.status} />
        </div>
      </div>

      {/* Health Check */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latency</p>
          <p className={`text-sm font-semibold ${
            !app.healthCheck.latencyMs ? 'text-gray-400' :
            app.healthCheck.latencyMs < 500 ? 'text-green-600 dark:text-green-400' :
            app.healthCheck.latencyMs < 2000 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {app.healthCheck.latencyMs ? `${app.healthCheck.latencyMs}ms` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Database</p>
          <p className={`text-sm font-semibold ${
            app.healthCheck.dbConnected === true ? 'text-green-600 dark:text-green-400' :
            app.healthCheck.dbConnected === false ? 'text-red-600 dark:text-red-400' :
            'text-gray-400'
          }`}>
            {app.healthCheck.dbConnected === true ? 'Connected' :
             app.healthCheck.dbConnected === false ? 'Error' : '—'}
          </p>
        </div>
      </div>

      {/* Stripe Revenue */}
      {app.stripe && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MRR</p>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ${app.stripe.mrr.toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subscriptions</p>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {app.stripe.activeSubscriptions}
              {app.stripe.trialSubscriptions > 0 && (
                <span className="text-xs text-gray-500 ml-1">+{app.stripe.trialSubscriptions} trial</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Deployment */}
      {app.deployment && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="font-medium">Last deploy:</span>{' '}
          {app.deployment.deployedAt ? new Date(app.deployment.deployedAt).toLocaleString() : 'Never'}
          {app.deployment.commitSha && (
            <span className="ml-2 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {app.deployment.commitSha.slice(0, 7)}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {app.healthCheck.error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 mb-4">
          {app.healthCheck.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Open App ↗
          </a>
        )}
        <button
          onClick={() => onMigrate(app.name)}
          className="flex-1 text-xs py-1.5 px-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-colors"
        >
          Run Migration
        </button>
      </div>
    </div>
  )
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FleetPage() {
  const [apps, setApps] = useState<FleetApp[]>([])
  const [summary, setSummary] = useState<FleetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [migrating, setMigrating] = useState<string | null>(null)
  const [migrateResult, setMigrateResult] = useState<string | null>(null)

  const fetchFleetStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fleet/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApps(data.apps || [])
      setSummary(data.summary || null)
      setCheckedAt(data.checkedAt || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fleet status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFleetStatus()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchFleetStatus, 60_000)
    return () => clearInterval(interval)
  }, [fetchFleetStatus])

  const handleMigrate = async (appName: string) => {
    setMigrating(appName)
    setMigrateResult(null)
    try {
      const res = await fetch('/api/fleet/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, dryRun: false }),
      })
      const data = await res.json()
      const result = data.results?.[0]
      setMigrateResult(
        result
          ? `${result.app}: ${result.message}`
          : 'Migration completed'
      )
    } catch (err) {
      setMigrateResult(`Error: ${err instanceof Error ? err.message : 'Migration failed'}`)
    } finally {
      setMigrating(null)
    }
  }

  const totalMRR = apps.reduce((sum, app) => sum + (app.stripe?.mrr || 0), 0)
  const totalSubs = apps.reduce((sum, app) => sum + (app.stripe?.activeSubscriptions || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🚀 Fleet Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor and manage all your SaaS applications
              {checkedAt && (
                <span className="ml-2">
                  · Last checked: {new Date(checkedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchFleetStatus}
              disabled={loading}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <button
              onClick={async () => {
                setMigrating('all')
                try {
                  const res = await fetch('/api/fleet/migrate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appName: null, dryRun: false }),
                  })
                  const data = await res.json()
                  setMigrateResult(`Migrated ${data.summary?.success || 0}/${data.summary?.total || 0} apps`)
                } catch (err) {
                  setMigrateResult(`Error: ${err instanceof Error ? err.message : 'Failed'}`)
                } finally {
                  setMigrating(null)
                }
              }}
              disabled={!!migrating}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {migrating === 'all' ? 'Migrating...' : '🗄️ Migrate All'}
            </button>
          </div>
        </div>

        {/* Migration Result Toast */}
        {migrateResult && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>{migrateResult}</span>
            <button onClick={() => setMigrateResult(null)} className="ml-4 text-blue-600 hover:text-blue-800">✕</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <SummaryCard label="Total Apps" value={summary.total} color="text-gray-900 dark:text-white" />
            <SummaryCard label="Healthy" value={summary.healthy} color="text-green-600 dark:text-green-400" />
            <SummaryCard label="Degraded" value={summary.degraded} color="text-yellow-600 dark:text-yellow-400" />
            <SummaryCard label="Down" value={summary.down} color="text-red-600 dark:text-red-400" />
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total MRR</p>
              <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                ${totalMRR.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscriptions</p>
              <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {totalSubs.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Apps Grid */}
        {loading && apps.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-4xl mb-4">🚀</p>
            <p className="text-lg font-medium mb-2">No apps in fleet yet</p>
            <p className="text-sm">
              Run <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">factory create --name my-app</code> to add your first app
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onMigrate={handleMigrate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
