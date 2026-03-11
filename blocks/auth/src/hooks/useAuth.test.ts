import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth'

// Mock Supabase
vi.mock('../lib/supabase-client', () => ({
  getBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: null },
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}))

describe('useAuth', () => {
  beforeEach(() => {\n    vi.clearAllMocks()
  })

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('provides signIn function', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(typeof result.current.signIn).toBe('function')
  })

  it('provides signUp function', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(typeof result.current.signUp).toBe('function')
  })

  it('provides signOut function', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(typeof result.current.signOut).toBe('function')
  })

  it('returns user data structure', () => {
    const { result } = renderHook(() => useAuth())
    
    const { user, loading, error, signIn, signUp, signOut } = result.current
    
    expect(typeof user).toBe('object')
    expect(typeof loading).toBe('boolean')
    expect(typeof error).toBe('object')
    expect(typeof signIn).toBe('function')
    expect(typeof signUp).toBe('function')
    expect(typeof signOut).toBe('function')
  })
})
