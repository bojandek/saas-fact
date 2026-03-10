import { supabase } from '@saas-factory/db'
import type { Database } from './types'

export const getUserById = async (userId: string, tenantId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw error
  return data as Database['public']['Tables']['users']['Row']
}

export const getTenantBySubdomain = async (subdomain: string) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (error) throw error
  return data as Database['public']['Tables']['tenants']['Row']
}

export const createTenant = async (name: string, subdomain: string) => {
  const { data, error } = await supabase
    .from('tenants')
    .insert({ name, subdomain, plan: 'free' })
    .select()
    .single()

  if (error) throw error
  return data
}
