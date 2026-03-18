/**
 * Notifications Block — Type Definitions
 *
 * Supports in-app, email, push, and SMS notifications
 * with a unified delivery pipeline.
 */

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// ── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  org_id: string
  /** Recipient user ID */
  user_id: string
  channel: NotificationChannel
  priority: NotificationPriority
  status: NotificationStatus
  title: string
  body: string
  /** Optional action URL for in-app / push notifications */
  action_url?: string
  /** Optional icon name or URL */
  icon?: string
  /** Arbitrary metadata (e.g., related entity ID) */
  metadata?: Record<string, unknown>
  /** When the notification was read (in-app only) */
  read_at?: string
  /** When the notification was sent to the channel provider */
  sent_at?: string
  /** Error message if delivery failed */
  error?: string
  created_at: string
  updated_at: string
}

// ── Template ──────────────────────────────────────────────────────────────────

export interface NotificationTemplate {
  id: string
  org_id: string
  /** Unique slug used to reference this template in code */
  slug: string
  name: string
  channel: NotificationChannel
  /** Handlebars-style template: "Hello {{name}}, your appointment is at {{time}}" */
  title_template: string
  body_template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Preference ────────────────────────────────────────────────────────────────

export interface NotificationPreference {
  id: string
  org_id: string
  user_id: string
  channel: NotificationChannel
  /** Whether this channel is enabled for this user */
  enabled: boolean
  /** Quiet hours: don't send between these times (local timezone) */
  quiet_hours_start?: string   // "HH:MM"
  quiet_hours_end?: string     // "HH:MM"
  created_at: string
  updated_at: string
}

// ── Send Input ────────────────────────────────────────────────────────────────

export interface SendNotificationInput {
  user_id: string
  channel: NotificationChannel
  title: string
  body: string
  priority?: NotificationPriority
  action_url?: string
  icon?: string
  metadata?: Record<string, unknown>
}

export interface SendFromTemplateInput {
  user_id: string
  template_slug: string
  /** Variables to interpolate into the template */
  variables: Record<string, string>
  channel?: NotificationChannel
  priority?: NotificationPriority
}

export interface MarkReadInput {
  notification_ids: string[]
}

export interface GetNotificationsInput {
  user_id: string
  channel?: NotificationChannel
  status?: NotificationStatus
  limit?: number
  offset?: number
}
