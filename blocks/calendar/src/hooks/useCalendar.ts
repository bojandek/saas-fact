/**
 * Calendar Block — React Hook
 *
 * Provides a clean API for React components to interact with the calendar.
 * Handles loading states, optimistic updates, and error handling.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getEvents,
  createEvent,
  updateEvent,
  cancelEvent,
  getAvailableSlots,
} from '../lib/calendar-client'
import type {
  CalendarEvent,
  BookingSlot,
  CreateEventInput,
  UpdateEventInput,
  GetAvailableSlotsInput,
} from '../types'

interface UseCalendarOptions {
  /** ISO date string for start of view window */
  startDate: string
  /** ISO date string for end of view window */
  endDate: string
  /** Auto-refresh interval in ms (default: disabled) */
  refreshInterval?: number
}

interface UseCalendarReturn {
  events: CalendarEvent[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (input: CreateEventInput) => Promise<CalendarEvent>
  update: (id: string, input: UpdateEventInput) => Promise<CalendarEvent>
  cancel: (id: string) => Promise<void>
}

export function useCalendar(opts: UseCalendarOptions): UseCalendarReturn {
  const { startDate, endDate, refreshInterval } = opts
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await getEvents(startDate, endDate)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    setIsLoading(true)
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!refreshInterval) return
    const id = setInterval(refresh, refreshInterval)
    return () => clearInterval(id)
  }, [refresh, refreshInterval])

  const create = useCallback(async (input: CreateEventInput): Promise<CalendarEvent> => {
    const event = await createEvent(input)
    // Optimistic update
    setEvents(prev => [...prev, event].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    ))
    return event
  }, [])

  const update = useCallback(async (id: string, input: UpdateEventInput): Promise<CalendarEvent> => {
    const updated = await updateEvent(id, input)
    setEvents(prev => prev.map(e => e.id === id ? updated : e))
    return updated
  }, [])

  const cancel = useCallback(async (id: string): Promise<void> => {
    await cancelEvent(id)
    setEvents(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'cancelled' as const } : e
    ))
  }, [])

  return { events, isLoading, error, refresh, create, update, cancel }
}

// ── Availability Hook ─────────────────────────────────────────────────────────

interface UseAvailableSlotsReturn {
  slots: BookingSlot[]
  isLoading: boolean
  error: string | null
}

export function useAvailableSlots(
  input: GetAvailableSlotsInput | null
): UseAvailableSlotsReturn {
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!input) return

    setIsLoading(true)
    setError(null)

    getAvailableSlots(input)
      .then(setSlots)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load slots'))
      .finally(() => setIsLoading(false))
  }, [input?.staff_id, input?.date, input?.duration_minutes])

  return { slots, isLoading, error }
}
