/**
 * Memory system for Factory Brain
 * Tracks projects, lessons, patterns, and preferences
 */

import { createClient } from '@supabase/supabase-js'

interface ProjectMemory {
  id: string
  name: string
  description: string
  tech_stack: string[]
  lessons: string[]
  metrics: Record<string, any>
  created_at: string
  updated_at: string
}

interface Lesson {
  id: string
  title: string
  description: string
  category: 'bug' | 'architecture' | 'performance' | 'ux' | 'other'
  solution: string
  projects: string[]
  created_at: string
}

interface Pattern {
  id: string
  name: string
  description: string
  use_cases: string[]
  effectiveness: number
  frequency_used: number
}

export class MemorySystem {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    )
  }

  /**
   * Record project completion
   */
  async recordProject(project: ProjectMemory): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description,
        tech_stack: project.tech_stack,
        lessons: project.lessons,
        metrics: project.metrics,
      })

    if (error) throw error
  }

  /**
   * Add learned lesson
   */
  async addLesson(lesson: Lesson): Promise<void> {
    const { error } = await this.supabase
      .from('lessons')
      .insert({
        title: lesson.title,
        description: lesson.description,
        category: lesson.category,
        solution: lesson.solution,
        projects: lesson.projects,
      })

    if (error) throw error
  }

  /**
   * Track pattern effectiveness
   */
  async recordPattern(pattern: Pattern): Promise<void> {
    const { error } = await this.supabase
      .from('patterns')
      .insert({
        name: pattern.name,
        description: pattern.description,
        use_cases: pattern.use_cases,
        effectiveness: pattern.effectiveness,
      })

    if (error) throw error
  }

  /**
   * Get most effective patterns
   */
  async getTopPatterns(limit: number = 10): Promise<Pattern[]> {
    const { data, error } = await this.supabase
      .from('patterns')
      .select('*')
      .order('effectiveness', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as Pattern[]
  }

  /**
   * Get lessons by category
   */
  async getLessonsByCategory(category: string): Promise<Lesson[]> {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Lesson[]
  }
}

export type { ProjectMemory, Lesson, Pattern }
