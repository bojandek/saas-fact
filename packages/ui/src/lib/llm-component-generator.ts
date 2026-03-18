/**
 * LLM-Driven Nano Banana Component Generator
 *
 * Replaces static template strings with GPT-4o generated React components
 * that are tailored to the specific SaaS description, context, and theme.
 *
 * Key improvements over the original NanoBananaComponentGenerator:
 * 1. Components are contextually aware of the SaaS domain
 * 2. Field names, labels, and validation match the actual use case
 * 3. Business logic is embedded (e.g., booking form has date pickers)
 * 4. Accessibility (ARIA) and TypeScript types are generated correctly
 * 5. Learned rules from AutonomousLearningLoop are applied
 */

import { getLLMClient, CLAUDE_MODELS } from '../../../../factory-brain/src/llm/client'
import { z } from 'zod'

// ── Types ─────────────────────────────────────────────────────────────────────

export const ComponentRequestSchema = z.object({
  componentName: z.string(),
  componentType: z.enum([
    'form', 'card', 'button', 'input', 'modal', 'table',
    'list', 'dashboard', 'nav', 'hero', 'pricing', 'page',
  ]),
  saasDescription: z.string(),
  saasCategory: z.string().optional(), // e.g., "booking", "ecommerce", "cms"
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
    borderRadius: z.string(),
  }),
  context: z.string().optional(), // e.g., "This is the main booking form for restaurants"
  existingComponents: z.array(z.string()).optional(), // already generated components to avoid duplication
  learnedRules: z.string().optional(), // from AutonomousLearningLoop
})

export type ComponentRequest = z.infer<typeof ComponentRequestSchema>

export const GeneratedComponentSchema = z.object({
  name: z.string(),
  code: z.string(),         // Full React/TypeScript component code
  styles: z.string(),       // Additional CSS if needed
  props: z.record(z.string()), // Prop types as strings
  dependencies: z.array(z.string()), // npm packages needed
  description: z.string(),  // What this component does
  accessibility_notes: z.string().optional(),
})

export type GeneratedComponent = z.infer<typeof GeneratedComponentSchema>

export const GeneratedPageSchema = z.object({
  page_name: z.string(),
  route: z.string(),        // e.g., "/bookings/new"
  code: z.string(),         // Full Next.js page component
  components_used: z.array(z.string()),
  description: z.string(),
})

export type GeneratedPage = z.infer<typeof GeneratedPageSchema>

// ── LLM Component Generator ───────────────────────────────────────────────────

export class LLMNanaBananaGenerator {
  private llm = getLLMClient()
  private cache: Map<string, GeneratedComponent> = new Map()

  constructor() {
    this.llm = getLLMClient()
  }

  /**
   * Generate a single React component using GPT-4o.
   * This is the core method — all other methods build on this.
   */
  async generateComponent(request: ComponentRequest): Promise<GeneratedComponent> {
    const cacheKey = `${request.componentName}-${request.componentType}-${request.saasDescription.slice(0, 50)}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const prompt = this.buildComponentPrompt(request)

    const response = await this.llm.chat({
      model: CLAUDE_MODELS.SONNET,
      messages: [
        {
          role: 'system',
          content: `You are an expert React/TypeScript developer specializing in SaaS applications.
You generate production-quality, accessible, and type-safe React components.
Always use:
- TypeScript with explicit types (no 'any')
- Tailwind CSS for styling
- shadcn/ui components when appropriate (Button, Input, Card, Dialog, Table, etc.)
- React hooks (useState, useCallback, useMemo) where needed
- ARIA attributes for accessibility
- Proper error states and loading states
Return ONLY valid JSON, no markdown, no explanations.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = JSON.parse(response.choices[0].message.content ?? '{}')

    const component: GeneratedComponent = {
      name: request.componentName,
      code: raw.code ?? this.fallbackComponent(request),
      styles: raw.styles ?? '',
      props: raw.props ?? {},
      dependencies: raw.dependencies ?? [],
      description: raw.description ?? `${request.componentType} component for ${request.saasDescription}`,
      accessibility_notes: raw.accessibility_notes,
    }

    this.cache.set(cacheKey, component)
    return component
  }

  /**
   * Generate a complete set of components for a SaaS application.
   * Returns all core components needed for the app.
   */
  async generateAppComponents(
    saasDescription: string,
    theme: ComponentRequest['theme'],
    learnedRules?: string
  ): Promise<GeneratedComponent[]> {
    // Determine what components are needed based on SaaS description
    const componentPlan = await this.planComponents(saasDescription)

    // Generate all components in parallel (batches of 3 to avoid rate limits)
    const results: GeneratedComponent[] = []
    const generatedNames: string[] = []

    for (let i = 0; i < componentPlan.length; i += 3) {
      const batch = componentPlan.slice(i, i + 3)
      const batchResults = await Promise.all(
        batch.map(plan =>
          this.generateComponent({
            componentName: plan.name,
            componentType: plan.type as ComponentRequest['componentType'],
            saasDescription,
            saasCategory: plan.category,
            theme,
            context: plan.context,
            existingComponents: generatedNames,
            learnedRules,
          })
        )
      )
      results.push(...batchResults)
      generatedNames.push(...batchResults.map(c => c.name))
    }

    return results
  }

  /**
   * Generate a complete Next.js page that uses the generated components.
   */
  async generatePage(
    pageName: string,
    route: string,
    saasDescription: string,
    availableComponents: string[],
    theme: ComponentRequest['theme']
  ): Promise<GeneratedPage> {
    const response = await this.llm.chat({
      model: CLAUDE_MODELS.SONNET,
      messages: [
        {
          role: 'system',
          content: `You are an expert Next.js developer. Generate production-quality Next.js App Router pages.
Use TypeScript, Tailwind CSS, and the provided component names.
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Generate a Next.js page for this SaaS application.

SaaS: "${saasDescription}"
Page: "${pageName}"
Route: "${route}"
Available components: ${availableComponents.join(', ')}
Theme: primary=${theme.primaryColor}, font=${theme.fontFamily}

Return JSON:
{
  "page_name": "${pageName}",
  "route": "${route}",
  "code": "// Complete Next.js page component code here",
  "components_used": ["ComponentName1", "ComponentName2"],
  "description": "What this page does"
}

The page should:
1. Use 'use client' directive if it needs interactivity
2. Import and use the available components
3. Have proper TypeScript types
4. Include loading and error states
5. Be fully functional for the SaaS use case`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = JSON.parse(response.choices[0].message.content ?? '{}')
    return {
      page_name: pageName,
      route,
      code: raw.code ?? `// Page: ${pageName}\nexport default function ${pageName}Page() { return <div>${pageName}</div> }`,
      components_used: raw.components_used ?? [],
      description: raw.description ?? `${pageName} page`,
    }
  }

  /**
   * Plan which components to generate based on SaaS description.
   */
  private async planComponents(saasDescription: string): Promise<Array<{
    name: string
    type: string
    category: string
    context: string
  }>> {
    const response = await this.llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      messages: [
        {
          role: 'user',
          content: `For this SaaS application, list the 6-8 most important React components to generate.

SaaS: "${saasDescription}"

Return JSON with "components" array:
[{
  "name": "ComponentName (PascalCase)",
  "type": "form|card|table|modal|dashboard|list|nav|hero|pricing",
  "category": "booking|auth|dashboard|settings|etc",
  "context": "Brief description of what this component does in the app"
}]

Focus on the core user-facing components. No utility components.
JSON only.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = JSON.parse(response.choices[0].message.content ?? '{}')
    return raw.components ?? []
  }

  /**
   * Build the detailed prompt for component generation.
   */
  private buildComponentPrompt(request: ComponentRequest): string {
    const lines = [
      `Generate a production-quality React/TypeScript component for this SaaS application.`,
      ``,
      `SaaS Application: "${request.saasDescription}"`,
      `Component Name: ${request.componentName}`,
      `Component Type: ${request.componentType}`,
    ]

    if (request.saasCategory) {
      lines.push(`SaaS Category: ${request.saasCategory}`)
    }

    if (request.context) {
      lines.push(`Context: ${request.context}`)
    }

    lines.push(``, `Theme:`)
    lines.push(`- Primary Color: ${request.theme.primaryColor}`)
    lines.push(`- Secondary Color: ${request.theme.secondaryColor}`)
    lines.push(`- Accent Color: ${request.theme.accentColor}`)
    lines.push(`- Font Family: ${request.theme.fontFamily}`)
    lines.push(`- Border Radius: ${request.theme.borderRadius}`)

    if (request.existingComponents && request.existingComponents.length > 0) {
      lines.push(``, `Already generated components (avoid duplication): ${request.existingComponents.join(', ')}`)
    }

    if (request.learnedRules) {
      lines.push(``, `Learned rules from previous generations (apply these):`)
      lines.push(request.learnedRules.slice(0, 1000)) // Limit to avoid token overflow
    }

    lines.push(``, `Requirements:`)
    lines.push(`1. Use TypeScript with explicit types (no 'any')`)
    lines.push(`2. Use Tailwind CSS classes for styling`)
    lines.push(`3. Use shadcn/ui components (Button, Input, Card, etc.) where appropriate`)
    lines.push(`4. Include proper ARIA attributes`)
    lines.push(`5. Handle loading and error states`)
    lines.push(`6. Make it specific to the SaaS domain (use real field names, not generic ones)`)
    lines.push(`7. Include form validation where applicable`)

    lines.push(``, `Return JSON:`)
    lines.push(`{`)
    lines.push(`  "code": "// Complete React component code",`)
    lines.push(`  "styles": "// Additional CSS (empty string if not needed)",`)
    lines.push(`  "props": { "propName": "TypeScript type as string" },`)
    lines.push(`  "dependencies": ["package-name"],`)
    lines.push(`  "description": "What this component does",`)
    lines.push(`  "accessibility_notes": "ARIA and a11y notes"`)
    lines.push(`}`)

    return lines.join('\n')
  }

  /**
   * Fallback component if LLM generation fails.
   */
  private fallbackComponent(request: ComponentRequest): string {
    return `'use client'

import React from 'react'

interface ${request.componentName}Props {
  className?: string
}

export function ${request.componentName}({ className }: ${request.componentName}Props) {
  return (
    <div className={\`p-4 rounded-lg border \${className ?? ''}\`}>
      <h2 className="text-lg font-semibold">${request.componentName}</h2>
      <p className="text-muted-foreground text-sm">
        ${request.componentType} component for ${request.saasDescription.slice(0, 50)}
      </p>
    </div>
  )
}
`
  }

  /**
   * Clear the component cache.
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// ── API Route Handler ─────────────────────────────────────────────────────────

/**
 * Generate components for a SaaS app — used by the factory-dashboard API.
 */
export async function generateSaaSComponents(
  saasDescription: string,
  theme: ComponentRequest['theme'],
  learnedRules?: string
): Promise<{
  components: GeneratedComponent[]
  total: number
  generation_time_ms: number
}> {
  const startTime = Date.now()
  const generator = new LLMNanaBananaGenerator()

  const components = await generator.generateAppComponents(saasDescription, theme, learnedRules)

  return {
    components,
    total: components.length,
    generation_time_ms: Date.now() - startTime,
  }
}
