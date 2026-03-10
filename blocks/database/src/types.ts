// Generated Supabase types - run 'pnpm db:generate' after schema changes
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          tenant_id: string
          role: 'user' | 'admin' | 'owner'
          created_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          tenant_id: string
          role?: 'user' | 'admin' | 'owner'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          tenant_id?: string
          role?: 'user' | 'admin' | 'owner'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string | null
          plan: 'free' | 'pro' | 'enterprise'
          stripe_customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain?: string | null
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
