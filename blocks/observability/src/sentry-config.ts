/**
 * Sentry Configuration - Enterprise Error Tracking & Monitoring
 * Centralized observability for all SaaS Factory applications
 */

import * as Sentry from '@sentry/nextjs';

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  enableTracing: boolean;
  integrations?: Sentry.Integration[];
}

const getConfig = (): SentryConfig => ({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  enableTracing: true,
  integrations: [
    // Browser monitoring
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    // Performance monitoring
    new Sentry.Integrations.BrowserTracing(),
  ],
});

/**
 * Initialize Sentry for Next.js Applications
 * Must be called in: next.config.js, pages/_app.tsx, pages/_document.tsx
 */
export function initSentry(config?: Partial<SentryConfig>) {
  const finalConfig = { ...getConfig(), ...config };

  Sentry.init({
    dsn: finalConfig.dsn,
    environment: finalConfig.environment,
    tracesSampleRate: finalConfig.tracesSampleRate,
    replaysSessionSampleRate: finalConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: finalConfig.replaysOnErrorSampleRate,
    integrations: finalConfig.integrations,
    
    // Performance Monitoring
    beforeSend: (event, hint) => {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send 404s or network errors
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('NetworkError')) {
            return null;
          }
        }
      }
      
      return event;
    },

    // Attach breadcrumbs for debugging
    attachStacktrace: true,
    maxBreadcrumbs: 100,
  });
}

/**
 * Sentry Error Levels & Severity
 */
export enum ErrorSeverity {
  Fatal = 'fatal',      // System is down
  Error = 'error',      // Feature broken
  Warning = 'warning',  // Degraded behavior
  Info = 'info',        // FYI
  Debug = 'debug',      // Development
}

/**
 * Capture error with context
 */
export function captureError(
  error: Error | string,
  context: Record<string, any> = {},
  severity: ErrorSeverity = ErrorSeverity.Error
) {
  Sentry.captureException(typeof error === 'string' ? new Error(error) : error, {
    level: severity as Sentry.SeverityLevel,
    tags: {
      timestamp: new Date().toISOString(),
    },
    contexts: {
      error: context,
    },
  });
}

/**
 * User context for error tracking
 */
export function setUserContext(userId: string, email?: string, subscription?: string) {
  Sentry.setUser({
    id: userId,
    email,
    subscription_tier: subscription,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Transaction tracking for performance monitoring
 */
export function startTransaction(name: string, op: string = 'http.request') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Health check endpoint for Sentry
 */
export async function healthCheck() {
  try {
    const transaction = startTransaction('Health Check', 'health_check');
    
    // Check database connection
    const span = transaction.startChild({ op: 'db.check', description: 'Database health' });
    // Database check logic here
    span.finish();

    // Check Redis connection
    const redisSpan = transaction.startChild({ op: 'cache.check', description: 'Redis health' });
    // Redis check logic here
    redisSpan.finish();

    transaction.finish();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    captureError(error as Error, { endpoint: 'healthCheck' }, ErrorSeverity.Fatal);
    throw error;
  }
}

export default {
  initSentry,
  captureError,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
  healthCheck,
};
