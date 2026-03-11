/**
 * Multi-tenant database types for SaaS applications
 */

export interface Tenant {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  owner_id: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'owner' | 'member' | 'guest'
  created_at: string
}

export interface Subscription {
  id: string
  tenant_id: string
  stripe_customer_id: string
  stripe_subscription_id?: string
  plan_id: string
  status: 'active' | 'past_due' | 'canceled' | 'incomplete'
  current_period_start?: string
  current_period_end?: string
  cancel_at?: string
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  created_at: string
}

/**
 * RLS (Row Level Security) policies configuration
 */
export interface RLSPolicy {
  table: string
  policy: string
  definition: string
}

/**
 * Database query options
 */
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  ascending?: boolean
}

/**
 * Tenant context for multi-tenant operations
 */
export interface TenantContext {
  tenantId: string
  userId: string
}

export type Database = any
