/**
 * Environment variable validation for Factory Brain.
 *
 * Uses Zod to validate all required environment variables at startup.
 * If any required variable is missing or invalid, the process exits
 * immediately with a clear, actionable error message — rather than
 * failing silently deep in the code with a cryptic error.
 *
 * Usage:
 *   import { env } from './utils/env'
 *   const llm = getLLMClient() // uses ANTHROPIC_API_KEY
 */

import { z } from 'zod'

const envSchema = z.object({
  // ── OpenAI ──────────────────────────────────────────────────────────────────
  OPENAI_API_KEY: z
    .string()
    .min(20, 'OPENAI_API_KEY must be a valid API key (min 20 chars)')
    .startsWith('sk-', 'OPENAI_API_KEY must start with "sk-"'),

  // ── Supabase ─────────────────────────────────────────────────────────────────
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .includes('supabase', { message: 'SUPABASE_URL must be a Supabase project URL' }),

  SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'SUPABASE_ANON_KEY must be a valid key'),

  // Service role key is optional but recommended for RAG system
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20)
    .optional(),

  // ── Application ──────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),

  // ── Optional Integrations ────────────────────────────────────────────────────
  NEO4J_URI: z.string().url().optional(),
  NEO4J_USERNAME: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  COOLIFY_API_KEY: z.string().optional(),
  COOLIFY_BASE_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables and returns a typed, validated object.
 * Exits the process with a clear error message if validation fails.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n')

    console.error(
      `\n❌ Invalid environment variables detected:\n\n${errors}\n\n` +
      `Please check your .env file or environment configuration.\n` +
      `See production.env.example for required variables.\n`
    )

    // In test environment, throw instead of exiting to allow test isolation
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Invalid environment variables:\n${errors}`)
    }

    process.exit(1)
  }

  return result.data
}

/**
 * Validated, typed environment variables.
 * Import this instead of accessing process.env directly.
 */
export const env = validateEnv()
