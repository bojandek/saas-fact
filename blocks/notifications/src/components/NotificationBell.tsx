/**
 * Notifications Block — NotificationBell Component
 *
 * A bell icon with unread badge that opens a dropdown notification list.
 * Designed to sit in the app header/navbar.
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  userId: string
  /** Max notifications to show in dropdown */
  maxVisible?: number
  /** Callback when user clicks a notification with an action_url */
  onNavigate?: (url: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell({
  userId,
  maxVisible = 10,
  onNavigate,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotifications({ userId, realtime: true, limit: maxVisible })

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read_at) {
      await markRead([notif.id])
    }
    if (notif.action_url && onNavigate) {
      onNavigate(notif.action_url)
      setIsOpen(false)
    }
  }

  const priorityDot: Record<Notification['priority'], string> = {
    low: 'bg-gray-400',
    normal: 'bg-blue-400',
    high: 'bg-orange-400',
    urgent: 'bg-red-500',
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          className="w-5 h-5 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {isLoading && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">
                Loading…
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}

            {notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notif.read_at ? 'bg-primary/5' : ''
                }`}
              >
                {/* Priority dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${priorityDot[notif.priority]}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!notif.read_at ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notif.read_at && (
                  <div className="mt-1.5 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
