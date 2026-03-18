/**
 * Calendar Block — Supabase Client
 *
 * All queries are org-scoped via RLS (org_id enforced at DB level).
 * This client assumes `app.current_org_id` is set by the auth middleware.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  CalendarEvent,
  AvailabilityWindow,
  BlockedSlot,
  BookingSlot,
  CreateEventInput,
  UpdateEventInput,
  GetAvailableSlotsInput,
} from '../types'
import { addMinutes, format, parseISO, isWithinInterval, eachMinuteOfInterval } from 'date-fns'

// ── Client Factory ─────────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null

export function getCalendarClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars for calendar block')
    _client = createClient(url, key)
  }
  return _client
}

// ── Events CRUD ───────────────────────────────────────────────────────────────

export async function getEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const { data, error } = await getCalendarClient()
    .from('calendar_events')
    .select('*')
    .gte('start_at', startDate)
    .lte('end_at', endDate)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch events: ${error.message}`)
  return data as CalendarEvent[]
}

export async function getEventById(id: string): Promise<CalendarEvent | null> {
  const { data, error } = await getCalendarClient()
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CalendarEvent
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const { data, error } = await getCalendarClient()
    .from('calendar_events')
    .insert({
      ...input,
      all_day: input.all_day ?? false,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create event: ${error.message}`)
  return data as CalendarEvent
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<CalendarEvent> {
  const { data, error } = await getCalendarClient()
    .from('calendar_events')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update event: ${error.message}`)
  return data as CalendarEvent
}

export async function cancelEvent(id: string): Promise<void> {
  const { error } = await getCalendarClient()
    .from('calendar_events')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to cancel event: ${error.message}`)
}

// ── Availability ──────────────────────────────────────────────────────────────

export async function getStaffAvailability(
  staffId: string
): Promise<AvailabilityWindow[]> {
  const { data, error } = await getCalendarClient()
    .from('availability_windows')
    .select('*')
    .eq('staff_id', staffId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })

  if (error) throw new Error(`Failed to fetch availability: ${error.message}`)
  return data as AvailabilityWindow[]
}

export async function getBlockedSlots(
  staffId: string,
  date: string
): Promise<BlockedSlot[]> {
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const { data, error } = await getCalendarClient()
    .from('blocked_slots')
    .select('*')
    .eq('staff_id', staffId)
    .gte('start_at', dayStart)
    .lte('end_at', dayEnd)

  if (error) throw new Error(`Failed to fetch blocked slots: ${error.message}`)
  return data as BlockedSlot[]
}

/**
 * Compute available booking slots for a staff member on a given date.
 *
 * Algorithm:
 *   1. Get availability windows for that day of week
 *   2. Generate all possible slots (every slot_duration_minutes)
 *   3. Remove slots that overlap with existing events or blocked slots
 */
export async function getAvailableSlots(
  input: GetAvailableSlotsInput
): Promise<BookingSlot[]> {
  const { staff_id, date, duration_minutes } = input
  const parsedDate = parseISO(date)
  const dayOfWeek = parsedDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

  // 1. Get availability windows for this day
  const allWindows = await getStaffAvailability(staff_id)
  const dayWindows = allWindows.filter(w => w.day_of_week === dayOfWeek)

  if (dayWindows.length === 0) return []

  // 2. Get existing events for this staff on this date
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [existingEvents, blockedSlots] = await Promise.all([
    getCalendarClient()
      .from('calendar_events')
      .select('start_at, end_at')
      .eq('assignee_id', staff_id)
      .gte('start_at', dayStart)
      .lte('end_at', dayEnd)
      .neq('status', 'cancelled')
      .then(r => r.data ?? []),
    getBlockedSlots(staff_id, date),
  ])

  // 3. Generate all possible slots from availability windows
  const slots: BookingSlot[] = []

  for (const window of dayWindows) {
    const [startHour, startMin] = window.start_time.split(':').map(Number)
    const [endHour, endMin] = window.end_time.split(':').map(Number)

    const windowStart = new Date(parsedDate)
    windowStart.setHours(startHour, startMin, 0, 0)

    const windowEnd = new Date(parsedDate)
    windowEnd.setHours(endHour, endMin, 0, 0)

    let slotStart = windowStart
    while (addMinutes(slotStart, duration_minutes) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, duration_minutes)

      // Check if slot overlaps with any existing event or blocked slot
      const isOccupied = [...existingEvents, ...blockedSlots].some(busy => {
        const busyStart = parseISO(busy.start_at)
        const busyEnd = parseISO(busy.end_at)
        return slotStart < busyEnd && slotEnd > busyStart
      })

      // Skip slots in the past
      const isPast = slotStart < new Date()

      slots.push({
        start_at: slotStart.toISOString(),
        end_at: slotEnd.toISOString(),
        staff_id,
        available: !isOccupied && !isPast,
      })

      slotStart = addMinutes(slotStart, window.slot_duration_minutes)
    }
  }

  return slots
}
