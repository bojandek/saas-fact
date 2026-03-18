/**
 * Calendar Block — Type Definitions
 *
 * Supports appointments, availability windows, and recurring events
 * for any SaaS niche (clinic, salon, gym, etc.)
 */

export type EventStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

// ── Core Event ────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  org_id: string
  title: string
  description?: string
  start_at: string          // ISO 8601
  end_at: string            // ISO 8601
  all_day: boolean
  status: EventStatus
  /** Staff member / resource assigned to this event */
  assignee_id?: string
  /** Client / customer this event is for */
  client_id?: string
  /** Optional location or room */
  location?: string
  /** Colour hex for UI display */
  color?: string
  /** If this is part of a recurring series */
  recurrence_id?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface AvailabilityWindow {
  id: string
  org_id: string
  /** Staff member this availability belongs to */
  staff_id: string
  day_of_week: DayOfWeek
  start_time: string        // "HH:MM" 24h format
  end_time: string          // "HH:MM" 24h format
  /** Slot duration in minutes (e.g., 30, 60) */
  slot_duration_minutes: number
  is_active: boolean
  created_at: string
}

export interface BlockedSlot {
  id: string
  org_id: string
  staff_id: string
  start_at: string
  end_at: string
  reason?: string
  created_at: string
}

// ── Recurrence ────────────────────────────────────────────────────────────────

export interface RecurrenceRule {
  id: string
  org_id: string
  frequency: RecurrenceFrequency
  interval: number          // Every N frequency units
  days_of_week?: DayOfWeek[]
  until?: string            // ISO 8601 end date
  count?: number            // Max occurrences
  created_at: string
}

// ── Booking ───────────────────────────────────────────────────────────────────

export interface BookingSlot {
  start_at: string
  end_at: string
  staff_id: string
  available: boolean
}

export interface CreateEventInput {
  title: string
  description?: string
  start_at: string
  end_at: string
  all_day?: boolean
  assignee_id?: string
  client_id?: string
  location?: string
  color?: string
  recurrence?: Omit<RecurrenceRule, 'id' | 'org_id' | 'created_at'>
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus
}

export interface GetAvailableSlotsInput {
  staff_id: string
  date: string              // "YYYY-MM-DD"
  duration_minutes: number
}
