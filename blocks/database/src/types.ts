// Generated Supabase types - run 'pnpm db:generate' after schema changes
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          tenant_id: string
          role: 'user' | 'admin' | 'owner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          tenant_id: string
          role?: 'user' | 'admin' | 'owner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          tenant_id?: string
          role?: 'user' | 'admin' | 'owner'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string
          plan: 'free' | 'pro' | 'enterprise'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          stripe_subscription_id: string | null
          status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing'
          plan_name: string | null
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          stripe_subscription_id?: string | null
          status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing'
          plan_name?: string | null
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          stripe_subscription_id?: string | null
          status?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing'
          plan_name?: string | null
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

export type Tables = Database['public']['Tables']
export type User = Tables['users']['Row']
export type UserInsert = Tables['users']['Insert']
export type UserUpdate = Tables['users']['Update']

export type Tenant = Tables['tenants']['Row']
export type TenantInsert = Tables['tenants']['Insert']
export type TenantUpdate = Tables['tenants']['Update']

export type Subscription = Tables['subscriptions']['Row']
export type SubscriptionInsert = Tables['subscriptions']['Insert']
export type SubscriptionUpdate = Tables['subscriptions']['Update']
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
