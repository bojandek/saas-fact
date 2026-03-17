import { createBrowserClient } from '@saas-factory/auth'
import type { Database, User, Tenant, Subscription, UserInsert, TenantInsert, SubscriptionInsert } from './types'

const supabase = createBrowserClient()

/**
 * Pretraga korisnika po ID-u
 */
export const getUserById = async (userId: string, tenantId: string): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw error
  return data as User
}

/**
 * Pretraga korisnika po email-u
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data as User | null
}

/**
 * Pronalaženje tenant-a po ID-u
 */
export const getTenantById = async (tenantId: string): Promise<Tenant> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) throw error
  return data as Tenant
}

/**
 * Pronalaženje tenant-a po subdomenu
 */
export const getTenantBySubdomain = async (subdomain: string): Promise<Tenant | null> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (error) throw error
  return data as Tenant | null
}

/**
 * Kreiranje novog tenant-a
 */
export const createTenant = async (tenant: TenantInsert): Promise<Tenant> => {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single()

  if (error) throw error
  return data as Tenant
}

/**
 * Ažuriranje tenant-a
 */
export const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<Tenant> => {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) throw error
  return data as Tenant
}

/**
 * Pronalaženje subscription-a za tenant
 */
export const getSubscriptionByTenant = async (tenantId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  return data as Subscription | null
}

/**
 * Pronalaženje subscription-a po Stripe ID-u
 */
export const getSubscriptionByStripeId = async (stripeSubscriptionId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle()

  if (error) throw error
  return data as Subscription | null
}

/**
 * Kreiranje nove subscription-e
 */
export const createSubscription = async (subscription: SubscriptionInsert): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

/**
 * Ažuriranje subscription-e
 */
export const updateSubscription = async (
  subscriptionId: string,
  updates: Partial<Subscription>
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

/**
 * Pronalaženje svih korisnika u tenant-u
 */
export const getTenantUsers = async (tenantId: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) throw error
  return data as User[]
}

/**
 * Pronalaženje tenant-a po Stripe Customer ID-u
 */
export const getTenantByStripeCustomerId = async (stripeCustomerId: string): Promise<Tenant | null> => {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) throw error;
  return data as Tenant | null;
};

/**
 * Kreiranje novog korisnika u tenantu (za pozivnice)
 */
export const createTenantUser = async (user: UserInsert): Promise<User> => {
  const { data, error } = await supabase
    .from("users")
    .insert(user)
    .select()
    .single();

  if (error) throw error;
  return data as User;
};
