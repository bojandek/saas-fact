import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Browser client (client-side)
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Server client (server-side)
export const createServerClient = (cookieStore: any) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.getAll().map(({ name, value }: any) => `${name}=${value}`).join('; '),
      },
    },
  })
}

// Singleton for browser client
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserClient can only be called on the client side')
  }

  if (!browserClient) {
    browserClient = createBrowserClient()
  }

  return browserClient
}
