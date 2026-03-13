/**
 * Sentry Error Tracking Integration
 * Captures errors, performance, and sessions
 */

import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  Sentry not configured (SENTRY_DSN missing)')
    return
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    
    // Session tracking
    autoSessionTracking: true,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Replay configuration
    replaySessionSampleRate: 0.1,
    replayOnErrorSampleRate: 1.0,

    // Ignore known non-critical errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection caught',
    ],
  })

  console.log('✅ Sentry initialized')
}

/**
 * Capture user context for error tracking
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/**
 * Capture custom event
 */
export function captureEvent(event: {
  message: string
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  tags?: Record<string, string>
  extra?: Record<string, any>
}) {
  Sentry.captureMessage(event.message, event.level || 'info')
  if (event.tags) Sentry.setTags(event.tags)
  if (event.extra) Sentry.setContext('details', event.extra)
}

/**
 * Manual error capture
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error)
  if (context) Sentry.setContext('error_context', context)
}
