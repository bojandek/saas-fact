'use client'

/**
 * One-Click Deploy Component
 *
 * Provides a complete deployment UI that:
 * 1. Collects deployment configuration (domain, environment)
 * 2. Triggers Coolify deployment via API
 * 3. Shows real-time deployment status with polling
 * 4. Displays deployment URL when complete
 */

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeployConfig {
  appName: string
  gitRepository: string
  branch: string
  environment: 'production' | 'staging' | 'preview'
  domain?: string
}

interface DeployStatus {
  deploymentId: string
  status: 'idle' | 'queued' | 'in_progress' | 'success' | 'failed'
  message: string
  url?: string
  logs?: string[]
  startedAt?: string
  completedAt?: string
  error?: string
}

interface OneClickDeployProps {
  appName: string
  gitRepository?: string
  onDeploySuccess?: (url: string) => void
  onDeployError?: (error: string) => void
  className?: string
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeployStatus['status'] }) {
  const config: Record<DeployStatus['status'], { label: string; className: string; dot: string }> = {
    idle:        { label: 'Ready',       className: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400' },
    queued:      { label: 'Queued',      className: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400 animate-pulse' },
    in_progress: { label: 'Deploying',   className: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400 animate-pulse' },
    success:     { label: 'Live',        className: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
    failed:      { label: 'Failed',      className: 'bg-red-100 text-red-700',     dot: 'bg-red-400' },
  }

  const { label, className, dot } = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ── Log Viewer ────────────────────────────────────────────────────────────────

function DeployLogs({ logs }: { logs: string[] }) {
  if (logs.length === 0) return null

  return (
    <div className="mt-3 bg-gray-950 rounded-lg p-3 max-h-40 overflow-y-auto">
      <p className="text-xs text-gray-500 mb-2 font-mono">Deployment logs</p>
      {logs.map((log, i) => (
        <p key={i} className="text-xs text-green-400 font-mono leading-5">
          <span className="text-gray-600 mr-2">{String(i + 1).padStart(3, '0')}</span>
          {log}
        </p>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OneClickDeploy({
  appName,
  gitRepository = '',
  onDeploySuccess,
  onDeployError,
  className = '',
}: OneClickDeployProps) {
  const [config, setConfig] = useState<DeployConfig>({
    appName,
    gitRepository,
    branch: 'main',
    environment: 'production',
    domain: '',
  })

  const [status, setStatus] = useState<DeployStatus>({
    deploymentId: '',
    status: 'idle',
    message: 'Ready to deploy',
    logs: [],
  })

  const [showConfig, setShowConfig] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // ── Polling ──────────────────────────────────────────────────────────────

  const pollStatus = useCallback(async (deploymentId: string) => {
    try {
      const res = await fetch(`/api/deploy-coolify?deploymentId=${deploymentId}`)
      if (!res.ok) return

      const data = await res.json()

      setStatus(prev => ({
        ...prev,
        status: data.status === 'success' ? 'success'
               : data.status === 'failed' ? 'failed'
               : 'in_progress',
        message: data.message ?? prev.message,
        url: data.url,
        logs: data.logs ?? prev.logs,
        completedAt: data.completedAt,
      }))

      if (data.status === 'success') {
        onDeploySuccess?.(data.url ?? '')
      } else if (data.status === 'failed') {
        onDeployError?.(data.message ?? 'Deployment failed')
      }
    } catch {
      // Polling errors are non-fatal
    }
  }, [onDeploySuccess, onDeployError])

  // Stop polling when deployment completes
  useEffect(() => {
    if (status.status === 'success' || status.status === 'failed') {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  }, [status.status, pollingInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  // ── Deploy handler ────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!config.gitRepository) {
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        message: 'Git repository URL is required',
      }))
      return
    }

    setStatus({
      deploymentId: '',
      status: 'queued',
      message: 'Queuing deployment...',
      logs: ['Connecting to Coolify...'],
      startedAt: new Date().toISOString(),
    })

    try {
      const res = await fetch('/api/deploy-coolify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Deployment request failed')
      }

      setStatus(prev => ({
        ...prev,
        deploymentId: data.deploymentId,
        status: 'in_progress',
        message: data.message ?? 'Deployment started',
        logs: [...(prev.logs ?? []), `Deployment ID: ${data.deploymentId}`],
      }))

      // Start polling every 5 seconds
      const interval = setInterval(() => pollStatus(data.deploymentId), 5000)
      setPollingInterval(interval)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deployment failed'
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        message,
        error: message,
      }))
      onDeployError?.(message)
    }
  }

  const handleReset = () => {
    if (pollingInterval) clearInterval(pollingInterval)
    setPollingInterval(null)
    setStatus({ deploymentId: '', status: 'idle', message: 'Ready to deploy', logs: [] })
  }

  const isDeploying = status.status === 'queued' || status.status === 'in_progress'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`border rounded-xl p-5 bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Deploy to Production</h3>
          <p className="text-sm text-gray-500 mt-0.5">One-click deploy via Coolify</p>
        </div>
        <StatusBadge status={status.status} />
      </div>

      {/* Success state */}
      {status.status === 'success' && status.url && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800">Deployment successful!</p>
          <a
            href={status.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:text-green-800 underline break-all"
          >
            {status.url}
          </a>
        </div>
      )}

      {/* Error state */}
      {status.status === 'failed' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">Deployment failed</p>
          <p className="text-sm text-red-600 mt-1">{status.message}</p>
        </div>
      )}

      {/* In-progress state */}
      {isDeploying && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status.message}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Config toggle */}
      {!isDeploying && status.status !== 'success' && (
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {showConfig ? 'Hide' : 'Configure'} deployment
        </button>
      )}

      {/* Config form */}
      {showConfig && !isDeploying && status.status !== 'success' && (
        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Git Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={config.gitRepository}
              onChange={e => setConfig(prev => ({ ...prev, gitRepository: e.target.value }))}
              placeholder="https://github.com/your-org/your-app"
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
              <input
                type="text"
                value={config.branch}
                onChange={e => setConfig(prev => ({ ...prev, branch: e.target.value }))}
                placeholder="main"
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={config.environment}
                onChange={e => setConfig(prev => ({ ...prev, environment: e.target.value as DeployConfig['environment'] }))}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="preview">Preview</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Custom Domain <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={config.domain}
              onChange={e => setConfig(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="app.yourdomain.com"
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Logs */}
      <DeployLogs logs={status.logs ?? []} />

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        {status.status === 'idle' || status.status === 'failed' ? (
          <button
            onClick={handleDeploy}
            disabled={!config.gitRepository}
            className="flex-1 py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {status.status === 'failed' ? 'Retry Deploy' : 'Deploy to Production'}
          </button>
        ) : status.status === 'success' ? (
          <>
            <a
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-green-600 text-white text-sm font-medium rounded-lg
                         hover:bg-green-700 transition-colors text-center"
            >
              Open App →
            </a>
            <button
              onClick={handleReset}
              className="py-2.5 px-4 border text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Deploy Again
            </button>
          </>
        ) : (
          <button
            disabled
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg
                       opacity-75 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Deploying...
          </button>
        )}
      </div>

      {/* Deployment ID */}
      {status.deploymentId && (
        <p className="mt-2 text-xs text-gray-400 font-mono text-center">
          ID: {status.deploymentId}
        </p>
      )}
    </div>
  )
}
