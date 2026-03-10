import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@saas-factory/db'

// Create a Server-side Supabase client
export const createClient = () => createServerComponentClient<Database>({ cookies })

// Create a Client-side Supabase client
export const createBrowserClient = () => createClientComponentClient<Database>()
