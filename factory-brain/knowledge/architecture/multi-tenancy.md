# Multi-Tenancy Architecture Patterns

## Overview
Multi-tenancy allows a single SaaS instance to serve multiple independent customers (tenants) securely and efficiently.

## Key Strategies

### 1. Row-Level Security (RLS) — Recommended for Factory
```sql
-- Tenant-aware policies
CREATE POLICY tenant_isolation ON users
USING (tenant_id = current_user_tenant_id());

-- All queries filtered by tenant_id
SELECT * FROM users WHERE tenant_id = current_user_tenant_id();
```

**Pros:**
- Simple, maintainable
- Database-level enforcement
- Cost-efficient

**Cons:**
- Performance: queries filter all rows
- Tenant_id must be in user context

### 2. Schema-per-Tenant
Each tenant gets dedicated PostgreSQL schema.

```sql
CREATE SCHEMA tenant_123;
CREATE TABLE tenant_123.users (...);
```

**Pros:**
- Perfect isolation
- Per-tenant backups
- Custom per-tenant features

**Cons:**
- High maintenance
- Connection pooling complexity
- Migration overhead

### 3. Database-per-Tenant
Each tenant owns separate database instance.

**Pros:**
- Maximum isolation
- Scalability per tenant
- Compliance (data residency)

**Cons:**
- High operational cost
- Complex DevOps
- Connection management

## Factory Recommendation: RLS + Tenant Context

```typescript
// All queries wrapped in tenant context
interface TenantContext {
  tenantId: string
  userId: string
}

async function getTenantData(context: TenantContext) {
  // Supabase RLS automatically filters by tenant
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', context.tenantId)
}
```

## Pricing Models Integration

### Per-Tenant Metrics
Track per-tenant usage for fair billing:
- Seats/users
- Data storage
- API calls
- Features used

```typescript
interface TenantMetrics {
  tenant_id: string
  period: string
  active_users: number
  api_calls: number
  storage_gb: number
}
```

## Security Best Practices

1. **Tenant ID in Context** — Never passed as parameter
2. **Audit Logging** — Track all cross-tenant operations
3. **Data Export Compliance** — Honor GDPR/CCPA
4. **Test Isolation** — Each test runs in isolated tenant
