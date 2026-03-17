/**
 * Retry utility with exponential backoff for AI API calls.
 *
 * Handles transient failures from OpenAI (429 rate limit, 500/503 server errors)
 * with configurable retry attempts, base delay, and jitter to avoid thundering herd.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first try). Default: 4 */
  maxAttempts?: number
  /** Base delay in milliseconds before first retry. Default: 500ms */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds. Default: 30_000ms (30s) */
  maxDelayMs?: number
  /** Whether to add random jitter to avoid thundering herd. Default: true */
  jitter?: boolean
  /** HTTP status codes that should trigger a retry. Default: [429, 500, 502, 503, 504] */
  retryableStatusCodes?: number[]
  /** Optional callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: true,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  onRetry: () => {},
}

/**
 * Calculates the delay for a given attempt using exponential backoff with optional jitter.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) ± jitter
 */
export function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  if (!jitter) return exponential
  // Full jitter: random value between 0 and exponential delay
  return Math.floor(Math.random() * exponential)
}

/**
 * Determines whether an error is retryable based on its HTTP status code
 * or known transient error messages from OpenAI SDK.
 */
export function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof Error) {
    // OpenAI SDK errors have a `status` property
    const status = (error as Error & { status?: number }).status
    if (status !== undefined) {
      return retryableStatusCodes.includes(status)
    }

    // Network-level errors
    const message = error.message.toLowerCase()
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up')
    ) {
      return true
    }
  }
  return false
}

/**
 * Executes an async function with automatic retry on transient failures.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => openai.chat.completions.create({ ... }),
 *   { maxAttempts: 4, onRetry: (attempt, err) => logger.warn({ attempt, err }, 'Retrying') }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const isLast = attempt === opts.maxAttempts - 1
      if (isLast || !isRetryableError(error, opts.retryableStatusCodes)) {
        throw error
      }

      const delayMs = calculateDelay(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.jitter)
      opts.onRetry(attempt + 1, error, delayMs)

      await sleep(delayMs)
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
