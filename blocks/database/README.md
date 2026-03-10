# @saas-factory/blocks-database

Multi-tenant Supabase database layer.

## Schemas
- users (tenant_id, role)
- tenants (name, subdomain, plan, stripe_customer_id)

## RLS Policies (Supabase Dashboard)
```
CREATE POLICY "Users can only see own tenant data" ON users
FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

## Usage
```ts
import { getUserById } from '@saas-factory/blocks-database';

const user = await getUserById(userId, tenantId);
```

Run `pnpm db:generate` after schema changes.
