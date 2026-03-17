/**
 * API Route Helpers
 *
 * Provides reusable wrappers for authentication, input validation, and
 * standardized error responses across all factory-dashboard API routes.
 *
 * Usage:
 *   export const POST = withAuth(withValidation(MySchema, async (req, ctx) => {
 *     const { body, userId } = ctx
 *     // body is fully typed and validated
 *     // userId is guaranteed to be present
 *   }))
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string
  userEmail: string
}

export interface ValidatedContext<T> extends AuthContext {
  body: T
}

export type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>

export type ValidatedHandler<T> = (
  req: NextRequest,
  ctx: ValidatedContext<T>
) => Promise<NextResponse>

// ─── Standard Error Responses ────────────────────────────────────────────────

export const ApiError = {
  unauthorized: (message = 'Authentication required') =>
    NextResponse.json({ error: 'Unauthorized', message }, { status: 401 }),

  forbidden: (message = 'Insufficient permissions') =>
    NextResponse.json({ error: 'Forbidden', message }, { status: 403 }),

  badRequest: (message = 'Invalid request', details?: unknown) =>
    NextResponse.json({ error: 'Bad Request', message, details }, { status: 400 }),

  unprocessable: (errors: unknown) =>
    NextResponse.json(
      { error: 'Unprocessable Entity', message: 'Validation failed', errors },
      { status: 422 }
    ),

  tooManyRequests: (retryAfter?: number) =>
    NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded', retryAfter },
      { status: 429 }
    ),

  internal: (message = 'Internal server error') =>
    NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 }),

  notFound: (message = 'Resource not found') =>
    NextResponse.json({ error: 'Not Found', message }, { status: 404 }),
}

// ─── withAuth Wrapper ─────────────────────────────────────────────────────────

/**
 * Wraps an API handler with authentication check.
 * Reads user ID from the x-user-id header injected by middleware,
 * with a fallback to direct Supabase auth check for extra security.
 */
export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Primary: read from middleware-injected header
    const userId = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email') ?? ''

    if (userId) {
      try {
        return await handler(req, { userId, userEmail })
      } catch (error) {
        console.error('[API Error]', error)
        const message = error instanceof Error ? error.message : 'Unexpected error'
        return ApiError.internal(message)
      }
    }

    // Fallback: direct Supabase auth check (for cases where middleware is bypassed)
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() { /* read-only in route handlers */ },
          },
        }
      )

      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return ApiError.unauthorized()
      }

      return await handler(req, { userId: user.id, userEmail: user.email ?? '' })
    } catch (error) {
      console.error('[Auth Error]', error)
      return ApiError.internal()
    }
  }
}

// ─── withValidation Wrapper ───────────────────────────────────────────────────

/**
 * Wraps an authenticated handler with Zod request body validation.
 * Must be used inside withAuth.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T>
): AuthHandler {
  return async (req: NextRequest, authCtx: AuthContext): Promise<NextResponse> => {
    let rawBody: unknown

    try {
      rawBody = await req.json()
    } catch {
      return ApiError.badRequest('Request body must be valid JSON')
    }

    const result = schema.safeParse(rawBody)

    if (!result.success) {
      return ApiError.unprocessable(result.error.flatten())
    }

    try {
      return await handler(req, { ...authCtx, body: result.data })
    } catch (error) {
      console.error('[Handler Error]', error)
      const message = error instanceof Error ? error.message : 'Unexpected error'
      return ApiError.internal(message)
    }
  }
}

// ─── Common Zod Schemas ───────────────────────────────────────────────────────

export const SaasDescriptionSchema = z.object({
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  appName: z
    .string()
    .min(2, 'App name must be at least 2 characters')
    .max(100, 'App name must be at most 100 characters')
    .optional(),
})

export const BlueprintInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  sqlSchema: z.string().optional(),
  rlsPolicies: z.string().optional(),
})

export const ThemeInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100).optional(),
  industry: z.string().max(100).optional(),
})

export const LandingPageInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  blueprint: z.object({
    sqlSchema: z.string().optional(),
    apiSpec: z.string().optional(),
    pricingModel: z.string().optional(),
  }).optional(),
})

export const GrowthPlanInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  targetMarket: z.string().max(200).optional(),
  pricingModel: z.string().max(100).optional(),
})

export const ComplianceInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  regions: z.array(z.string()).min(1).max(10).optional(),
})

export const QaTestsInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  blueprint: z.object({
    sqlSchema: z.string().optional(),
    apiSpec: z.string().optional(),
  }).optional(),
})

export const LegalDocsInputSchema = z.object({
  appName: z.string().min(2).max(100),
  companyName: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(2000),
  jurisdiction: z.string().max(100).optional(),
})

export const SqlInputSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  features: z.array(z.string()).max(20).optional(),
})

export const RagQuerySchema = z.object({
  query: z.string().min(3).max(500),
  category: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(20).optional(),
})

export const AssembleSaasSchema = z.object({
  description: z.string().min(10).max(2000),
  appName: z.string().min(2).max(100),
  blueprint: z.object({
    sqlSchema: z.string(),
    rlsPolicies: z.string().optional(),
    apiSpec: z.string().optional(),
    pricingModel: z.string().optional(),
  }),
  theme: z.object({
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
  }).optional(),
})
