import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, calculateDelay, isRetryableError } from './retry'

// Mock setTimeout to speed up tests
vi.useFakeTimers()

describe('calculateDelay', () => {
  it('should return exponential delay without jitter', () => {
    expect(calculateDelay(0, 500, 30000, false)).toBe(500)
    expect(calculateDelay(1, 500, 30000, false)).toBe(1000)
    expect(calculateDelay(2, 500, 30000, false)).toBe(2000)
    expect(calculateDelay(3, 500, 30000, false)).toBe(4000)
  })

  it('should cap delay at maxDelayMs', () => {
    expect(calculateDelay(10, 500, 30000, false)).toBe(30000)
  })

  it('should return value between 0 and exponential when jitter is enabled', () => {
    const delay = calculateDelay(2, 500, 30000, true)
    expect(delay).toBeGreaterThanOrEqual(0)
    expect(delay).toBeLessThanOrEqual(2000)
  })
})

describe('isRetryableError', () => {
  it('should return true for 429 status', () => {
    const error = Object.assign(new Error('Rate limited'), { status: 429 })
    expect(isRetryableError(error, [429, 500, 503])).toBe(true)
  })

  it('should return true for 500 status', () => {
    const error = Object.assign(new Error('Server error'), { status: 500 })
    expect(isRetryableError(error, [429, 500, 503])).toBe(true)
  })

  it('should return false for 400 status (bad request - not retryable)', () => {
    const error = Object.assign(new Error('Bad request'), { status: 400 })
    expect(isRetryableError(error, [429, 500, 503])).toBe(false)
  })

  it('should return false for 401 status (auth error - not retryable)', () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 })
    expect(isRetryableError(error, [429, 500, 503])).toBe(false)
  })

  it('should return true for network errors', () => {
    expect(isRetryableError(new Error('ECONNRESET'), [429])).toBe(true)
    expect(isRetryableError(new Error('fetch failed'), [429])).toBe(true)
    expect(isRetryableError(new Error('socket hang up'), [429])).toBe(true)
  })

  it('should return false for non-Error values', () => {
    expect(isRetryableError('string error', [429, 500])).toBe(false)
    expect(isRetryableError(null, [429, 500])).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, jitter: false })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable error and succeed on second attempt', async () => {
    const retryableError = Object.assign(new Error('Rate limited'), { status: 429 })
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('success after retry')

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, jitter: false })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success after retry')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should throw immediately on non-retryable error', async () => {
    const nonRetryableError = Object.assign(new Error('Bad request'), { status: 400 })
    const fn = vi.fn().mockRejectedValue(nonRetryableError)

    await expect(
      withRetry(fn, { maxAttempts: 4, baseDelayMs: 100, jitter: false })
    ).rejects.toThrow('Bad request')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should exhaust all attempts and throw last error', async () => {
    const retryableError = Object.assign(new Error('Server error'), { status: 500 })
    const fn = vi.fn().mockRejectedValue(retryableError)

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, jitter: false })
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('Server error')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should call onRetry callback with correct attempt number', async () => {
    const retryableError = Object.assign(new Error('Rate limited'), { status: 429 })
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('ok')

    const onRetry = vi.fn()
    const promise = withRetry(fn, { maxAttempts: 4, baseDelayMs: 100, jitter: false, onRetry })
    await vi.runAllTimersAsync()
    await promise

    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, retryableError, 100)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, retryableError, 200)
  })
})
