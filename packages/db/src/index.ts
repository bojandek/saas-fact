/**
 * Database layer with Supabase client
 * Provides typed client, admin client, and type exports
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Validate required env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Public Supabase client – uses anon key, respects RLS policies
 * Use for client-side queries and user-scoped operations
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined', // Only persist in browser
    autoRefreshToken: true,
  },
})

/**
 * Admin Supabase client – uses service role key, bypasses RLS
 * Use ONLY for server-side admin operations (never expose to client)
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

/**
 * Create a Supabase client with custom auth token (for SSR)
 */
export function createServerClient(accessToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false },
  })
}

// Re-export types
export type { Database } from './types'
export type {
  Tenant,
  User,
  TenantUser,
  Subscription,
  Plan,
  RLSPolicy,
  QueryOptions,
  TenantContext,
} from './types'
