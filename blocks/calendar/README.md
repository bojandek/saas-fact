# @saas-factory/blocks-calendar

Calendar & scheduling block for SaaS Factory. Provides a full scheduling system with events, staff availability windows, and a booking widget — ready for any niche (clinic, salon, gym, etc.).

## Features

- **Week-view calendar** with colour-coded events
- **Availability windows** per staff member (day-of-week + time range)
- **Booking widget** — pick date → pick slot → confirm
- **Slot availability engine** — automatically excludes booked and blocked slots
- **RLS-enforced** — all data is isolated per `org_id`
- **Recurring events** support (daily, weekly, monthly, yearly)

## Installation

```bash
pnpm add @saas-factory/blocks-calendar
```

## Quick Start

```tsx
import { CalendarView, useCalendar } from '@saas-factory/blocks-calendar'

export default function SchedulePage() {
  const { events, isLoading, create, cancel } = useCalendar({
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-03-31T23:59:59Z',
  })

  return (
    <CalendarView
      events={events}
      isLoading={isLoading}
      onEventClick={(e) => console.log(e)}
      onSlotClick={(date, hour) => console.log(date, hour)}
    />
  )
}
```

## Booking Widget

```tsx
import { BookingWidget } from '@saas-factory/blocks-calendar'

<BookingWidget
  staffId="uuid-of-staff"
  durationMinutes={60}
  serviceLabel="Consultation"
  onBook={async (slot) => {
    await createEvent({
      title: 'Consultation',
      start_at: slot.start_at,
      end_at: slot.end_at,
      assignee_id: slot.staff_id,
    })
  }}
/>
```

## Database Migration

Run the migration in `src/lib/migration.sql` against your Supabase project:

```bash
supabase db push --file blocks/calendar/src/lib/migration.sql
```

## Tables

| Table | Description |
|---|---|
| `calendar_events` | All events/appointments |
| `availability_windows` | Staff working hours per day |
| `blocked_slots` | Time-off, breaks, unavailable periods |
