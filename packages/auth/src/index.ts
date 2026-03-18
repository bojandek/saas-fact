/**
 * @saas-factory/auth
 * Thin wrapper around @supabase/ssr for consistent auth across all SaaS Factory apps.
 */
export { createServerClient, createBrowserClient } from '@supabase/ssr'
export { createClient } from '@supabase/supabase-js'
export type { User, Session, AuthError } from '@supabase/supabase-js'
