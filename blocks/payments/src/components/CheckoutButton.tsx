'use client'

import { useState } from 'react'
import { getBrowserClient } from '@saas-factory/auth'

interface CheckoutButtonProps {
  priceId: string
  children?: React.ReactNode
  className?: string
  disabled?: boolean
}

/**
 * Button za Stripe checkout redirect
 */
export function CheckoutButton({
  priceId,
  children = 'Subscribe',
  className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded',
  disabled = false,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getBrowserClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { checkoutUrl } = await response.json()
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={`${className} ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Loading...' : children}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
