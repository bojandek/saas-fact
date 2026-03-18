'use client'

/**
 * SaaS Factory Dashboard — Homepage
 *
 * Live metrics, Brain Chat, queue status, and quick actions.
 * All data is fetched client-side with auto-refresh.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueStats {
  queued: number
  running: number
  completed: number
  failed: number
  avgProcessingMinutes: number
  throughputPerHour: number
}

interface Project {
  id: string
  name: string
  description: string
  status: 'live' | 'dev' | 'idea' | 'failed'
  niche?: string
  created_at: string
  deploy_url?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Project['status'] }) {
  const styles: Record<Project['status'], string> = {
    live: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dev: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    idea: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${accent ?? 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Brain Chat ────────────────────────────────────────────────────────────────

function BrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Factory Brain. Ask me to suggest architecture, analyse a niche, or generate a SaaS idea.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isThinking) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }])
    setIsThinking(true)

    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })

      if (!res.ok) throw new Error('RAG request failed')
      const data = await res.json()

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? data.results?.map((r: { content: string }) => r.content).join('\n\n') ?? 'No results found.',
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not reach the knowledge base. Make sure the RAG system is configured.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col h-96">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Brain Chat</h2>
        <span className="text-xs text-gray-400">RAG-powered</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl rounded-bl-sm px-3 py-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 pb-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Brain anything…"
            rows={1}
            className="flex-1 resize-none text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Queue Status ──────────────────────────────────────────────────────────────

function QueueStatus({ stats }: { stats: QueueStats | null }) {
  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Generation Queue</h2>
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      </div>
    )
  }
  const items = [
    { label: 'Queued', value: stats.queued, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Running', value: stats.running, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Completed', value: stats.completed, color: 'text-green-600 dark:text-green-400' },
    { label: 'Failed', value: stats.failed, color: 'text-red-600 dark:text-red-400' },
  ]
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Generation Queue</h2>
        <span className="text-xs text-gray-400">{stats.throughputPerHour}/hr throughput</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      {stats.avgProcessingMinutes > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">Avg generation time: {stats.avgProcessingMinutes} min</p>
      )}
    </div>
  )
}

// ── Generate Form ─────────────────────────────────────────────────────────────

function GenerateForm() {
  const [niche, setNiche] = useState('')
  const [appName, setAppName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{ jobId?: string; error?: string } | null>(null)

  const handleGenerate = async () => {
    if (!niche.trim() || !appName.trim()) return
    setIsGenerating(true)
    setResult(null)
    try {
      const res = await fetch('/api/queue/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saasDescription: niche,
          appName: appName.trim(),
          orgId: 'default',
          userId: 'dashboard-user',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to enqueue')
      setResult({ jobId: data.id })
      setNiche('')
      setAppName('')
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Generate New SaaS</h2>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Niche / Description</label>
          <input type="text" value={niche} onChange={e => setNiche(e.target.value)}
            placeholder="e.g. teretana-crm, salon-booking"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">App Name</label>
          <input type="text" value={appName} onChange={e => setAppName(e.target.value)}
            placeholder="e.g. my-gym-app"
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400" />
        </div>
        <button onClick={handleGenerate} disabled={!niche.trim() || !appName.trim() || isGenerating}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {isGenerating ? 'Enqueueing…' : 'Generate SaaS →'}
        </button>
        {result?.jobId && <p className="text-xs text-green-600 dark:text-green-400">✓ Job enqueued: <code className="font-mono">{result.jobId}</code></p>}
        {result?.error && <p className="text-xs text-red-600 dark:text-red-400">✗ {result.error}</p>}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/stats')
      if (res.ok) setQueueStats(await res.json())
    } catch {}
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) setProjects(await res.json())
    } catch {} finally { setIsLoadingProjects(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchProjects()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [fetchStats, fetchProjects])

  const liveCount = projects.filter(p => p.status === 'live').length
  const devCount = projects.filter(p => p.status === 'dev').length

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SaaS Factory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI-powered SaaS generation platform</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500 dark:text-gray-400">System online</span>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Projects" value={projects.length} sub={`${liveCount} live · ${devCount} in dev`} />
          <MetricCard label="MRR" value="$0" sub="Connect Stripe to track" />
          <MetricCard label="Jobs Completed" value={queueStats?.completed ?? '—'} sub={`${queueStats?.throughputPerHour ?? 0}/hr throughput`} accent="text-green-600 dark:text-green-400" />
          <MetricCard label="Running Now" value={queueStats?.running ?? '—'} sub={queueStats?.avgProcessingMinutes ? `~${queueStats.avgProcessingMinutes}min avg` : 'No jobs running'} accent="text-blue-600 dark:text-blue-400" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><BrainChat /></div>
          <div className="space-y-4">
            <QueueStatus stats={queueStats} />
            <GenerateForm />
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Orchestrator', href: '/orchestrator', icon: '🤖' },
              { label: 'Projects', href: '/projects', icon: '📁' },
              { label: 'Fleet', href: '/fleet', icon: '🚀' },
              { label: 'Analytics', href: '/analytics', icon: '📊' },
              { label: 'Memory', href: '/memory', icon: '🧠' },
              { label: 'Theme', href: '/theme-generator', icon: '🎨' },
              { label: 'Architect', href: '/architect-agent', icon: '🏗️' },
              { label: 'Growth', href: '/growth-hacker', icon: '📈' },
              { label: 'Landing', href: '/landing-page-generator', icon: '🌐' },
              { label: 'Block Editor', href: '/block-editor', icon: '🧩' },
              { label: 'RAG', href: '/rag', icon: '🔍' },
              { label: 'Pricing', href: '/pricing', icon: '💳' },
            ].map(item => (
              <a key={item.href} href={item.href}
                className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition-all text-center group">
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
            <a href="/projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all →</a>
          </div>
          {isLoadingProjects ? (
            <div className="text-sm text-gray-400 animate-pulse">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">No projects yet.</p>
              <p className="text-xs text-gray-400 mt-1">Use the Generate form above to create your first SaaS.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Niche</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {projects.slice(0, 8).map(project => (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{project.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{project.niche ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={project.status ?? 'idea'} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(project.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {project.deploy_url
                          ? <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Open →</a>
                          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
