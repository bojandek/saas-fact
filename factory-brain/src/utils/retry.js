"use strict";
/**
 * Retry utility with exponential backoff for AI API calls.
 *
 * Handles transient failures from OpenAI (429 rate limit, 500/503 server errors)
 * with configurable retry attempts, base delay, and jitter to avoid thundering herd.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDelay = calculateDelay;
exports.isRetryableError = isRetryableError;
exports.withRetry = withRetry;
const DEFAULT_OPTIONS = {
    maxAttempts: 4,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    jitter: true,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: () => { },
};
/**
 * Calculates the delay for a given attempt using exponential backoff with optional jitter.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) ± jitter
 */
function calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter) {
    const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
    if (!jitter)
        return exponential;
    // Full jitter: random value between 0 and exponential delay
    return Math.floor(Math.random() * exponential);
}
/**
 * Determines whether an error is retryable based on its HTTP status code
 * or known transient error messages from OpenAI SDK.
 */
function isRetryableError(error, retryableStatusCodes) {
    if (error instanceof Error) {
        // OpenAI SDK errors have a `status` property
        const status = error.status;
        if (status !== undefined) {
            return retryableStatusCodes.includes(status);
        }
        // Network-level errors
        const message = error.message.toLowerCase();
        if (message.includes('econnreset') ||
            message.includes('econnrefused') ||
            message.includes('etimedout') ||
            message.includes('network') ||
            message.includes('fetch failed') ||
            message.includes('socket hang up')) {
            return true;
        }
    }
    return false;
}
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
async function withRetry(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            const isLast = attempt === opts.maxAttempts - 1;
            if (isLast || !isRetryableError(error, opts.retryableStatusCodes)) {
                throw error;
            }
            const delayMs = calculateDelay(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.jitter);
            opts.onRetry(attempt + 1, error, delayMs);
            await sleep(delayMs);
        }
    }
    throw lastError;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map