'use client'

import { useAuth } from '@saas-factory/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(user?.user_metadata?.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Here you would typically call an API to update user settings
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-green-800">{saveMessage}</p>
          </div>
        )}

        {/* Settings Form */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-8">
            {/* Display Name */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            {/* Last Updated */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Created
              </label>
              <input
                type="text"
                value={new Date(user?.created_at || '').toLocaleDateString()}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-gray-200 text-gray-700 px-6 py-2 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-red-800 mb-4">
            These actions are irreversible. Please proceed with caution.
          </p>
          <button className="rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
