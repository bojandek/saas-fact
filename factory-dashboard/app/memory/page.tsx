'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoryStats {
  total_memories: number
  unconsolidated: number
  consolidations: number
  by_source_type: Record<string, number>
  by_project: Record<string, number>
}

interface Memory {
  id: number
  source: string
  source_type: string
  summary: string
  entities: string[]
  topics: string[]
  importance: number
  consolidated: boolean
  project_id?: string
  created_at: string
}

interface QueryResult {
  answer: string
  confidence: number
  sources: string[]
  memories_used: Array<{ id: number; summary: string; source: string; similarity: number }>
  consolidations_used: Array<{ id: number; insight: string; similarity: number }>
}

// ── Source Type Badge ─────────────────────────────────────────────────────────

const SOURCE_TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  image: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  audio: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pdf: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  agent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  url: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
}

const SOURCE_TYPE_ICONS: Record<string, string> = {
  text: '📝', image: '🖼️', audio: '🎵', video: '🎬',
  pdf: '📄', agent: '🤖', url: '🔗',
}

function SourceTypeBadge({ type }: { type: string }) {
  const color = SOURCE_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-800'
  const icon = SOURCE_TYPE_ICONS[type] ?? '📦'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon} {type}
    </span>
  )
}

// ── Importance Bar ────────────────────────────────────────────────────────────

function ImportanceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.7 ? 'bg-red-500' : value >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{pct}%</span>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub }: { label: string; value: number | string; icon: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [totalMemories, setTotalMemories] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'memories' | 'query' | 'ingest'>('memories')

  // Query state
  const [question, setQuestion] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [querying, setQuerying] = useState(false)

  // Ingest state
  const [ingestText, setIngestText] = useState('')
  const [ingestSource, setIngestSource] = useState('dashboard')
  const [ingesting, setIngesting] = useState(false)
  const [ingestResult, setIngestResult] = useState<string | null>(null)

  // Consolidate state
  const [consolidating, setConsolidating] = useState(false)
  const [consolidateResult, setConsolidateResult] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/stats')
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch { /* silent */ }
  }, [])

  const loadMemories = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/memory/memories?page=${p}&page_size=20`)
      const data = await res.json()
      if (data.success) {
        setMemories(data.memories)
        setTotalMemories(data.total)
        setPage(p)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
    loadMemories(1)
  }, [loadStats, loadMemories])

  const handleQuery = async () => {
    if (!question.trim()) return
    setQuerying(true)
    setQueryResult(null)
    try {
      const res = await fetch('/api/memory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (data.success) setQueryResult(data)
    } catch { /* silent */ }
    setQuerying(false)
  }

  const handleIngest = async () => {
    if (!ingestText.trim()) return
    setIngesting(true)
    setIngestResult(null)
    try {
      const res = await fetch('/api/memory/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ingestText, source: ingestSource }),
      })
      const data = await res.json()
      if (data.success) {
        setIngestResult(`Memory #${data.memory_id} stored: "${data.summary}"`)
        setIngestText('')
        loadStats()
        loadMemories(1)
      } else {
        setIngestResult(`Error: ${data.error}`)
      }
    } catch (err) {
      setIngestResult('Network error')
    }
    setIngesting(false)
  }

  const handleConsolidate = async () => {
    setConsolidating(true)
    setConsolidateResult(null)
    try {
      const res = await fetch('/api/memory/consolidate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setConsolidateResult(
          data.consolidated
            ? `Consolidated ${data.memories_processed} memories. Insight: "${data.insight}"`
            : data.message
        )
        loadStats()
      }
    } catch { /* silent */ }
    setConsolidating(false)
  }

  const totalPages = Math.ceil(totalMemories / 20)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                🧠 Always-On Memory
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Persistent AI memory — Ingest · Consolidate · Query
              </p>
            </div>
            <button
              onClick={handleConsolidate}
              disabled={consolidating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {consolidating ? '⏳ Consolidating...' : '🔄 Run Consolidation'}
            </button>
          </div>
          {consolidateResult && (
            <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-800 dark:text-indigo-200">
              {consolidateResult}
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Memories" value={stats.total_memories} icon="💾" />
            <StatCard label="Unconsolidated" value={stats.unconsolidated} icon="⏳" sub="Pending consolidation" />
            <StatCard label="Consolidations" value={stats.consolidations} icon="🔗" sub="Cross-memory insights" />
            <StatCard
              label="Source Types"
              value={Object.keys(stats.by_source_type).length}
              icon="📦"
              sub={Object.entries(stats.by_source_type).map(([k, v]) => `${SOURCE_TYPE_ICONS[k] ?? ''}${v}`).join(' ')}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          {(['memories', 'query', 'ingest'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'memories' ? '💾 Memories' : tab === 'query' ? '🔍 Query' : '📥 Ingest'}
            </button>
          ))}
        </div>

        {/* Memories Tab */}
        {activeTab === 'memories' && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading memories...</div>
            ) : memories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No memories yet. Use the Ingest tab to add some.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {memories.map(memory => (
                    <div
                      key={memory.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-mono text-gray-400">#{memory.id}</span>
                            <SourceTypeBadge type={memory.source_type} />
                            {memory.consolidated && (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                ✓ Consolidated
                              </span>
                            )}
                            {memory.project_id && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                📁 {memory.project_id}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">
                            {memory.summary}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {memory.topics.map(topic => (
                              <span key={topic} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                                {topic}
                              </span>
                            ))}
                            {memory.entities.slice(0, 4).map(entity => (
                              <span key={entity} className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                                {entity}
                              </span>
                            ))}
                          </div>
                          <ImportanceBar value={memory.importance} />
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">{memory.source}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(memory.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => loadMemories(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {page} of {totalPages} ({totalMemories} total)
                    </span>
                    <button
                      onClick={() => loadMemories(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔍 Ask Your Memory
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder="What do you know about booking SaaS architectures?"
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  onClick={handleQuery}
                  disabled={querying || !question.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {querying ? '⏳' : 'Ask'}
                </button>
              </div>
            </div>

            {queryResult && (
              <div className="space-y-4">
                {/* Answer */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Answer</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.round(queryResult.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(queryResult.confidence * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {queryResult.answer}
                  </p>
                  {queryResult.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {queryResult.sources.map(s => (
                          <span key={s} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Memories used */}
                {queryResult.memories_used.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Memories Used ({queryResult.memories_used.length})
                    </h3>
                    <div className="space-y-2">
                      {queryResult.memories_used.map(m => (
                        <div key={m.id} className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5">#{m.id}</span>
                          <p className="text-gray-700 dark:text-gray-300 flex-1">{m.summary}</p>
                          <span className="text-xs text-indigo-500 shrink-0">
                            {Math.round(m.similarity * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consolidation insights used */}
                {queryResult.consolidations_used.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Insights Used ({queryResult.consolidations_used.length})
                    </h3>
                    <div className="space-y-2">
                      {queryResult.consolidations_used.map(c => (
                        <div key={c.id} className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5">#{c.id}</span>
                          <p className="text-gray-700 dark:text-gray-300 flex-1">{c.insight}</p>
                          <span className="text-xs text-indigo-500 shrink-0">
                            {Math.round(c.similarity * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ingest Tab */}
        {activeTab === 'ingest' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📥 Ingest New Memory
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source (optional)
                </label>
                <input
                  type="text"
                  value={ingestSource}
                  onChange={e => setIngestSource(e.target.value)}
                  placeholder="e.g. meeting-notes, client-brief, research"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={ingestText}
                  onChange={e => setIngestText(e.target.value)}
                  placeholder="Paste any text, notes, research, meeting transcripts, or technical documentation here..."
                  rows={8}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>
              <button
                onClick={handleIngest}
                disabled={ingesting || !ingestText.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {ingesting ? '⏳ Processing...' : '📥 Ingest into Memory'}
              </button>
              {ingestResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  ingestResult.startsWith('Error')
                    ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                }`}>
                  {ingestResult}
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>Supported via API:</strong> Text files (.txt, .md, .json, .csv), Images (.png, .jpg, .webp),
                  Audio (.mp3, .wav), Video (.mp4, .webm), PDFs — all processed with GPT-4o multimodal understanding.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
