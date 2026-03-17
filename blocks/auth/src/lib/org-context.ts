/**
 * org-context.ts
 *
 * Manages org_id context for Row Level Security (RLS) enforcement.
 * Every database query must be scoped to the current org_id so that
 * Supabase RLS policies can enforce tenant isolation.
 *
 * Usage:
 *   const client = await createOrgScopedClient(supabase, orgId)
 *   const { data } = await client.from('projects').select('*')
 *   // ↑ automatically filtered by RLS to orgId only
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Set the current org_id in the Postgres session so RLS policies can use it.
 * Must be called before any query that relies on auth.org_id().
 */
export async function setOrgContext(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const { error } = await supabase.rpc('set_org_context', { org_id: orgId })
  if (error) {
    throw new Error(`Failed to set org context: ${error.message}`)
  }
}

/**
 * Clear the org context from the Postgres session.
 * Call this after a request completes to prevent context leakage.
 */
export async function clearOrgContext(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc('clear_org_context').catch(() => {
    // Non-critical: session will be cleaned up anyway
  })
}

/**
 * Resolve the org_id for a given user.
 * Returns the user's primary org_id from the org_members table.
 */
export async function resolveOrgId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null
  return data.org_id
}

/**
 * Resolve all org_ids for a given user (for multi-org users).
 */
export async function resolveAllOrgIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<{ orgId: string; role: string }>> {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !data) return []
  return data.map((row) => ({ orgId: row.org_id, role: row.role }))
}

/**
 * Create a Supabase client scoped to a specific org.
 * Sets the RLS context so all queries are automatically filtered.
 *
 * @example
 * const client = await createOrgScopedClient(supabase, 'org-uuid-here')
 * const { data } = await client.from('saas_projects').select('*')
 * // Returns only projects belonging to 'org-uuid-here'
 */
export async function createOrgScopedClient(
  supabase: SupabaseClient,
  orgId: string
): Promise<SupabaseClient> {
  await setOrgContext(supabase, orgId)
  return supabase
}

/**
 * Execute a function with org context set, then clean up.
 * Ensures context is always cleared even if the function throws.
 *
 * @example
 * const result = await withOrgContext(supabase, orgId, async (client) => {
 *   return client.from('projects').select('*')
 * })
 */
export async function withOrgContext<T>(
  supabase: SupabaseClient,
  orgId: string,
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  await setOrgContext(supabase, orgId)
  try {
    return await fn(supabase)
  } finally {
    await clearOrgContext(supabase)
  }
}

/**
 * Validate that a user belongs to a given org.
 * Use this before allowing org-scoped operations.
 */
export async function validateOrgMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<{ valid: boolean; role?: string; error?: string }> {
  const { data, error } = await supabase
    .from('org_members')
    .select('role, is_active')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single()

  if (error || !data) {
    return { valid: false, error: 'User is not a member of this organization' }
  }

  if (!data.is_active) {
    return { valid: false, error: 'User membership is inactive' }
  }

  if (requiredRole) {
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 }
    const userLevel = roleHierarchy[data.role as keyof typeof roleHierarchy] ?? 0
    const requiredLevel = roleHierarchy[requiredRole] ?? 0

    if (userLevel < requiredLevel) {
      return {
        valid: false,
        error: `Insufficient permissions. Required: ${requiredRole}, got: ${data.role}`,
      }
    }
  }

  return { valid: true, role: data.role }
}
