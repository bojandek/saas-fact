# Row Level Security (RLS) Setup Guide

## Overview

This guide explains how to set up and verify Row Level Security (RLS) policies in Supabase to ensure multi-tenant data isolation in SaaS Factory.

## What is RLS?

Row Level Security is a PostgreSQL feature that restricts which rows a user can access based on policies defined at the database level. This ensures that:

- **User A** from **Tenant 1** cannot see data from **Tenant 2**
- **Regular users** cannot modify data they don't own
- **Admins** can manage data within their tenant
- Data isolation happens at the database level (most secure)

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Next.js, API Routes, Components)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Supabase Client (JWT Token)        │
│  Contains: user_id, tenant_id           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   PostgreSQL RLS Policies               │
│  (Enforce tenant_id + role checks)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Database Tables                    │
│  (users, tenants, subscriptions)        │
└─────────────────────────────────────────┘
```

## Setup Steps

### 1. Enable RLS on Tables

Run the migration: `migrations/001_enable_rls.sql`

This will:
- Enable RLS on `users`, `tenants`, and `subscriptions` tables
- Create helper functions: `get_current_tenant_id()`, `get_current_user_id()`
- Create RLS policies for SELECT, INSERT, UPDATE operations

### 2. Configure JWT Claims

In your Supabase project settings:

1. Go to **Authentication** → **JWT Templates**
2. Add custom claims to the JWT token:

```json
{
  "tenant_id": "{{ tenant_id }}",
  "role": "{{ role }}"
}
```

This ensures every JWT token contains the user's `tenant_id` and `role`.

### 3. Pass Tenant ID in Auth Flow

When a user signs up (in `blocks/auth/src/hooks/useAuth.ts`):

```typescript
// After creating tenant
const { data: tenantData } = await supabase
  .from('tenants')
  .insert({ name, subdomain, plan: 'free' })
  .select()
  .single()

// Create user with tenant_id
await supabase.from('users').insert({
  id: authData.user.id,
  email,
  name,
  tenant_id: tenantData.id,  // ← Link to tenant
  role: 'owner',
})
```

## RLS Policies Explained

### Users Table

| Policy | Operation | Who | Condition |
|--------|-----------|-----|-----------|
| `users_select_own` | SELECT | Any user | Can view own record |
| `users_select_tenant_admin` | SELECT | Admin/Owner | Can view all users in tenant |
| `users_update_own` | UPDATE | Any user | Can update own record |
| `users_update_tenant_admin` | UPDATE | Admin/Owner | Can update users in tenant |
| `users_insert_owner` | INSERT | Owner | Can add new users to tenant |

### Tenants Table

| Policy | Operation | Who | Condition |
|--------|-----------|-----|-----------|
| `tenants_select_own` | SELECT | Any user | Can view own tenant |
| `tenants_update_owner` | UPDATE | Owner | Can update tenant settings |

### Subscriptions Table

| Policy | Operation | Who | Condition |
|--------|-----------|-----|-----------|
| `subscriptions_select_tenant` | SELECT | Any user | Can view subscriptions for their tenant |
| `subscriptions_update_admin` | UPDATE | Admin/Owner | Can update subscriptions |
| `subscriptions_insert_admin` | INSERT | Admin/Owner | Can create subscriptions |

## Testing RLS

### Manual Testing in Supabase Dashboard

1. Go to **SQL Editor**
2. Run a query as a specific user:

```sql
-- Set JWT claim to simulate user from Tenant A
SET request.jwt.claims = '{"sub":"user-123","tenant_id":"tenant-a-id","role":"user"}';

-- This should return data
SELECT * FROM users WHERE tenant_id = 'tenant-a-id';

-- This should return nothing (RLS blocks it)
SELECT * FROM users WHERE tenant_id = 'tenant-b-id';
```

### Automated Testing

Run the test suite:

```bash
cd blocks/database
pnpm test rls.test.ts
```

Tests verify:
- Users can only see their own data
- Users cannot access other tenants' data
- Admins can manage tenant data
- Role-based access control works

## Common Issues & Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: The JWT doesn't contain the required `tenant_id` claim.

**Solution**: 
1. Check that JWT templates are configured correctly
2. Verify the user's `tenant_id` is set in the `users` table
3. Re-authenticate the user to get a new JWT token

### Issue: "permission denied for schema public"

**Cause**: RLS is enabled but no policies are defined.

**Solution**: Run the migration `001_enable_rls.sql` to create policies.

### Issue: Queries return empty results unexpectedly

**Cause**: RLS policy is too restrictive or JWT claims are wrong.

**Solution**:
1. Check the JWT claims: `console.log(supabase.auth.session()?.user)`
2. Verify the policy condition matches your JWT claims
3. Test with SQL Editor to debug the policy

## Best Practices

### 1. Always Include tenant_id in Queries

```typescript
// ✅ Good - RLS will filter by tenant_id
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('tenant_id', tenantId)

// ❌ Bad - Relies only on RLS (less explicit)
const { data } = await supabase
  .from('users')
  .select('*')
```

### 2. Use Helper Functions in Policies

```sql
-- ✅ Good - Uses helper function
WHERE tenant_id = get_current_tenant_id()

-- ❌ Bad - Hardcoded tenant_id
WHERE tenant_id = 'specific-tenant-id'
```

### 3. Test RLS in Development

Always test RLS policies before deploying to production:

```bash
pnpm test:rls
```

### 4. Monitor RLS Performance

RLS adds a small overhead to queries. Monitor performance:

```sql
-- Check RLS policy execution time
EXPLAIN ANALYZE
SELECT * FROM users WHERE tenant_id = get_current_tenant_id();
```

## Migrating Existing Data

If you're adding RLS to an existing database:

1. **Backup your database** first
2. Run the migration: `001_enable_rls.sql`
3. Verify all users have a `tenant_id` set
4. Test in staging environment
5. Deploy to production

## Next Steps

- Implement RLS for additional tables (bookings, products, etc.)
- Add audit logging to track data access
- Set up monitoring alerts for RLS policy violations
- Document your custom RLS policies

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SaaS Factory Multi-Tenant Architecture](../../../EXPERT_RECOMMENDATIONS.md)
