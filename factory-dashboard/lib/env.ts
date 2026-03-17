/**
 * Environment variable validation for Factory Dashboard (Next.js).
 *
 * Validates both server-side and client-side (NEXT_PUBLIC_*) variables
 * at startup. Import `serverEnv` in API routes and `clientEnv` in
 * client components.
 *
 * Next.js automatically exposes NEXT_PUBLIC_* variables to the browser.
 * All other variables are server-only and must never be sent to the client.
 */

import { z } from 'zod'

// ── Server-side variables (API routes, server components) ─────────────────────
const serverEnvSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .min(20, 'OPENAI_API_KEY is required')
    .startsWith('sk-', 'OPENAI_API_KEY must start with "sk-"'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(20, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  // Auth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters for security')
    .optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Coolify (optional)
  COOLIFY_API_KEY: z.string().optional(),
  COOLIFY_BASE_URL: z.string().url().optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// ── Client-side variables (NEXT_PUBLIC_*) ─────────────────────────────────────
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

function validateServerEnv(): ServerEnv {
  // Only validate on server-side
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv must not be imported in client components')
  }

  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n')

    console.error(
      `\n❌ Invalid server environment variables:\n\n${errors}\n\n` +
      `Check your .env.local file. See production.env.example for reference.\n`
    )

    if (process.env.NODE_ENV !== 'production') {
      // In dev, warn but don't crash to allow partial local setup
      console.warn('⚠️  Continuing with missing env vars in development mode.\n')
      return result.error.issues.reduce((acc, _) => acc, process.env as unknown as ServerEnv)
    }

    process.exit(1)
  }

  return result.data
}

function validateClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })

  if (!result.success) {
    console.warn('[env] Some NEXT_PUBLIC_* variables are missing or invalid')
    return {} as ClientEnv
  }

  return result.data
}

export const serverEnv = validateServerEnv()
export const clientEnv = validateClientEnv()
