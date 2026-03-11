import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSubscription } from './useSubscription'

describe('useSubscription', () => {
  it('returns loading false and null subscription initially', () => {
    const { result } = renderHook(() => useSubscription())
    expect(result.current.loading).toBe(false)
    expect(result.current.subscription).toBeNull()
  })
})
