/**
 * Structured Logging with Pino
 * JSON-formatted logs for production
 */

import pino from 'pino'

export type Logger = ReturnType<typeof createLogger>

const isDev = process.env.NODE_ENV === 'development'

export function createLogger(label: string) {
  return pino(
    {
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      base: {
        service: 'saas-factory',
        label,
        environment: process.env.NODE_ENV,
      },
    },
    isDev ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: false,
      },
    }) : undefined
  )
}

/**
 * Request logging middleware
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const logger = createLogger('api')
    const start = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - start
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    })

    next()
  }
}
