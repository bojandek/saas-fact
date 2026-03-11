'use client'

import { useAuth } from '@saas-factory/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900\">Welcome, {user.user_metadata?.name || user.email}!</h1>
          <p className="mt-2 text-gray-600\">You're logged in and ready to go.</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Billing Card */}
          <DashboardCard
            title="Billing"
            description="Manage your subscription and payment method"
            icon="💳"
            href="/billing"
          />

          {/* Settings Card */}
          <DashboardCard
            title="Settings"
            description="Update your account preferences"
            icon="⚙️"
            href="/settings"
          />

          {/* Booking Card */}
          <DashboardCard
            title="Bookings"
            description="View and manage your bookings"
            icon="📅"
            href="/dashboard/booking"
          />
        </div>

        {/* Account Info */}
        <div className="mt-12 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900\">Account Information</h2>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500\">Email</dt>
              <dd className="mt-1 text-gray-900\">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500\">User ID</dt>
              <dd className="mt-1 font-mono text-sm text-gray-900\">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500\">Account Created</dt>
              <dd className="mt-1 text-gray-900\">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: string
  href: string
}) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className="rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-gray-300 hover:shadow-md\"
    >
      <div className="text-3xl\">{icon}</div>
      <h3 className="mt-4 font-semibold text-gray-900\">{title}</h3>
      <p className="mt-2 text-sm text-gray-600\">{description}</p>
    </button>
  )
}
