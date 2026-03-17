/**
 * Structured logger for Factory Brain using Pino.
 *
 * Outputs JSON in production (NODE_ENV=production) for log aggregation
 * tools like Grafana Loki, Datadog, or AWS CloudWatch.
 *
 * Outputs pretty-printed, human-readable logs in development.
 *
 * Usage:
 *   import { logger } from './utils/logger'
 *
 *   logger.info({ userId: '123' }, 'User logged in')
 *   logger.warn({ attempt: 2, delayMs: 1000 }, 'Retrying AI call')
 *   logger.error({ err }, 'Agent failed')
 *
 *   const agentLog = logger.child({ agent: 'ArchitectAgent' })
 *   agentLog.info('Starting blueprint generation')
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

  // In development: pretty-print with colors and timestamps
  // In production: structured JSON for log aggregation
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '[{agent}] {msg}',
        },
      }
    : undefined,

  // Base fields included in every log entry
  base: {
    service: 'factory-brain',
    version: process.env.npm_package_version ?? 'unknown',
    env: process.env.NODE_ENV ?? 'development',
  },

  // Serialize Error objects properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'apiKey',
      'api_key',
      'openaiApiKey',
      'supabaseKey',
      'password',
      'token',
      'authorization',
      'cookie',
      '*.apiKey',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
})

// Convenience re-export for child loggers
export type Logger = typeof logger
