/**
 * @saas-factory/blocks-notifications
 *
 * Notifications block for SaaS Factory.
 * Provides in-app, email, push, and SMS notifications
 * with a unified delivery pipeline and real-time Supabase Realtime support.
 *
 * Usage:
 *   import { NotificationBell, useNotifications, sendNotification } from '@saas-factory/blocks-notifications'
 */

// Components
export { NotificationBell } from './components/NotificationBell'

// Hooks
export { useNotifications } from './hooks/useNotifications'

// Client functions (for server components / API routes)
export {
  sendNotification,
  sendFromTemplate,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
} from './lib/notification-client'

// Types
export type {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  SendNotificationInput,
  SendFromTemplateInput,
  GetNotificationsInput,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from './types'
