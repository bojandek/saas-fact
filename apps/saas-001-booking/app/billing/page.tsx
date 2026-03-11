'use client'

import { useAuth } from '@saas-factory/auth'
import { useSubscription, CheckoutButton } from '@saas-factory/payments'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const STRIPE_PRICES = {
  free: { id: 'free', name: 'Free', price: '$0', features: ['Basic features', '1 booking per month'] },
  pro: { id: 'price_monthly_pro', name: 'Pro', price: '$29', features: ['Unlimited bookings', 'Advanced analytics', 'Priority support'] },
  enterprise: { id: 'price_monthly_enterprise', name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated account manager', 'Custom integrations'] },
}

export default function BillingPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { subscription, loading: subLoading } = useSubscription()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  if (authLoading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription info...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentPlan = subscription?.plan_name || 'free'
  const status = subscription?.status || 'inactive'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600">Manage your subscription plan</p>
        </div>

        {/* Current Plan Badge */}
        {subscription && (
          <div className="mb-8 rounded-lg bg-blue-50 p-4 border border-blue-200">
            <h2 className="text-sm font-semibold text-blue-900">Current Subscription</h2>
            <p className="mt-1 text-blue-800">
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan - <span className="font-semibold">{status}</span>
            </p>
            {subscription.current_period_end && (
              <p className="mt-1 text-sm text-blue-700">
                Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Success/Cancel Messages */}
        <div className="mb-8 flex gap-4">
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') && (
            <div className="rounded-lg bg-green-50 p-4 border border-green-200 w-full">
              <p className="text-green-800 font-semibold">✓ Checkout successful! Your subscription has been updated.</p>
            </div>
          )}
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled') && (
            <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200 w-full">
              <p className="text-yellow-800 font-semibold">⚠ Checkout was canceled. Please try again.</p>
            </div>
          )}
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {Object.entries(STRIPE_PRICES).map(([key, plan]) => (
            <PricingCard
              key={key}
              {...plan}
              isCurrent={currentPlan === key}
              onSelectPlan={() => {
                // Handle plan selection
              }}
            />
          ))}
        </div>

        {/* Account Actions */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Account Actions</h2>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="rounded-lg bg-gray-600 text-white px-4 py-2 hover:bg-gray-700 transition"
            >
              Go to Settings
            </button>
            <button
              onClick={async () => {
                await signOut()
                router.push('/auth/login')
              }}
              className="rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingCard({
  id,
  name,
  price,
  features,
  isCurrent,
}: {
  id: string
  name: string
  price: string
  features: string[]
  isCurrent: boolean
}) {
  return (
    <div
      className={`rounded-lg border-2 p-6 ${
        isCurrent
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{price}</p>
      <ul className="mt-6 space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center text-gray-700">
            <span className="mr-3">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {isCurrent ? (
          <div className="rounded-lg bg-blue-600 text-white text-center py-2 font-semibold">
            Current Plan
          </div>
        ) : id === 'free' ? (
          <button className="w-full rounded-lg bg-gray-200 text-gray-700 py-2 font-semibold hover:bg-gray-300 transition">
            Free Plan
          </button>
        ) : (
          <CheckoutButton
            priceId={id}
            className="w-full rounded-lg bg-blue-600 text-white py-2 font-semibold hover:bg-blue-700 transition"
          >
            Upgrade to {name}
          </CheckoutButton>
        )}
      </div>
    </div>
  )
}
