/**
 * Notifications Block — React Hooks
 *
 * Provides real-time in-app notifications via Supabase Realtime.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../lib/notification-client'
import type { Notification } from '../types'

// ── Main Hook ─────────────────────────────────────────────────────────────────

interface UseNotificationsOptions {
  userId: string
  /** Subscribe to real-time updates (default: true) */
  realtime?: boolean
  limit?: number
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  markRead: (ids: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(opts: UseNotificationsOptions): UseNotificationsReturn {
  const { userId, realtime = true, limit = 50 } = opts
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const [notifs, count] = await Promise.all([
        getNotifications({ user_id: userId, channel: 'in_app', limit }),
        getUnreadCount(userId),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [userId, limit])

  // Initial load
  useEffect(() => {
    setIsLoading(true)
    refresh()
  }, [refresh])

  // Realtime subscription
  useEffect(() => {
    if (!realtime) return

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const supabase = createClient(url, key)

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev])
          if (!newNotif.read_at) {
            setUnreadCount(c => c + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n))
          // Recompute unread count
          getUnreadCount(userId).then(setUnreadCount).catch(() => {})
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, realtime])

  const markRead = useCallback(async (ids: string[]) => {
    await markAsRead(ids)
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, status: 'read' as const, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(c => Math.max(0, c - ids.length))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllAsRead(userId)
    setNotifications(prev =>
      prev.map(n => ({ ...n, status: 'read' as const, read_at: n.read_at ?? new Date().toISOString() }))
    )
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, isLoading, error, markRead, markAllRead, refresh }
}
