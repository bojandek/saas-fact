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
import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export type Logger = typeof logger;
//# sourceMappingURL=logger.d.ts.map