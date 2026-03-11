import { Database } from '@saas-factory/database'

export type Tables = Database['public']['Tables']

export type User = Tables['users']['Row']
export type UserInsert = Tables['users']['Insert']
export type UserUpdate = Tables['users']['Update']

export type Tenant = Tables['tenants']['Row']
export type TenantInsert = Tables['tenants']['Insert']

export type Session = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: 'Bearer'
}

export type AuthError = {
  message: string
  status: number
  code?: string
}
