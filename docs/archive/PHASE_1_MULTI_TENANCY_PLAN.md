# Phase 1: Multi-Tenancy Architecture Implementation

## Overview

Omogućiti SaaS Factory da pokreće više organizacija/korisnika s **Row Level Security (RLS)** garantijom da svaki tenant vidi samo svoj podatak.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           End User Applications                  │
│  factory-dashboard | saas-001-booking | etc     │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│        Supabase Middleware (Auth + RLS)         │
│  - Tenant context injection                     │
│  - Row Level Security enforcement               │
│  - Multi-org isolation                          │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│      PostgreSQL Database (Supabase)             │
│  - Tables with org_id + RLS policies            │
│  - Organization + team_members tables           │
│  - Audit logging per organization               │
└─────────────────────────────────────────────────┘
```

## Implementation Checklist

- [ ] **A. Database Schema Updates** (Done in Phase 1.1)
  - [ ] Create organizations table
  - [ ] Create team_members table
  - [ ] Add org_id to all user-scoped tables
  - [ ] Create audit_log table

- [ ] **B. Row Level Security** (Done in Phase 1.2)
  - [ ] Create RLS policies for organizations
  - [ ] Create RLS policies for all tables (agents, logs, etc)
  - [ ] Test tenant isolation

- [ ] **C. TypeScript Types** (Done in Phase 1.3)
  - [ ] Organization type definitions
  - [ ] Team member types
  - [ ] Multi-tenant context type

- [ ] **D. Application Integration** (Done in Phase 1.4)
  - [ ] Middleware - inject tenant context
  - [ ] Auth hooks - useTeam(), useOrganization()
  - [ ] Database client - add org_id to queries

- [ ] **E. Testing & Verification** (Done in Phase 1.5)
  - [ ] Test RLS isolation (User A cannot see User B's data)
  - [ ] Test team permissions
  - [ ] Test API endpoints with multi-org

---

## Phase 1.1: Database Schema

### Step 1: Organizations Table

```sql
-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast slug lookups
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
```

### Step 2: Team Members Table

```sql
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id) -- One role per user per org
);

CREATE INDEX idx_team_members_org ON public.team_members(org_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);
```

### Step 3: Add org_id to Existing Tables

```sql
-- agents table
ALTER TABLE public.agents 
ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_agents_org ON public.agents(org_id);

-- logs table (agent execution logs)
ALTER TABLE public.agent_logs
ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_agent_logs_org ON public.agent_logs(org_id);

-- Repeat for: ai_teams, agent_versions, ai_agency_divisions, etc.
```

### Step 4: Audit Log Table

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changes JSONB, -- Changed fields summary
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON public.audit_log(org_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
```

---

## Phase 1.2: Row Level Security Policies

### Step 1: Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- (Repeat for all user-scoped tables)
```

### Step 2: Create Helper Function

```sql
-- Get current organization ID from JWT
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
  SELECT (auth.jwt()->>'org_id')::UUID
$$ LANGUAGE SQL STABLE;

-- Check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE team_members.org_id = is_team_member.org_id
      AND user_id = auth.uid()
  )
$$ LANGUAGE SQL STABLE;

-- Check user role in org
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.team_members
  WHERE team_members.org_id = get_user_role.org_id
    AND user_id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

### Step 3: Create RLS Policies

```sql
-- ORGANIZATIONS TABLE
-- Only team members can see organization
CREATE POLICY org_select_policy ON public.organizations
  FOR SELECT
  USING (
    is_team_member(id)
  );

-- Only creators/admins can update
CREATE POLICY org_update_policy ON public.organizations
  FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR get_user_role(id) = 'admin'
  );

-- TEAM_MEMBERS TABLE
-- Only see team members in your org
CREATE POLICY team_select_policy ON public.team_members
  FOR SELECT
  USING (
    is_team_member(org_id)
  );

-- AGENTS TABLE
-- Only see agents in your org
CREATE POLICY agents_select_policy ON public.agents
  FOR SELECT
  USING (
    org_id = get_current_org_id()
  );

-- Only members of org can create agents
CREATE POLICY agents_insert_policy ON public.agents
  FOR INSERT
  WITH CHECK (
    org_id = get_current_org_id()
    AND is_team_member(org_id)
  );

-- AGENT_LOGS TABLE (same pattern)
CREATE POLICY agent_logs_select_policy ON public.agent_logs
  FOR SELECT
  USING (
    org_id = get_current_org_id()
  );

-- AUDIT_LOG TABLE (same pattern)
CREATE POLICY audit_log_select_policy ON public.audit_log
  FOR SELECT
  USING (
    org_id = get_current_org_id()
  );
```

---

## Phase 1.3: TypeScript Types

### File: `packages/core/src/types/tenant.ts`

```typescript
import { Database } from '@saas-factory/db';

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];

export type UserRole = 'owner' | 'admin' | 'member';

export interface TenantContext {
  org_id: string; // UUID
  user_id: string; // UUID
  org_slug: string;
  org_name: string;
  user_role: UserRole;
}

export interface MultiTenantUser {
  id: string; // user UUID
  email: string;
  organizations: Organization[];
  current_org_id: string; // Selected org
}

export type TenantPermission = 
  | 'org:create_team_member'
  | 'org:delete_team_member'
  | 'org:update_settings'
  | 'agent:create'
  | 'agent:delete'
  | 'agent:execute'
  | 'agent:view_logs';

export const ROLE_PERMISSIONS: Record<UserRole, TenantPermission[]> = {
  owner: [
    'org:create_team_member',
    'org:delete_team_member',
    'org:update_settings',
    'agent:create',
    'agent:delete',
    'agent:execute',
    'agent:view_logs',
  ],
  admin: [
    'agent:create',
    'agent:delete',
    'agent:execute',
    'agent:view_logs',
  ],
  member: [
    'agent:execute',
    'agent:view_logs',
  ],
};
```

### File: `packages/core/src/context/tenant-context.tsx`

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { TenantContext } from '../types/tenant';

const TenantContextProvider = createContext<TenantContext | null>(null);

export function TenantProvider({
  value,
  children,
}: {
  value: TenantContext;
  children: ReactNode;
}) {
  return (
    <TenantContextProvider.Provider value={value}>
      {children}
    </TenantContextProvider.Provider>
  );
}

export function useTenant(): TenantContext {
  const context = useContext(TenantContextProvider);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

export function useOrgId(): string {
  const { org_id } = useTenant();
  return org_id;
}

export function useUserRole(): string {
  const { user_role } = useTenant();
  return user_role;
}
```

---

## Phase 1.4: Application Integration

### File: `apps/factory-dashboard/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Decode JWT to extract org_id
    const decoded = jwtDecode<{ org_id: string }>(token);
    
    if (!decoded.org_id) {
      return NextResponse.redirect(new URL('/select-org', request.url));
    }

    // Continue with org_id in headers for downstream use
    const response = NextResponse.next();
    response.headers.set('x-org-id', decoded.org_id);
    
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### File: `packages/core/src/hooks/useTeam.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@saas-factory/db';
import { useTenant } from '../context/tenant-context';
import { Organization, TeamMember } from '../types/tenant';

export function useOrganization() {
  const { org_id } = useTenant();

  return useQuery({
    queryKey: ['organization', org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', org_id)
        .single();

      if (error) throw error;
      return data as Organization;
    },
  });
}

export function useTeamMembers() {
  const { org_id } = useTenant();

  return useQuery({
    queryKey: ['team_members', org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, user:auth.users(email)')
        .eq('org_id', org_id);

      if (error) throw error;
      return data as (TeamMember & { user: { email: string } })[];
    },
  });
}

export function useCanAccess(permission: string): boolean {
  const { user_role } = useTenant();
  const { ROLE_PERMISSIONS } = await import('../types/tenant');
  
  return ROLE_PERMISSIONS[user_role]?.includes(permission as any) ?? false;
}
```

---

## Phase 1.5: Testing & Verification

### File: `packages/core/src/__tests__/multi-tenancy.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Multi-Tenancy RLS', () => {
  let client1: ReturnType<typeof createClient>;
  let client2: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Create two clients with different auth tokens
    client1 = createClient(URL, KEY, {
      auth: { persistSession: false }
    });
    client2 = createClient(URL, KEY, {
      auth: { persistSession: false }
    });

    // Auth as user 1, org 1
    await client1.auth.signInWithPassword({
      email: 'user1@test.com',
      password: 'test123'
    });

    // Auth as user 2, org 2
    await client2.auth.signInWithPassword({
      email: 'user2@test.com',
      password: 'test123'
    });
  });

  it('User 1 cannot see User 2 agents', async () => {
    // Create agent in org 2
    await client2.from('agents').insert({
      org_id: 'org-2-id',
      name: 'Secret Agent',
    });

    // Try to access as user 1 (different org)
    const { data, error } = await client1
      .from('agents')
      .select('*')
      .eq('org_id', 'org-2-id');

    // RLS should prevent access
    expect(error?.code).toBe('PGRST116'); // Row level security
    expect(data).toEqual([]);
  });

  it('User 1 can only see own org agents', async () => {
    const { data } = await client1
      .from('agents')
      .select('*');

    expect(data?.length).toBeGreaterThan(0);
    data?.forEach(agent => {
      expect(agent.org_id).toBe('org-1-id');
    });
  });
});
```

---

## Deployment Checklist

### Development Environment
- [ ] Run migrations locally
- [ ] Test RLS policies with sample data
- [ ] Verify isolation with two test users

### Staging Environment
- [ ] Apply migrations to staging DB
- [ ] Run full test suite
- [ ] Manual QA with beta users

### Production
- [ ] Backup production database
- [ ] Apply migrations (with downtime window)
- [ ] Monitor logs for errors
- [ ] Rollback plan ready

---

## Success Criteria

✅ **Phase 1 Complete When:**
1. All database tables have `org_id` column
2. RLS policies enabled and tested
3. Users cannot see other organization's data
4. TypeScript types defined
5. TenantProvider wrapping app
6. useTeam() hooks working
7. Unit tests passing
8. Zero security vulnerabilities found

---

## Timeline

- **Day 1**: Database schema updates
- **Day 2**: RLS policies + helper functions
- **Day 3**: TypeScript types + context
- **Day 4**: Middleware + API integration
- **Day 5**: Testing + documentation

**Total: 1 week (40 hours)**

---

## Files to Create/Update

```
packages/core/src/
├── types/
│   └── tenant.ts (NEW)
├── context/
│   └── tenant-context.tsx (NEW)
├── hooks/
│   └── useTeam.ts (NEW)
└── __tests__/
    └── multi-tenancy.test.ts (NEW)

packages/db/src/
├── migrations/
│   ├── 001_create_organizations.sql (NEW)
│   ├── 002_create_team_members.sql (NEW)
│   ├── 003_add_org_id_to_tables.sql (NEW)
│   ├── 004_create_audit_log.sql (NEW)
│   └── 005_create_rls_policies.sql (NEW)

apps/factory-dashboard/
├── middleware.ts (UPDATE)
└── app/layout.tsx (UPDATE: wrap with TenantProvider)

PHASE_1_ARCHITECTURE.md (NEW)
PHASE_1_MIGRATION_GUIDE.md (NEW)
```

---

## Next Phase (Phase 2)

Once multi-tenancy foundation is complete:
- Real-time agent status updates
- Stripe billing per organization
- Team invitation system
- Organization settings UI
