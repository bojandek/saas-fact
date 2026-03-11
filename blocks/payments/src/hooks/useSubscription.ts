'use client'

import { useState, useEffect } from 'react'
import { getBrowserClient } from '@saas-factory/auth'
import type { Subscription } from '@saas-factory/database'

interface UseSubscriptionReturn {
  subscription: Subscription | null
  loading: boolean
  error: Error | null
}

/**
 * React hook za pristup subscription podatcima
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true)
        const supabase = getBrowserClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          setError(new Error('Not authenticated'))
          setLoading(false)
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single()

        if (!userData?.tenant_id) {
          setError(new Error('Tenant not found'))
          setLoading(false)
          return
        }

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', userData.tenant_id)
          .maybeSingle()

        if (subscriptionError) throw subscriptionError

        setSubscription(subscriptionData as Subscription | null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch subscription'))
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  return { subscription, loading, error }
}
