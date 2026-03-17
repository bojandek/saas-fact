/**
 * PersonaGenerator — MiroFish Enhancement #1
 *
 * Automatically generates rich, unique agent personas from a SaaS description.
 * Each persona has a distinct personality, background, motivations, pain points,
 * and behavioral tendencies — inspired by MiroFish's character generation system.
 *
 * Instead of generic "predictor/analyzer" roles, agents now have names like:
 * "Sarah Chen, 34, Product Manager at a fintech startup, early adopter, price-sensitive"
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '../../factory-brain/src/utils/logger'
import { withRetry } from '../../factory-brain/src/utils/retry'

const log = logger.child({ module: 'PersonaGenerator' })

// ── Schemas ───────────────────────────────────────────────────────────────────

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().min(18).max(75),
  occupation: z.string(),
  company_size: z.enum(['solo', 'startup', 'smb', 'enterprise']),
  industry: z.string(),
  tech_savviness: z.number().min(0).max(1), // 0=novice, 1=expert
  budget_sensitivity: z.number().min(0).max(1), // 0=price-insensitive, 1=very price-sensitive
  adoption_style: z.enum(['innovator', 'early_adopter', 'early_majority', 'late_majority', 'laggard']),
  primary_goal: z.string(),
  pain_points: z.array(z.string()),
  motivations: z.array(z.string()),
  objections: z.array(z.string()),
  communication_style: z.enum(['analytical', 'driver', 'expressive', 'amiable']),
  decision_authority: z.enum(['sole', 'influencer', 'gatekeeper', 'end_user']),
  churn_triggers: z.array(z.string()),
  loyalty_drivers: z.array(z.string()),
  // Behavioral parameters (used in simulation)
  initial_engagement: z.number().min(0).max(1),
  initial_churn_risk: z.number().min(0).max(1),
  purchase_propensity: z.number().min(0).max(1),
  feature_priorities: z.array(z.string()),
})

export type Persona = z.infer<typeof PersonaSchema>

export interface PersonaGenerationConfig {
  saasDescription: string
  targetMarket?: string
  pricePoint?: string
  count?: number
  distributionStrategy?: 'realistic' | 'diverse' | 'adversarial'
}

export interface PersonaGenerationResult {
  personas: Persona[]
  market_summary: string
  dominant_segment: string
  risk_segments: string[]
  generation_time_ms: number
}

// ── Persona Distribution Templates ───────────────────────────────────────────

const ADOPTION_DISTRIBUTION = {
  realistic: {
    innovator: 0.025,
    early_adopter: 0.135,
    early_majority: 0.34,
    late_majority: 0.34,
    laggard: 0.16,
  },
  diverse: {
    innovator: 0.2,
    early_adopter: 0.2,
    early_majority: 0.2,
    late_majority: 0.2,
    laggard: 0.2,
  },
  adversarial: {
    innovator: 0.05,
    early_adopter: 0.1,
    early_majority: 0.2,
    late_majority: 0.35,
    laggard: 0.3,
  },
}

// ── OpenAI Client ─────────────────────────────────────────────────────────────

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ── Core Generation ───────────────────────────────────────────────────────────

async function generatePersonaBatch(
  saasDescription: string,
  targetMarket: string,
  pricePoint: string,
  count: number,
  adoptionStyles: string[]
): Promise<Persona[]> {
  const openai = getOpenAI()

  const systemPrompt = `You are a UX researcher and market analyst specializing in SaaS products.
Generate ${count} realistic user personas for the given SaaS product.
Each persona must be unique, realistic, and reflect real-world user diversity.

Return a JSON object with a "personas" array. Each persona must have ALL these fields:
- id: unique string (e.g. "persona-001")
- name: full name (realistic, diverse)
- age: integer 18-75
- occupation: specific job title
- company_size: one of "solo", "startup", "smb", "enterprise"
- industry: specific industry
- tech_savviness: 0.0-1.0
- budget_sensitivity: 0.0-1.0
- adoption_style: one of ${adoptionStyles.map(s => `"${s}"`).join(', ')}
- primary_goal: what they want to achieve with this SaaS
- pain_points: array of 2-3 specific pain points
- motivations: array of 2-3 motivations for using the product
- objections: array of 2-3 reasons they might NOT buy
- communication_style: one of "analytical", "driver", "expressive", "amiable"
- decision_authority: one of "sole", "influencer", "gatekeeper", "end_user"
- churn_triggers: array of 2-3 things that would make them leave
- loyalty_drivers: array of 2-3 things that keep them subscribed
- initial_engagement: 0.0-1.0 (starting engagement level)
- initial_churn_risk: 0.0-1.0 (starting churn probability)
- purchase_propensity: 0.0-1.0 (likelihood to convert)
- feature_priorities: array of 3-5 most important features for them

Also include:
- market_summary: 1-2 sentence overview of the target market
- dominant_segment: the largest user segment
- risk_segments: array of 1-2 high-churn-risk segments

Return ONLY valid JSON, no markdown.`

  const userPrompt = `SaaS Product: ${saasDescription}
Target Market: ${targetMarket}
Price Point: ${pricePoint}
Adoption distribution to follow: ${JSON.stringify(
    adoptionStyles.reduce((acc, style) => {
      acc[style] = adoptionStyles.filter(s => s === style).length
      return acc
    }, {} as Record<string, number>)
  )}

Generate ${count} diverse, realistic personas.`

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Higher temperature for more diverse personas
    }),
    { maxAttempts: 3, baseDelayMs: 1000 }
  )

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
  const rawPersonas = parsed.personas ?? []

  // Validate and assign IDs
  const personas: Persona[] = []
  for (let i = 0; i < rawPersonas.length; i++) {
    try {
      const persona = PersonaSchema.parse({
        ...rawPersonas[i],
        id: rawPersonas[i].id ?? `persona-${String(i + 1).padStart(3, '0')}`,
      })
      personas.push(persona)
    } catch (err) {
      log.warn({ index: i, err }, 'Persona validation failed, skipping')
    }
  }

  return personas
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a cohort of user personas for a SaaS product.
 *
 * @param config - Generation configuration
 * @returns Generated personas with market analysis
 */
export async function generatePersonas(
  config: PersonaGenerationConfig
): Promise<PersonaGenerationResult> {
  const {
    saasDescription,
    targetMarket = 'B2B SaaS users',
    pricePoint = 'mid-market ($50-200/month)',
    count = 20,
    distributionStrategy = 'realistic',
  } = config

  const startTime = Date.now()
  log.info({ count, distributionStrategy }, 'Generating personas')

  // Build adoption style distribution
  const distribution = ADOPTION_DISTRIBUTION[distributionStrategy]
  const adoptionStyles: string[] = []
  for (const [style, ratio] of Object.entries(distribution)) {
    const styleCount = Math.round(count * ratio)
    for (let i = 0; i < styleCount; i++) {
      adoptionStyles.push(style)
    }
  }
  // Fill remaining slots with early_majority
  while (adoptionStyles.length < count) adoptionStyles.push('early_majority')
  // Shuffle for randomness
  adoptionStyles.sort(() => Math.random() - 0.5)

  // Generate in batches of 10 to stay within token limits
  const batchSize = 10
  const allPersonas: Persona[] = []
  let marketSummary = ''
  let dominantSegment = ''
  let riskSegments: string[] = []

  for (let i = 0; i < count; i += batchSize) {
    const batchCount = Math.min(batchSize, count - i)
    const batchStyles = adoptionStyles.slice(i, i + batchCount)

    log.info({ batch: Math.floor(i / batchSize) + 1, batchCount }, 'Generating persona batch')

    const batchPersonas = await generatePersonaBatch(
      saasDescription,
      targetMarket,
      pricePoint,
      batchCount,
      batchStyles
    )
    allPersonas.push(...batchPersonas)

    // Extract market analysis from first batch
    if (i === 0) {
      const openai = getOpenAI()
      const analysisResponse = await withRetry(
        () => openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `For this SaaS: "${saasDescription}" targeting "${targetMarket}" at "${pricePoint}", provide:
1. market_summary: 1-2 sentence market overview
2. dominant_segment: the largest user segment name
3. risk_segments: array of 1-2 high-churn-risk segment names

Return JSON only.`,
          }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
        { maxAttempts: 2, baseDelayMs: 500 }
      )
      const analysis = JSON.parse(analysisResponse.choices[0].message.content ?? '{}')
      marketSummary = analysis.market_summary ?? ''
      dominantSegment = analysis.dominant_segment ?? ''
      riskSegments = analysis.risk_segments ?? []
    }
  }

  const generationTimeMs = Date.now() - startTime
  log.info(
    { generated: allPersonas.length, generationTimeMs },
    'Persona generation complete'
  )

  return {
    personas: allPersonas,
    market_summary: marketSummary,
    dominant_segment: dominantSegment,
    risk_segments: riskSegments,
    generation_time_ms: generationTimeMs,
  }
}

/**
 * Convert a Persona into an AIAgentConfig-compatible object for use in swarm.
 */
export function personaToAgentConfig(persona: Persona) {
  return {
    agentId: persona.id,
    role: mapAdoptionToRole(persona.adoption_style),
    modelVersion: 'gpt-4o-mini',
    temperatureParam: 0.5 + persona.tech_savviness * 0.5,
    confidenceThreshold: 0.6 + persona.tech_savviness * 0.3,
    specialization: persona.feature_priorities,
    agentMemory: {
      persona,
      predictions: [],
      experiences: 0,
      temporal_memories: [],
    },
    performanceMetrics: {
      accuracy: 0.7 + persona.tech_savviness * 0.2,
      precision: 0.7 + persona.tech_savviness * 0.2,
      recall: 0.65 + persona.tech_savviness * 0.2,
      f1Score: 0.67 + persona.tech_savviness * 0.2,
    },
    isActive: true,
    createdAt: new Date(),
    lastUpdated: new Date(),
  }
}

function mapAdoptionToRole(
  adoptionStyle: Persona['adoption_style']
): 'predictor' | 'simulator' | 'analyzer' | 'optimizer' | 'validator' {
  const mapping: Record<Persona['adoption_style'], 'predictor' | 'simulator' | 'analyzer' | 'optimizer' | 'validator'> = {
    innovator: 'predictor',
    early_adopter: 'optimizer',
    early_majority: 'simulator',
    late_majority: 'analyzer',
    laggard: 'validator',
  }
  return mapping[adoptionStyle]
}
