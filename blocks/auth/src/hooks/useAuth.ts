import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const session = useSession()
  const supabase = useSupabaseClient()

  return {
    user: session?.user as User | null,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  }
}