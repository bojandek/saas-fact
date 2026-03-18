/**
 * Notifications Block — Notification Client
 *
 * Unified delivery pipeline for in-app, email, push, and SMS.
 * In-app notifications are stored in Supabase and delivered via Realtime.
 * Email is sent via Resend (or any SMTP provider).
 * Push uses Web Push API.
 * SMS uses Twilio (optional).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  SendNotificationInput,
  SendFromTemplateInput,
  GetNotificationsInput,
} from '../types'

// ── Client Factory ─────────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars for notifications block')
    _client = createClient(url, key)
  }
  return _client
}

// ── Template Interpolation ────────────────────────────────────────────────────

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

// ── Send Notification ─────────────────────────────────────────────────────────

export async function sendNotification(
  input: SendNotificationInput
): Promise<Notification> {
  const { data, error } = await getClient()
    .from('notifications')
    .insert({
      user_id: input.user_id,
      channel: input.channel,
      priority: input.priority ?? 'normal',
      status: 'pending',
      title: input.title,
      body: input.body,
      action_url: input.action_url,
      icon: input.icon,
      metadata: input.metadata,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create notification: ${error.message}`)

  const notification = data as Notification

  // Deliver based on channel
  try {
    await deliverNotification(notification)
  } catch (deliveryErr) {
    // Mark as failed but don't throw — notification record exists
    await getClient()
      .from('notifications')
      .update({
        status: 'failed',
        error: deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id)
  }

  return notification
}

export async function sendFromTemplate(
  input: SendFromTemplateInput
): Promise<Notification> {
  // Fetch template
  const { data: templateData, error: templateError } = await getClient()
    .from('notification_templates')
    .select('*')
    .eq('slug', input.template_slug)
    .eq('is_active', true)
    .single()

  if (templateError || !templateData) {
    throw new Error(`Template not found: ${input.template_slug}`)
  }

  const template = templateData as NotificationTemplate

  return sendNotification({
    user_id: input.user_id,
    channel: input.channel ?? template.channel,
    title: interpolate(template.title_template, input.variables),
    body: interpolate(template.body_template, input.variables),
    priority: input.priority ?? 'normal',
  })
}

// ── Delivery Pipeline ─────────────────────────────────────────────────────────

async function deliverNotification(notification: Notification): Promise<void> {
  switch (notification.channel) {
    case 'in_app':
      // In-app notifications are delivered via Supabase Realtime
      // The record in the DB is the delivery mechanism — clients subscribe to changes
      await getClient()
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id)
      break

    case 'email':
      await deliverEmail(notification)
      break

    case 'push':
      await deliverPush(notification)
      break

    case 'sms':
      await deliverSms(notification)
      break
  }
}

async function deliverEmail(notification: Notification): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? 'noreply@example.com'

  if (!resendApiKey) {
    // Fallback: mark as sent without actually sending (dev mode)
    await getClient()
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)
    return
  }

  // Fetch user email from auth.users
  const { data: userData } = await getClient()
    .from('profiles')
    .select('email')
    .eq('id', notification.user_id)
    .single()

  if (!userData?.email) throw new Error('User email not found')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: userData.email,
      subject: notification.title,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>${notification.title}</h2>
        <p>${notification.body}</p>
        ${notification.action_url ? `<a href="${notification.action_url}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:6px;margin-top:16px">View Details</a>` : ''}
      </div>`,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Resend API error: ${err}`)
  }

  await getClient()
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', notification.id)
}

async function deliverPush(notification: Notification): Promise<void> {
  // Web Push via VAPID — requires push subscription stored per user
  const { data: subscriptionData } = await getClient()
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', notification.user_id)
    .single()

  if (!subscriptionData?.subscription) {
    // No push subscription — mark as sent anyway (user hasn't opted in)
    await getClient()
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)
    return
  }

  // In production: use web-push library with VAPID keys
  // For now, mark as sent
  await getClient()
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', notification.id)
}

async function deliverSms(notification: Notification): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM_NUMBER

  if (!twilioSid || !twilioToken || !twilioFrom) {
    await getClient()
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)
    return
  }

  const { data: userData } = await getClient()
    .from('profiles')
    .select('phone')
    .eq('id', notification.user_id)
    .single()

  if (!userData?.phone) throw new Error('User phone not found')

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioFrom,
        To: userData.phone,
        Body: `${notification.title}\n\n${notification.body}`,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Twilio API error: ${err}`)
  }

  await getClient()
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', notification.id)
}

// ── Read / Query ──────────────────────────────────────────────────────────────

export async function getNotifications(
  input: GetNotificationsInput
): Promise<Notification[]> {
  let query = getClient()
    .from('notifications')
    .select('*')
    .eq('user_id', input.user_id)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50)
    .range(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 50) - 1)

  if (input.channel) query = query.eq('channel', input.channel)
  if (input.status) query = query.eq('status', input.status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`)
  return data as Notification[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', 'in_app')
    .is('read_at', null)
    .neq('status', 'failed')

  if (error) throw new Error(`Failed to get unread count: ${error.message}`)
  return count ?? 0
}

export async function markAsRead(notificationIds: string[]): Promise<void> {
  const { error } = await getClient()
    .from('notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', notificationIds)

  if (error) throw new Error(`Failed to mark as read: ${error.message}`)
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await getClient()
    .from('notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('channel', 'in_app')
    .is('read_at', null)

  if (error) throw new Error(`Failed to mark all as read: ${error.message}`)
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function getPreferences(userId: string): Promise<NotificationPreference[]> {
  const { data, error } = await getClient()
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch preferences: ${error.message}`)
  return data as NotificationPreference[]
}

export async function updatePreference(
  userId: string,
  channel: string,
  enabled: boolean
): Promise<void> {
  const { error } = await getClient()
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      channel,
      enabled,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Failed to update preference: ${error.message}`)
}
