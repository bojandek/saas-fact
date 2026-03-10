# @saas-factory/blocks-auth

Supabase Auth block with multi-tenant support.

## Usage

```tsx
import { useAuth, LoginForm } from '@saas-factory/blocks-auth'

export default function LoginPage() {
  return <LoginForm />
}
```

## Middleware

Add to `middleware.ts`:

```ts
export { middleware } from '@saas-factory/blocks-auth/middleware'
```

## RLS

Enable Row Level Security on Supabase tables with tenant_id policies.
