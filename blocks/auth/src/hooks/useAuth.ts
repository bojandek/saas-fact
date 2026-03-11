'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '../lib/supabase-client'
import type { User, AuthError } from '../types'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: AuthError | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

/**
 * React hook za upravljanje autentifikacijom
 * @returns Korisnik, loading state, i auth funkcije
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = getBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userError) throw userError
          setUser(userData as User)
        }
      } catch (err) {
        const authError = err as any
        setError({
          message: authError.message || 'Failed to initialize auth',
          status: authError.status || 500,
          code: authError.code,
        })
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const supabase = getBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userData) setUser(userData as User)
      } else {
        setUser(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null)
        setLoading(true)

        const supabase = getBrowserClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        router.push('/dashboard')
      } catch (err) {
        const authError = err as any
        setError({
          message: authError.message || 'Sign in failed',
          status: authError.status || 500,
          code: authError.code,
        })
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setError(null)
        setLoading(true)

        const supabase = getBrowserClient()

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError
        if (!authData.user) throw new Error('Failed to create user')

        const { data: tenantData } = await supabase
          .from('tenants')
          .insert({
            name: `${name}'s Workspace`,
            subdomain: email.split('@')[0].toLowerCase() + Math.random().toString(36).substr(2, 9),
            plan: 'free',
          } as any)
          .select()
          .single()

        if (!tenantData) throw new Error('Failed to create tenant')

        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            name,
            tenant_id: tenantData.id,
            role: 'owner',
          } as any)

        if (userError) throw userError

        router.push('/auth/verify-email')
      } catch (err) {
        const authError = err as any
        setError({
          message: authError.message || 'Sign up failed',
          status: authError.status || 500,
          code: authError.code,
        })
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const signOut = useCallback(async () => {
    try {
      setError(null)
      const supabase = getBrowserClient()
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) throw signOutError

      setUser(null)
      router.push('/auth/login')
    } catch (err) {
      const authError = err as any
      setError({
        message: authError.message || 'Sign out failed',
        status: authError.status || 500,
        code: authError.code,
      })
    }
  }, [router])

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  }
}