/**
 * @saas-factory/blocks-calendar
 *
 * Calendar & scheduling block for SaaS Factory.
 * Provides events, availability windows, and a booking widget.
 *
 * Usage:
 *   import { CalendarView, BookingWidget, useCalendar } from '@saas-factory/blocks-calendar'
 */

// Components
export { CalendarView, EventCard } from './components/CalendarView'
export { BookingWidget } from './components/BookingWidget'

// Hooks
export { useCalendar, useAvailableSlots } from './hooks/useCalendar'

// Client functions (for server components / API routes)
export {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  getStaffAvailability,
  getAvailableSlots,
} from './lib/calendar-client'

// Types
export type {
  CalendarEvent,
  AvailabilityWindow,
  BlockedSlot,
  BookingSlot,
  RecurrenceRule,
  CreateEventInput,
  UpdateEventInput,
  GetAvailableSlotsInput,
  EventStatus,
  RecurrenceFrequency,
  DayOfWeek,
} from './types'
