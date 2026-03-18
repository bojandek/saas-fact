/**
 * Calendar Block — CalendarView Component
 *
 * A week-view calendar that renders events as coloured blocks.
 * Designed to work with any SaaS niche (clinic, salon, gym, etc.)
 */

'use client'

import React, { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes } from 'date-fns'
import type { CalendarEvent } from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_START_HOUR = 7   // 07:00
const DAY_END_HOUR = 21    // 21:00
const VISIBLE_HOURS = HOURS.slice(DAY_START_HOUR, DAY_END_HOUR)
const HOUR_HEIGHT_PX = 60  // 1 hour = 60px

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  isLoading?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarView({
  events,
  onEventClick,
  onSlotClick,
  isLoading = false,
}: CalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  )

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  )

  const goToPrevWeek = () => setCurrentWeekStart(d => addDays(d, -7))
  const goToNextWeek = () => setCurrentWeekStart(d => addDays(d, 7))
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const getEventsForDay = (day: Date) =>
    events.filter(e =>
      isSameDay(parseISO(e.start_at), day) && e.status !== 'cancelled'
    )

  const getEventStyle = (event: CalendarEvent): React.CSSProperties => {
    const start = parseISO(event.start_at)
    const end = parseISO(event.end_at)
    const startMinutes = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes()
    const durationMinutes = differenceInMinutes(end, start)

    return {
      top: `${(startMinutes / 60) * HOUR_HEIGHT_PX}px`,
      height: `${Math.max((durationMinutes / 60) * HOUR_HEIGHT_PX, 24)}px`,
      backgroundColor: event.color ?? 'hsl(var(--primary))',
    }
  }

  const statusBadge: Record<CalendarEvent['status'], string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    no_show: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Previous week"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium rounded border hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          {format(currentWeekStart, 'MMMM yyyy')}
        </h2>
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 border-b">
        <div className="w-14" /> {/* Time gutter */}
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={`py-2 text-center text-xs font-medium border-l ${
              isSameDay(day, new Date())
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <div>{format(day, 'EEE')}</div>
            <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8 relative">
          {/* Hour labels */}
          <div className="w-14">
            {VISIBLE_HOURS.map(hour => (
              <div
                key={hour}
                className="text-right pr-2 text-xs text-muted-foreground"
                style={{ height: `${HOUR_HEIGHT_PX}px`, paddingTop: '2px' }}
              >
                {format(new Date().setHours(hour, 0), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className="relative border-l"
              style={{ height: `${VISIBLE_HOURS.length * HOUR_HEIGHT_PX}px` }}
            >
              {/* Hour grid lines */}
              {VISIBLE_HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-border/40 cursor-pointer hover:bg-muted/20 transition-colors"
                  style={{ top: `${(hour - DAY_START_HOUR) * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
                  onClick={() => onSlotClick?.(day, hour)}
                />
              ))}

              {/* Events */}
              {getEventsForDay(day).map(event => (
                <div
                  key={event.id}
                  className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer overflow-hidden text-white text-xs font-medium shadow-sm hover:opacity-90 transition-opacity z-10"
                  style={getEventStyle(event)}
                  onClick={() => onEventClick?.(event)}
                  title={event.title}
                >
                  <div className="truncate">{event.title}</div>
                  <div className="opacity-80 text-[10px]">
                    {format(parseISO(event.start_at), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Event Detail Card ─────────────────────────────────────────────────────────

interface EventCardProps {
  event: CalendarEvent
  onClose: () => void
  onCancel?: (id: string) => void
}

export function EventCard({ event, onClose, onCancel }: EventCardProps) {
  const statusColors: Record<CalendarEvent['status'], string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    no_show: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="bg-background border rounded-lg shadow-lg p-4 w-72">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground">{event.title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Time: </span>
          {format(parseISO(event.start_at), 'PPp')} – {format(parseISO(event.end_at), 'p')}
        </div>
        {event.location && (
          <div>
            <span className="font-medium text-foreground">Location: </span>
            {event.location}
          </div>
        )}
        {event.description && (
          <div className="text-xs">{event.description}</div>
        )}
        <div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
            {event.status}
          </span>
        </div>
      </div>

      {onCancel && event.status !== 'cancelled' && event.status !== 'completed' && (
        <button
          onClick={() => onCancel(event.id)}
          className="mt-3 w-full text-sm text-destructive border border-destructive/30 rounded py-1.5 hover:bg-destructive/10 transition-colors"
        >
          Cancel Event
        </button>
      )}
    </div>
  )
}
