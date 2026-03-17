export { useAuth } from './hooks/useAuth'
export { AuthProvider, useAuthContext } from './components/AuthProvider'
export { LoginForm } from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { middleware } from './middleware'
export { createBrowserClient, createServerClient, getBrowserClient } from './lib/supabase-client'
export {
  setOrgContext,
  clearOrgContext,
  resolveOrgId,
  resolveAllOrgIds,
  createOrgScopedClient,
  withOrgContext,
  validateOrgMembership,
} from './lib/org-context'
export type { User, UserInsert, UserUpdate, Session, AuthError } from './types'
