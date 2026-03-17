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

        // 1. Create Tenant first
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: `${name}'s Workspace`,
            subdomain: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substring(2, 6),
            plan: 'free',
          } as any)
          .select()
          .single()

        if (tenantError || !tenantData) {
          console.error('Tenant creation error:', tenantError)
          throw new Error('Failed to create workspace. Please try again.')
        }

        // 2. Create User record linked to Tenant
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            name,
            tenant_id: tenantData.id,
            role: 'owner',
          } as any)

        if (userError) {
          console.error('User record creation error:', userError)
          // Cleanup tenant if user creation fails (optional, but good for consistency)
          await supabase.from('tenants').delete().eq('id', tenantData.id)
          throw new Error('Failed to complete profile setup.')
        }

        // 3. Create initial subscription record
        await supabase.from('subscriptions').insert({
          tenant_id: tenantData.id,
          status: 'trialing',
          plan_name: 'Free Trial',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        } as any)

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