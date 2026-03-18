/**
 * Retry utility with exponential backoff for AI API calls.
 *
 * Handles transient failures from OpenAI (429 rate limit, 500/503 server errors)
 * with configurable retry attempts, base delay, and jitter to avoid thundering herd.
 */
export interface RetryOptions {
    /** Maximum number of attempts (including the first try). Default: 4 */
    maxAttempts?: number;
    /** Base delay in milliseconds before first retry. Default: 500ms */
    baseDelayMs?: number;
    /** Maximum delay cap in milliseconds. Default: 30_000ms (30s) */
    maxDelayMs?: number;
    /** Whether to add random jitter to avoid thundering herd. Default: true */
    jitter?: boolean;
    /** HTTP status codes that should trigger a retry. Default: [429, 500, 502, 503, 504] */
    retryableStatusCodes?: number[];
    /** Optional callback invoked before each retry attempt */
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}
/**
 * Calculates the delay for a given attempt using exponential backoff with optional jitter.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) ± jitter
 */
export declare function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, jitter: boolean): number;
/**
 * Determines whether an error is retryable based on its HTTP status code
 * or known transient error messages from OpenAI SDK.
 */
export declare function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean;
/**
 * Executes an async function with automatic retry on transient failures.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => llm.chat({ ... }),
 *   { maxAttempts: 4, onRetry: (attempt, err) => logger.warn({ attempt, err }, 'Retrying') }
 * )
 * ```
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map