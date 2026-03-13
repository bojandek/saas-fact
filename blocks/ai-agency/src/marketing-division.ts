/**
 * Marketing Division Agents
 * Content strategy, Copywriting, Growth, Sales engineering, Social
 */

import Anthropic from '@anthropic-ai/sdk'
import { MarketingCampaign, DivisionAgent } from './types'

export class MarketingDivision {
  private client: Anthropic
  private agents: Map<string, DivisionAgent> = new Map()

  constructor(anthropicKey: string) {
    this.client = new Anthropic({ apiKey: anthropicKey })
    this.initializeAgents()
  }

  private initializeAgents(): void {
    // Content Strategists
    for (let i = 1; i <= 2; i++) {
      this.agents.set(`content-strategist-${i}`, {
        id: `content-strategist-${i}`,
        name: `Content Strategist ${i}`,
        division: 'marketing',
        specialization: 'content',
        seniority: 'senior',
        capabilities: [
          'content-strategy',
          'blog-planning',
          'thought-leadership',
          'seo-strategy',
          'content-calendar',
        ],
        systemPrompt: `You are a content strategist for B2B SaaS.
        Expertise: content strategy, SEO, thought leadership, content calendar.
        Create compelling, conversion-focused content.`,
      })
    }

    // Copywriters
    for (let i = 1; i <= 2; i++) {
      this.agents.set(`copywriter-${i}`, {
        id: `copywriter-${i}`,
        name: `Copywriter ${i}`,
        division: 'marketing',
        specialization: 'copywriting',
        seniority: 'senior',
        capabilities: [
          'landing-page-copy',
          'email-marketing',
          'sales-messaging',
          'value-prop',
          'persuasion',
        ],
        systemPrompt: `You are a copywriter specializing in B2B SaaS.
        Expertise: landing pages, emails, sales messaging, persuasion psychology.
        Write copy that converts and compels.`,
      })
    }

    // Growth Marketers
    for (let i = 1; i <= 3; i++) {
      this.agents.set(`growth-marketer-${i}`, {
        id: `growth-marketer-${i}`,
        name: `Growth Marketer ${i}`,
        division: 'marketing',
        specialization: 'growth',
        seniority: i === 1 ? 'senior' : 'mid',
        capabilities: [
          'viral-loops',
          'retention-optimization',
          'funnel-analysis',
          'experiment-design',
          'product-led-growth',
        ],
        systemPrompt: `You are a growth marketer specializing in SaaS.
        Expertise: viral loops, retention, PLG, experimentation.
        Drive scalable, sustainable growth.`,
      })
    }

    // Sales Engineers
    for (let i = 1; i <= 2; i++) {
      this.agents.set(`sales-engineer-${i}`, {
        id: `sales-engineer-${i}`,
        name: `Sales Engineer ${i}`,
        division: 'marketing',
        specialization: 'sales-eng',
        seniority: 'senior',
        capabilities: [
          'demo-creation',
          'sales-collateral',
          'account-strategy',
          'competitive-positioning',
          'objection-handling',
        ],
        systemPrompt: `You are a sales engineer for B2B SaaS.
        Expertise: demos, collateral, competitive positioning, closing.
        Support enterprise sales with technical excellence.`,
      })
    }

    // Social Media Manager
    this.agents.set('social-manager-1', {
      id: 'social-manager-1',
      name: 'Social Media Manager',
      division: 'marketing',
      specialization: 'social',
      seniority: 'mid',
      capabilities: [
        'social-strategy',
        'community-management',
        'viral-content',
        'influencer-relations',
      ],
      systemPrompt: `You are a social media expert for B2B SaaS.
        Expertise: Twitter, LinkedIn, community building, viral content.
        Build engaged communities and drive awareness.`,
    })
  }

  /**
   * Launch marketing campaign
   */
  async launchCampaign(input: {
    type: string
    target: string
    budget: number
  }): Promise<MarketingCampaign> {
    const contentStrategy = this.agents.get('content-strategist-1')!

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: contentStrategy.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Launch ${input.type} marketing campaign for: ${input.target}
          Budget: $${input.budget}
          
          Create comprehensive campaign plan including:
          1. Target channels (email, content, ads, social)
          2. Messaging and positioning
          3. Content calendar
          4. Timeline
          5. Expected ROI
          
          Format as JSON: { 
            type: "...", 
            target: "...", 
            budget: ..., 
            channels: [...], 
            messaging: "...", 
            timeline: "...", 
            expectedROI: ... 
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
        type: input.type,
        target: input.target,
        budget: input.budget,
        channels: ['email', 'content', 'social', 'paid'],
        messaging: 'Focus on ROI and ease of use',
        timeline: '30 days',
        expectedROI: input.budget * 3,
      }
    }
  }

  /**
   * Write landing page copy
   */
  async writeLandingPageCopy(product: string): Promise<string> {
    const copywriter = this.agents.get('copywriter-1')!

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: copywriter.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write compelling landing page copy for: ${product}
          
          Include:
          1. Headline (benefit-driven)
          2. Subheadline
          3. Value proposition
          4. Key features (3-4)
          5. Social proof section
          6. CTA copy
          
          Focus on conversion and clarity.`,
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  /**
   * Get all marketing agents
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
