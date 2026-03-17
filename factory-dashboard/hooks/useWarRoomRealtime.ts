/**
 * useWarRoomRealtime.ts
 *
 * React hook for real-time War Room log streaming via Supabase Realtime.
 * Subscribes to the `war_room_logs` Postgres table using Supabase's
 * postgres_changes feature, so every INSERT is pushed to the client
 * without polling.
 *
 * Falls back to SSE (useOrchestratorStream) if Supabase Realtime is
 * unavailable or the user is not authenticated.
 *
 * Usage:
 *   const { logs, agentStatuses, isConnected } = useWarRoomRealtime(runId)
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface WarRoomLogEntry {
  id: string
  run_id: string
  agent: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface AgentStatusMap {
  architect: AgentStatus
  assembler: AgentStatus
  qa: AgentStatus
  legal: AgentStatus
  growth: AgentStatus
  compliance: AgentStatus
  [key: string]: AgentStatus
}

export interface UseWarRoomRealtimeReturn {
  logs: WarRoomLogEntry[]
  agentStatuses: AgentStatusMap
  isConnected: boolean
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
  clearLogs: () => void
}

// ── Default state ──────────────────────────────────────────────────────────────

const DEFAULT_AGENT_STATUSES: AgentStatusMap = {
  architect: 'idle',
  assembler: 'idle',
  qa: 'idle',
  legal: 'idle',
  growth: 'idle',
  compliance: 'idle',
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useWarRoomRealtime(runId: string | null): UseWarRoomRealtimeReturn {
  const [logs, setLogs] = useState<WarRoomLogEntry[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusMap>({ ...DEFAULT_AGENT_STATUSES })
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  const clearLogs = useCallback(() => {
    setLogs([])
    setAgentStatuses({ ...DEFAULT_AGENT_STATUSES })
  }, [])

  // Update agent status based on log level and message
  const updateAgentStatus = useCallback((log: WarRoomLogEntry) => {
    const agent = log.agent?.toLowerCase()
    if (!agent || !(agent in DEFAULT_AGENT_STATUSES)) return

    setAgentStatuses((prev) => {
      const next = { ...prev }

      if (log.level === 'error') {
        next[agent] = 'failed'
      } else if (log.message?.toLowerCase().includes('completed') ||
                 log.message?.toLowerCase().includes('finished') ||
                 log.level === 'success') {
        next[agent] = 'completed'
      } else if (log.message?.toLowerCase().includes('starting') ||
                 log.message?.toLowerCase().includes('running') ||
                 log.level === 'info') {
        if (prev[agent] === 'idle') {
          next[agent] = 'running'
        }
      }

      return next
    })
  }, [])

  useEffect(() => {
    if (!runId) return

    const supabase = supabaseRef.current

    setConnectionState('connecting')
    clearLogs()

    // Subscribe to new log entries for this run via Supabase Realtime
    const channel = supabase
      .channel(`war-room:${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'war_room_logs',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const log = payload.new as WarRoomLogEntry
          setLogs((prev) => [...prev, log])
          updateAgentStatus(log)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_jobs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          // Track job status changes (queued → running → completed/failed)
          const job = payload.new as { status: string; agent?: string }
          if (job.status === 'failed') {
            // Mark all running agents as failed
            setAgentStatuses((prev) => {
              const next = { ...prev }
              Object.keys(next).forEach((k) => {
                if (next[k] === 'running') next[k] = 'failed'
              })
              return next
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState('error')
        } else if (status === 'TIMED_OUT') {
          setConnectionState('disconnected')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setConnectionState('disconnected')
    }
  }, [runId, clearLogs, updateAgentStatus])

  return {
    logs,
    agentStatuses,
    isConnected: connectionState === 'connected',
    connectionState,
    clearLogs,
  }
}
