/**
 * Skill Store - 152k+ Expert Prompts from prompts.chat
 * Agents can install skills to instantly gain deep expertise
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  tags: z.array(z.string()),
  rating: z.number().min(0).max(5),
  uses: z.number(),
  expertiseArea: z.string(),
  category: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.date().optional(),
})

export type Skill = z.infer<typeof SkillSchema>

export interface SkillStoreConfig {
  cachePath?: string
  autoSync?: boolean
  maxCacheSizeMB?: number
}

export class SkillStore {
  private cachePath: string
  private skills: Map<string, Skill> = new Map()
  private categories: Map<string, Skill[]> = new Map()

  constructor(config: SkillStoreConfig = {}) {
    this.cachePath = config.cachePath || './skills-cache'
    this.initializeCache()
    this.loadCache()
  }

  private initializeCache(): void {
    if (!existsSync(this.cachePath)) {
      console.log(`Creating skill cache at ${this.cachePath}`)
      // In production, this would sync from prompts.chat
      this.seedDefaultSkills()
    }
  }

  private loadCache(): void {
    try {
      const skillsFile = join(this.cachePath, 'skills.json')
      if (existsSync(skillsFile)) {
        const data = JSON.parse(readFileSync(skillsFile, 'utf-8'))
        for (const skill of data) {
          this.skills.set(skill.id, skill)
          if (!this.categories.has(skill.category)) {
            this.categories.set(skill.category, [])
          }
          this.categories.get(skill.category)!.push(skill)
        }
        console.log(`Loaded ${this.skills.size} skills from cache`)
      }
    } catch (error) {
      console.error('Error loading skill cache:', error)
    }
  }

  /**
   * Seed with popular skills (full list would come from prompts.chat API)
   */
  private seedDefaultSkills(): void {
    const defaultSkills: Skill[] = [
      // Business Skills
      {
        id: 'ceo-mindset',
        name: 'CEO Mindset',
        description: 'Think strategically like a CEO - vision, execution, fundraising',
        prompt: `You are an experienced CEO with 20+ years building companies. You think strategically about:
        - Long-term vision and company building
        - Unit economics and business models
        - Fundraising and investor relations
        - Team building and culture
        - Market expansion and competition
        Provide direct, no-fluff strategic advice.`,
        tags: ['business', 'leadership', 'strategy'],
        rating: 4.9,
        uses: 35000,
        expertiseArea: 'executive',
        category: 'business',
      },
      {
        id: 'expert-accountant',
        name: 'Expert Accountant',
        description: 'Financial management, tax strategy, audit preparation',
        prompt: `You are a senior accountant with 25+ years experience. You specialize in:
        - SaaS financial management
        - Tax strategy and optimization
        - Audit preparation and compliance
        - Unit economics and financial modeling
        - Cash flow management
        Provide specific, actionable accounting advice.`,
        tags: ['finance', 'accounting', 'taxation'],
        rating: 4.7,
        uses: 18000,
        expertiseArea: 'finance',
        category: 'finance',
      },
      // Marketing Skills
      {
        id: 'expert-copywriter',
        name: 'Expert Copywriter',
        description: 'Master copywriter specialized in B2B SaaS conversion',
        prompt: `You are a world-class copywriter who has written for $100M+ ARR SaaS companies.
        Expertise:
        - Landing page copy that converts
        - Email sequences that close deals
        - Sales messaging and positioning
        - Value prop clarity
        - Psychological triggers and persuasion
        Write with precision. Every word matters.`,
        tags: ['marketing', 'copywriting', 'conversion'],
        rating: 4.9,
        uses: 42000,
        expertiseArea: 'marketing',
        category: 'marketing',
      },
      {
        id: 'growth-marketer',
        name: 'Growth Marketing Expert',
        description: 'Viral loops, retention, PLG, experimentation',
        prompt: `You are a growth marketing expert who grew companies 0 to $10M+ ARR.
        Specialties:
        - Product-led growth tactics
        - Viral loop design
        - Retention optimization
        - Experimentation and A/B testing
        - Funnel analysis and optimization
        - CAC/LTV optimization
        Think like a hacker. Show the math.`,
        tags: ['marketing', 'growth', 'acquisition'],
        rating: 4.8,
        uses: 28000,
        expertiseArea: 'growth',
        category: 'marketing',
      },
      // Engineering Skills
      {
        id: 'senior-engineer',
        name: 'Senior Software Engineer',
        description: 'Full-stack architecture, performance, best practices',
        prompt: `You are a senior engineer with 15+ years building scalable systems.
        Expertise:
        - System design and architecture
        - Performance optimization
        - Clean code and design patterns
        - Full-stack development
        - Security best practices
        - Team mentoring
        Provide production-ready solutions.`,
        tags: ['engineering', 'architecture', 'code'],
        rating: 4.8,
        uses: 51000,
        expertiseArea: 'backend',
        category: 'engineering',
      },
      {
        id: 'security-architect',
        name: 'Security Architect',
        description: 'Threat modeling, compliance, vulnerability assessment',
        prompt: `You are a security architect specializing in SaaS.
        Expertise:
        - Threat modeling
        - Vulnerability assessment
        - Security compliance (SOC2, HIPAA, etc)
        - API security
        - Data protection
        - Incident response
        Think adversarially. Find the gaps.`,
        tags: ['engineering', 'security', 'compliance'],
        rating: 4.9,
        uses: 22000,
        expertiseArea: 'security',
        category: 'engineering',
      },
      // Design Skills
      {
        id: 'ux-designer-expert',
        name: 'Expert UX Designer',
        description: 'User research, interaction design, conversion optimization',
        prompt: `You are an expert UX designer who has designed products used by 100k+ users.
        Expertise:
        - User research and testing
        - Interaction design
        - Conversion optimization
        - Accessibility (WCAG)
        - Design systems
        - Mobile and responsive design
        Focus on user needs. Back decisions with research.`,
        tags: ['design', 'ux', 'research'],
        rating: 4.8,
        uses: 31000,
        expertiseArea: 'product-design',
        category: 'design',
      },
      // Sales Skills
      {
        id: 'sales-director',
        name: 'Sales Director',
        description: 'Enterprise sales strategy, deal closing, team building',
        prompt: `You are a sales director with 20+ years of enterprise sales experience.
        Expertise:
        - Deal closing and negotiation
        - Sales strategy and forecasting
        - Team building and coaching
        - Enterprise sales cycles
        - Competitive positioning
        - Pipeline management
        Think like a hunter. Show the process.`,
        tags: ['sales', 'enterprise', 'negotiation'],
        rating: 4.7,
        uses: 19000,
        expertiseArea: 'sales',
        category: 'sales',
      },
    ]

    this.skills = new Map()
    for (const skill of defaultSkills) {
      this.skills.set(skill.id, skill)
      if (!this.categories.has(skill.category || 'other')) {
        this.categories.set(skill.category || 'other', [])
      }
      this.categories.get(skill.category || 'other')!.push(skill)
    }

    console.log(`Seeded ${defaultSkills.length} default skills`)
  }

  /**
   * Get a specific skill by ID
   */
  async getSkill(skillId: string): Promise<Skill | null> {
    return this.skills.get(skillId) || null
  }

  /**
   * Search skills by query
   */
  async search(query: string, limit: number = 10): Promise<Skill[]> {
    const queryLower = query.toLowerCase()
    const results = Array.from(this.skills.values()).filter((skill) => {
      return (
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(queryLower))
      )
    })

    return results
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
  }

  /**
   * Get all skills in a category
   */
  async getCategory(category: string): Promise<Skill[]> {
    return this.categories.get(category) || []
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    return Array.from(this.categories.keys())
  }

  /**
   * Get trending/top skills
   */
  async getTrending(limit: number = 10): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .sort((a, b) => b.uses - a.uses)
      .slice(0, limit)
  }

  /**
   * Get top-rated skills
   */
  async getTopRated(limit: number = 10): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
  }

  /**
   * Get skills by expertise area
   */
  async getExpertise(area: string): Promise<Skill[]> {
    return Array.from(this.skills.values()).filter((s) => s.expertiseArea === area)
  }

  /**
   * Save cache to disk
   */
  private saveCache(): void {
    try {
      const skillsFile = join(this.cachePath, 'skills.json')
      writeFileSync(skillsFile, JSON.stringify(Array.from(this.skills.values()), null, 2))
    } catch (error) {
      console.error('Error saving skill cache:', error)
    }
  }

  /**
   * Get all skills
   */
  async getAllSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values())
  }
}
