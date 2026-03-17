/**
 * Multi-Schema Supabase Client
 *
 * Creates Supabase clients that are scoped to a specific PostgreSQL schema.
 * This enables the Shared Auth model where:
 *   - public schema: shared auth tables (organizations, org_members)
 *   - {schema_name} schema: isolated business data per SaaS app
 *
 * Usage in generated SaaS apps:
 *   // Server-side
 *   const supabase = createSchemaServerClient()
 *   const { data } = await supabase.from('members').select('*')
 *   // ^ queries teretana_crm.members, not public.members
 *
 *   // Client-side
 *   const supabase = createSchemaBrowserClient()
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { CookieOptions } from '@supabase/ssr'

// ─── Environment ──────────────────────────────────────────────────────────────

function getSchemaName(): string {
  // Priority: explicit env var > app name > 'public'
  return (
    process.env.SUPABASE_SCHEMA ||
    process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ||
    process.env.APP_NAME?.replace(/-/g, '_') ||
    'public'
  )
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

// ─── Browser Client ───────────────────────────────────────────────────────────

/**
 * Creates a browser-side Supabase client scoped to the app's schema.
 * Use in Client Components.
 */
export function createSchemaBrowserClient(schemaOverride?: string) {
  const schema = schemaOverride || getSchemaName()

  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      db: { schema },
      cookieOptions: {
        name: `sb-${schema}-auth-token`,
      },
    }
  )
}

// ─── Server Client (Next.js App Router) ──────────────────────────────────────

/**
 * Creates a server-side Supabase client scoped to the app's schema.
 * Use in Server Components, Route Handlers, and Server Actions.
 *
 * Requires: import { cookies } from 'next/headers'
 */
export function createSchemaServerClient(
  cookieStore: ReturnType<typeof import('next/headers').cookies>,
  schemaOverride?: string
) {
  const schema = schemaOverride || getSchemaName()

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      db: { schema },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component — cookies can't be set
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component — cookies can't be set
          }
        },
      },
    }
  )
}

// ─── Service Role Client (Admin) ──────────────────────────────────────────────

/**
 * Creates a service-role Supabase client for admin operations.
 * Bypasses RLS — use only in server-side code with proper authorization.
 */
export function createSchemaAdminClient(schemaOverride?: string) {
  const schema = schemaOverride || getSchemaName()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false },
    db: { schema },
  })
}

// ─── Public Schema Client (Shared Auth) ──────────────────────────────────────

/**
 * Creates a client scoped to the public schema.
 * Use for shared auth operations (organizations, org_members).
 */
export function createPublicSchemaClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      auth: { persistSession: false },
      db: { schema: 'public' },
    }
  )
}

// ─── Schema Context ───────────────────────────────────────────────────────────

/**
 * React context for the current schema name.
 * Wrap your app with SchemaProvider to make schema available everywhere.
 */
export const SCHEMA_NAME = getSchemaName()

/**
 * Get the current schema name from environment.
 */
export function getCurrentSchema(): string {
  return getSchemaName()
}

/**
 * Check if the current app is using schema isolation.
 */
export function isSchemaIsolated(): boolean {
  return getSchemaName() !== 'public'
}
