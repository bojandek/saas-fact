/**
 * Calendar Block — BookingWidget Component
 *
 * A self-contained booking flow: pick a date → pick a slot → confirm.
 * Works for any niche: clinic appointments, salon bookings, gym classes, etc.
 */

'use client'

import React, { useState } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import { useAvailableSlots } from '../hooks/useCalendar'
import type { BookingSlot } from '../types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface BookingWidgetProps {
  staffId: string
  durationMinutes: number
  /** Called when user confirms a slot */
  onBook: (slot: BookingSlot) => Promise<void>
  /** Optional: label for the service being booked */
  serviceLabel?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingWidget({
  staffId,
  durationMinutes,
  onBook,
  serviceLabel = 'Appointment',
}: BookingWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const { slots, isLoading, error } = useAvailableSlots({
    staff_id: staffId,
    date: selectedDate,
    duration_minutes: durationMinutes,
  })

  const availableSlots = slots.filter(s => s.available)

  // Generate next 14 days for date picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(startOfDay(new Date()), i)
    return format(d, 'yyyy-MM-dd')
  })

  const handleConfirm = async () => {
    if (!selectedSlot) return
    setIsBooking(true)
    setBookingError(null)
    try {
      await onBook(selectedSlot)
      setBookingSuccess(true)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setIsBooking(false)
    }
  }

  if (bookingSuccess) {
    return (
      <div className="bg-background border rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Booking Confirmed!</h3>
        <p className="text-sm text-muted-foreground">
          {serviceLabel} on {format(new Date(selectedSlot!.start_at), 'PPp')}
        </p>
        <button
          onClick={() => { setBookingSuccess(false); setSelectedSlot(null) }}
          className="mt-4 text-sm text-primary underline"
        >
          Book another
        </button>
      </div>
    )
  }

  return (
    <div className="bg-background border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-foreground">Book {serviceLabel}</h3>

      {/* Date Picker */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
          Select Date
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {dateOptions.map(date => (
            <button
              key={date}
              onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-colors ${
                selectedDate === date
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              <span className="font-medium">{format(new Date(date), 'EEE')}</span>
              <span className="text-base font-bold">{format(new Date(date), 'd')}</span>
              <span className="opacity-70">{format(new Date(date), 'MMM')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
          Available Times
        </label>

        {isLoading && (
          <div className="text-sm text-muted-foreground animate-pulse">Loading slots…</div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {!isLoading && !error && availableSlots.length === 0 && (
          <div className="text-sm text-muted-foreground">No available slots on this date.</div>
        )}

        {!isLoading && availableSlots.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {availableSlots.map(slot => (
              <button
                key={slot.start_at}
                onClick={() => setSelectedSlot(slot)}
                className={`py-2 text-sm rounded-lg border transition-colors ${
                  selectedSlot?.start_at === slot.start_at
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
              >
                {format(new Date(slot.start_at), 'HH:mm')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirm */}
      {selectedSlot && (
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground mb-3">
            Booking: <span className="font-medium text-foreground">
              {format(new Date(selectedSlot.start_at), 'PPp')}
            </span>
          </p>
          {bookingError && (
            <p className="text-sm text-destructive mb-2">{bookingError}</p>
          )}
          <button
            onClick={handleConfirm}
            disabled={isBooking}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isBooking ? 'Confirming…' : `Confirm ${serviceLabel}`}
          </button>
        </div>
      )}
    </div>
  )
}
