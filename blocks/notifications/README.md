# @saas-factory/blocks-notifications

Notifications block for SaaS Factory. Provides a unified delivery pipeline for in-app, email, push, and SMS notifications with real-time Supabase Realtime support.

## Features

- **In-app notifications** with real-time delivery via Supabase Realtime
- **Email** via Resend API (with HTML template)
- **Push notifications** via Web Push API (VAPID)
- **SMS** via Twilio
- **Template system** — Handlebars-style `{{variable}}` interpolation
- **Notification preferences** — per-user channel opt-in/out
- **Unread badge** with real-time count
- **RLS-enforced** — users only see their own notifications

## Installation

```bash
pnpm add @saas-factory/blocks-notifications
```

## Quick Start

### Bell in Navbar

```tsx
import { NotificationBell } from '@saas-factory/blocks-notifications'

export function Navbar({ userId }: { userId: string }) {
  return (
    <nav>
      <NotificationBell
        userId={userId}
        onNavigate={(url) => router.push(url)}
      />
    </nav>
  )
}
```

### Send a Notification (Server)

```ts
import { sendNotification } from '@saas-factory/blocks-notifications'

await sendNotification({
  user_id: 'uuid',
  channel: 'in_app',
  title: 'Appointment Confirmed',
  body: 'Your appointment on Monday at 10:00 has been confirmed.',
  action_url: '/appointments/uuid',
  priority: 'high',
})
```

### Send from Template

```ts
import { sendFromTemplate } from '@saas-factory/blocks-notifications'

await sendFromTemplate({
  user_id: 'uuid',
  template_slug: 'appointment_reminder',
  variables: {
    name: 'Ana',
    time: '10:00',
    date: 'Monday, March 18',
  },
})
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `RESEND_API_KEY` | Email only | Resend API key |
| `NOTIFICATION_FROM_EMAIL` | Email only | Sender email address |
| `TWILIO_ACCOUNT_SID` | SMS only | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | SMS only | Twilio auth token |
| `TWILIO_FROM_NUMBER` | SMS only | Twilio phone number |

## Database Migration

```bash
supabase db push --file blocks/notifications/src/lib/migration.sql
```
