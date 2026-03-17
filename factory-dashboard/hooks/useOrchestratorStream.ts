'use client'

/**
 * useOrchestratorStream Hook
 *
 * React hook for consuming the SSE orchestration stream.
 * Provides real-time updates as each AI agent completes its work.
 *
 * Usage:
 *   const { start, stop, steps, isRunning, isComplete, finalContext } = useOrchestratorStream()
 *   await start({ description: 'My SaaS idea', appName: 'my-app' })
 */

import { useState, useCallback, useRef } from 'react'

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentStep {
  stepIndex: number
  agentId: string
  agentName: string
  description: string
  status: AgentStatus
  result?: unknown
  error?: string
}

export interface OrchestratorState {
  steps: AgentStep[]
  isRunning: boolean
  isComplete: boolean
  error: string | null
  finalContext: Record<string, unknown> | null
  totalSteps: number
}

export interface StartOptions {
  description: string
  appName?: string
}

export function useOrchestratorStream() {
  const [state, setState] = useState<OrchestratorState>({
    steps: [],
    isRunning: false,
    isComplete: false,
    error: null,
    finalContext: null,
    totalSteps: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setState((prev) => ({ ...prev, isRunning: false }))
  }, [])

  const start = useCallback(
    ({ description, appName = 'my-saas' }: StartOptions) => {
      // Close any existing connection
      stop()

      setState({
        steps: [],
        isRunning: true,
        isComplete: false,
        error: null,
        finalContext: null,
        totalSteps: 0,
      })

      const params = new URLSearchParams({ description, appName })
      const es = new EventSource(`/api/orchestrate-stream?${params.toString()}`)
      eventSourceRef.current = es

      // Connection established
      es.addEventListener('connected', (e) => {
        const data = JSON.parse(e.data) as { totalSteps: number; message: string }
        setState((prev) => ({ ...prev, totalSteps: data.totalSteps }))
      })

      // Agent started
      es.addEventListener('agent-start', (e) => {
        const data = JSON.parse(e.data) as AgentStep
        setState((prev) => ({
          ...prev,
          steps: [
            ...prev.steps.filter((s) => s.agentId !== data.agentId),
            { ...data, status: 'running' },
          ].sort((a, b) => a.stepIndex - b.stepIndex),
        }))
      })

      // Agent update (completed or failed)
      es.addEventListener('agent-update', (e) => {
        const data = JSON.parse(e.data) as AgentStep & { status: 'completed' | 'failed' }
        setState((prev) => ({
          ...prev,
          steps: prev.steps
            .map((s) => (s.agentId === data.agentId ? { ...s, ...data } : s))
            .sort((a, b) => a.stepIndex - b.stepIndex),
        }))
      })

      // Pipeline complete
      es.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data) as { context: Record<string, unknown>; message: string }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isComplete: true,
          finalContext: data.context,
        }))
        es.close()
        eventSourceRef.current = null
      })

      // Error event from server
      es.addEventListener('error-event', (e) => {
        const data = JSON.parse(e.data) as { message: string }
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: data.message,
        }))
        es.close()
        eventSourceRef.current = null
      })

      // Network/connection error
      es.onerror = () => {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: 'Connection to orchestrator lost. Please try again.',
        }))
        es.close()
        eventSourceRef.current = null
      }
    },
    [stop]
  )

  return { ...state, start, stop }
}
