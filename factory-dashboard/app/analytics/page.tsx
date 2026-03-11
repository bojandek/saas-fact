'use client'

import { useState, useEffect } from 'react'

interface Analytics {
  total_mrr: number
  total_users: number
  total_projects: number
  churn_rate: number
  avg_arr: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics')
        const data = await response.json()
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) return <div>Loading...</div>

  if (!analytics) return <div>No data available</div>

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Factory Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-6 border">
          <p className="text-sm text-gray-600">Total MRR</p>
          <p className="text-2xl font-bold">${analytics.total_mrr.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 border">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold">{analytics.total_users.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <p className="text-sm text-gray-600">Projects</p>
          <p className="text-2xl font-bold">{analytics.total_projects}</p>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <p className="text-sm text-gray-600">Churn Rate</p>
          <p className="text-2xl font-bold">{(analytics.churn_rate * 100).toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <p className="text-sm text-gray-600">Avg ARR</p>
          <p className="text-2xl font-bold">${(analytics.avg_arr / 1000).toFixed(1)}k</p>
        </div>
      </div>
    </div>
  )
}
