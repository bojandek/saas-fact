/**
 * Design Division Agents
 * Product design, Visual design, UX research, Motion design
 */

import Anthropic from '@anthropic-ai/sdk'
import { DesignSpec, DivisionAgent } from './types'

export class DesignDivision {
  private client: Anthropic
  private agents: Map<string, DivisionAgent> = new Map()

  constructor(anthropicKey: string) {
    this.client = new Anthropic({ apiKey: anthropicKey })
    this.initializeAgents()
  }

  private initializeAgents(): void {
    // Product Designers
    for (let i = 1; i <= 4; i++) {
      this.agents.set(`product-designer-${i}`, {
        id: `product-designer-${i}`,
        name: `Product Designer ${i}`,
        division: 'design',
        specialization: 'product-design',
        seniority: i === 1 ? 'lead' : i <= 2 ? 'senior' : 'mid',
        capabilities: [
          'user-research',
          'wireframing',
          'prototyping',
          'user-testing',
          'interaction-design',
        ],
        systemPrompt: `You are a lead product designer specializing in SaaS UX.
        Expertise: user research, wireframing, prototyping, interaction design.
        Create intuitive, delightful user experiences.`,
      })
    }

    // Visual Designers
    for (let i = 1; i <= 3; i++) {
      this.agents.set(`visual-designer-${i}`, {
        id: `visual-designer-${i}`,
        name: `Visual Designer ${i}`,
        division: 'design',
        specialization: 'visual-design',
        seniority: i === 1 ? 'senior' : 'mid',
        capabilities: [
          'branding',
          'visual-design',
          'typography',
          'color-theory',
          'design-systems',
        ],
        systemPrompt: `You are a visual designer specializing in B2B SaaS aesthetics.
        Expertise: branding, typography, color systems, modern design.
        Create beautiful, professional visual identities.`,
      })
    }

    // UX Researchers
    for (let i = 1; i <= 2; i++) {
      this.agents.set(`ux-researcher-${i}`, {
        id: `ux-researcher-${i}`,
        name: `UX Researcher ${i}`,
        division: 'design',
        specialization: 'ux-research',
        seniority: 'senior',
        capabilities: [
          'user-interviews',
          'usability-testing',
          'analytics',
          'heuristic-evaluation',
          'competitive-analysis',
        ],
        systemPrompt: `You are a UX researcher specializing in SaaS user behavior.
        Expertise: user interviews, testing, analytics, behavioral insights.
        Make data-driven design decisions.`,
      })
    }

    // Motion Designer
    this.agents.set('motion-designer-1', {
      id: 'motion-designer-1',
      name: 'Motion Designer',
      division: 'design',
      specialization: 'motion',
      seniority: 'mid',
      capabilities: ['animations', 'interactions', 'microinteractions', 'principle-design'],
      systemPrompt: `You are a motion designer specializing in SaaS interactions.
      Expertise: animations, microinteractions, Framer, Principle.
      Create smooth, delightful motion design.`,
    })
  }

  /**
   * Generate complete design system
   */
  async generateDesignSystem(): Promise<DesignSpec> {
    const visualDesigner = this.agents.get('visual-designer-1')!

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: visualDesigner.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a complete design system for a modern B2B SaaS platform.
          
          Include:
          1. Component library (buttons, inputs, cards, etc.)
          2. Color system (primary, secondary, neutral, status colors)
          3. Typography scale
          4. Spacing system
          5. Design guidelines
          
          Format as JSON: { 
            componentLibrary: [...], 
            colorSystem: {...}, 
            typography: {...}, 
            spacing: {...}, 
            guidelines: [...] 
          }`,
        },
      ],
    })

    if (response.content[0].type !== 'text') {
      throw new Error('Invalid response from Claude')
    }

    try {
      return JSON.parse(response.content[0].text)
    } catch {
      return {
        componentLibrary: [],
        colorSystem: {
          primary: '#0066FF',
          secondary: '#7C3AED',
          neutral: '#F3F4F6',
        },
        typography: {
          heading1: { size: 32, weight: 700 },
          body: { size: 16, weight: 400 },
        },
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
        },
        guidelines: [
          'Mobile-first approach',
          'WCAG AA compliance',
          'Consistent spacing',
          'Clear hierarchy',
        ],
      }
    }
  }

  /**
   * Analyze user experience
   */
  async analyzeUX(flow: string): Promise<string> {
    const uxResearcher = this.agents.get('ux-researcher-1')!

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: uxResearcher.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this user flow and identify UX issues:
          
          ${flow}
          
          Provide:
          1. Friction points
          2. Usability issues
          3. Accessibility concerns
          4. Improvement recommendations`,
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  /**
   * Get all design agents
   */
  getAgents(): DivisionAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): DivisionAgent | undefined {
    return this.agents.get(id)
  }
}
