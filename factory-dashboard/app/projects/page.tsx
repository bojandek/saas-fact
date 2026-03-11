'use client'

import { useState, useEffect } from 'react'
import { Button } from '@saas-factory/ui'

interface Project {
  id: string
  name: string
  status: 'live' | 'development' | 'idea'
  mrr: number
  users: number
  created_at: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch projects from Supabase
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">SaaS Projects</h1>
        <Button>New Project</Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="border rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Status: <span className="font-medium capitalize">{project.status}</span></p>
                <p>MRR: ${project.mrr.toLocaleString()}</p>
                <p>Users: {project.users.toLocaleString()}</p>
                <p>Created: {new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">Edit</Button>
                <Button variant="outline" size="sm">Deploy</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
