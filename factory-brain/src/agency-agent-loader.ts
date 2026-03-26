// @ts-nocheck
import * as fs from 'fs'
import * as path from 'path'
import { llm } from './llm/index'

/**
 * AgencyAgentLoader
 *
 * Učitava agente iz The Agency (msitarzewski/agency-agents) i koristi
 * njihove personality + workflow definicije kao system promptove za Claude.
 *
 * Svaki .md fajl u agency-agents/ direktoriju je kompletan agent sa:
 * - Identity & personality traits
 * - Core mission & workflows
 * - Technical deliverables
 * - Critical rules
 * - Success metrics
 */

const AGENTS_DIR = path.join(__dirname, 'agency-agents')

export interface AgencyAgent {
  name: string
  description: string
  color: string
  emoji: string
  vibe: string
  systemPrompt: string
  filename: string
}

export interface AgencyTaskResult {
  agent: string
  output: string
  success: boolean
}

/**
 * Parsira frontmatter iz markdown fajla agenta
 */
function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return {}

  const frontmatter: Record<string, string> = {}
  const lines = frontmatterMatch[1].split('\n')
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      frontmatter[key] = value
    }
  }
  return frontmatter
}

/**
 * Učitava sve agente iz agency-agents direktorija
 */
export function loadAllAgents(): AgencyAgent[] {
  if (!fs.existsSync(AGENTS_DIR)) {
    return []
  }

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))
  const agents: AgencyAgent[] = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8')
    const meta = parseFrontmatter(content)

    agents.push({
      name: meta.name || file.replace('.md', ''),
      description: meta.description || '',
      color: meta.color || 'blue',
      emoji: meta.emoji || '🤖',
      vibe: meta.vibe || '',
      systemPrompt: content,
      filename: file,
    })
  }

  return agents
}

/**
 * Učitava specifičnog agenta po imenu fajla (bez .md)
 */
export function loadAgent(filename: string): AgencyAgent | null {
  const filePath = path.join(AGENTS_DIR, `${filename}.md`)
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const meta = parseFrontmatter(content)

  return {
    name: meta.name || filename,
    description: meta.description || '',
    color: meta.color || 'blue',
    emoji: meta.emoji || '🤖',
    vibe: meta.vibe || '',
    systemPrompt: content,
    filename: `${filename}.md`,
  }
}

/**
 * Pokreće zadatak koristeći specifičnog agenta
 */
export async function runAgentTask(
  agentFilename: string,
  task: string,
  context?: string
): Promise<AgencyTaskResult> {
  const agent = loadAgent(agentFilename)
  if (!agent) {
    return {
      agent: agentFilename,
      output: `Agent '${agentFilename}' nije pronađen`,
      success: false,
    }
  }

  try {
    const userMessage = context
      ? `Context:\n${context}\n\nTask:\n${task}`
      : task

    const output = await llm.chat({
      messages: [
        { role: 'user', content: userMessage },
      ],
      system: agent.systemPrompt,
      model: 'claude-haiku-4-5',
    })

    return {
      agent: agent.name,
      output,
      success: true,
    }
  } catch (error: any) {
    return {
      agent: agent.name,
      output: `Greška: ${error.message}`,
      success: false,
    }
  }
}

/**
 * SaaSAgencyTeam — preddefinirani tim agenata za SaaS Factory pipeline
 *
 * Svaki SaaS koji se generiše može koristiti ovaj tim za:
 * - Growth plan (marketing-growth-hacker)
 * - UI/UX review (design-ui-designer + design-whimsy-injector)
 * - Security audit (engineering-security-engineer)
 * - Reality check (testing-reality-checker)
 * - Product roadmap (product-manager)
 */
export const SaaSAgencyTeam = {
  /**
   * Growth Hacker — kreira viralni growth plan za generisani SaaS
   */
  async growthPlan(appName: string, niche: string, features: string[]): Promise<string> {
    const result = await runAgentTask(
      'marketing-growth-hacker',
      `Create a viral growth plan for a SaaS called "${appName}" in the "${niche}" niche.
      
Key features: ${features.join(', ')}

Deliver:
1. Top 3 acquisition channels with specific tactics
2. Viral loop mechanism
3. First 100 users strategy
4. Key growth metrics to track`,
    )
    return result.output
  },

  /**
   * UI Designer — review generisanog UI i preporuke
   */
  async uiReview(appName: string, components: string[]): Promise<string> {
    const result = await runAgentTask(
      'design-ui-designer',
      `Review the UI architecture for "${appName}" SaaS application.
      
Components: ${components.join(', ')}

Provide:
1. Design system recommendations (colors, typography, spacing)
2. Component hierarchy improvements
3. Mobile-first considerations
4. Accessibility requirements`,
    )
    return result.output
  },

  /**
   * Whimsy Injector — dodaje personality i delight u generisanu aplikaciju
   */
  async addWhimsy(appName: string, niche: string): Promise<string> {
    const result = await runAgentTask(
      'design-whimsy-injector',
      `Add personality and delight to "${appName}", a SaaS for the "${niche}" market.
      
Suggest:
1. 3 micro-interaction ideas
2. Loading state personality
3. Empty state messaging
4. Success celebration moments
5. Error state humanization`,
    )
    return result.output
  },

  /**
   * Security Engineer — audit generisanog koda
   */
  async securityAudit(appName: string, blocks: string[]): Promise<string> {
    const result = await runAgentTask(
      'engineering-security-engineer',
      `Security audit for "${appName}" SaaS using these blocks: ${blocks.join(', ')}
      
Check:
1. Authentication vulnerabilities
2. SQL injection risks
3. RLS policy completeness
4. API endpoint security
5. Data exposure risks`,
    )
    return result.output
  },

  /**
   * Reality Checker — finalna provjera prije deploya
   */
  async realityCheck(appName: string, generationSummary: string): Promise<string> {
    const result = await runAgentTask(
      'testing-reality-checker',
      `Production readiness check for "${appName}".
      
Generation summary:
${generationSummary}

Assess:
1. Is this actually production ready? (Default: NEEDS WORK)
2. What are the top 3 risks?
3. What must be fixed before launch?
4. Realistic quality rating (A-F)`,
    )
    return result.output
  },

  /**
   * Product Manager — kreira product roadmap
   */
  async productRoadmap(appName: string, niche: string, mvpFeatures: string[]): Promise<string> {
    const result = await runAgentTask(
      'product-manager',
      `Create a product roadmap for "${appName}" in the "${niche}" market.
      
MVP features: ${mvpFeatures.join(', ')}

Deliver:
1. Sprint 1 priorities (Week 1-2)
2. Sprint 2 priorities (Week 3-4)
3. V1.0 definition
4. Success metrics`,
    )
    return result.output
  },

  /**
   * SEO Specialist — SEO strategija za generisani SaaS
   */
  async seoStrategy(appName: string, niche: string): Promise<string> {
    const result = await runAgentTask(
      'marketing-seo-specialist',
      `SEO strategy for "${appName}", a SaaS in the "${niche}" market.
      
Deliver:
1. Primary keyword targets (5-10)
2. Content strategy for first 3 months
3. Technical SEO checklist
4. Link building approach`,
    )
    return result.output
  },
}

/**
 * Lista svih dostupnih agenata sa kratkim opisom
 */
export function listAgents(): { name: string; emoji: string; vibe: string; filename: string }[] {
  return loadAllAgents().map(a => ({
    name: a.name,
    emoji: a.emoji,
    vibe: a.vibe,
    filename: a.filename.replace('.md', ''),
  }))
}
