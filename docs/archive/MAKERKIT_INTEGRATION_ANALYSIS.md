# Makerkit Integration Analysis for SaaS Factory

Analiza što se može primjeniti iz [Makerkit](https://github.com/makerkit/makerkit) u SaaS Factory OS.

## Makerkit Overview

Makerkit je **produkcijski-spreman Next.js + Supabase SaaS template** s:
- Next.js 14+ (App Router)
- TypeScript + strict mode
- Supabase (PostgreSQL + Auth + Realtime)
- Stripe payments
- Multi-tenancy (RLS)
- Email system (Resend)
- UI components (Shadcn-inspired)

## Što Se Preporučuje Primjeniti ✅

### 1. **Multi-Tenancy Architecture** (PRIORITET: 🔴 HIGH)

**Makerkit Pattern:**
```sql
-- Row Level Security (RLS)
CREATE POLICY organization_access ON documents
  USING (org_id = auth.jwt()->>'org_id');

-- Tenant context via JWT claims
SELECT auth.jwt()->>'org_id' as current_org_id;
```

**Primjena u SaaS Factory:**
- Dodaj org_id na sve tabele
- Implementiraj RLS policies
- Multi-org support u UI
- Tenant isolation za AI agents

**File:** 
- Create [`packages/db/src/multi-tenancy.ts`](packages/db/src/multi-tenancy.ts)
- Update [`apps/saas-001-booking/app/middleware.ts`](apps/saas-001-booking/app/middleware.ts)

---

### 2. **Authentication Flows** (PRIORITET: 🟠 MEDIUM)

**Makerkit Features:**
- Supabase Auth (Email/Password, OAuth, Magic Links)
- Session management middleware
- Protected routes
- Role-based access control (RBAC)

**Primjena:**
```typescript
// Reusable auth context
const { user, session } = useAuth();
const { canAccess } = useAuthorization();

if (!canAccess('create:agents')) {
  return <AccessDenied />;
}
```

**File:**
- Create [`packages/core/src/auth/context.tsx`](packages/core/src/auth/context.tsx)
- Create [`packages/core/src/auth/hooks.ts`](packages/core/src/auth/hooks.ts)

---

### 3. **Stripe Payment Integration** (PRIORITET: 🟠 MEDIUM)

**Makerkit Pattern:**
```typescript
// Customer creation
const customer = await stripe.customers.create({ email, metadata: { org_id } });

// Subscription management
const subscription = await createSubscription(customerId, priceId);

// Webhook handling
router.post('/webhook', async (req) => {
  const event = stripe.webhooks.constructEvent(...);
  // Handle: checkout.session.completed, customer.subscription.updated, etc.
});
```

**Primjena:**
- Tier-based pricing za AI agents
- Usage-based billing (per agent execution)
- Subscription webhooks integration
- Invoice management

**File:**
- Update [`blocks/payments/src/lib/stripe-client.ts`](blocks/payments/src/lib/stripe-client.ts)
- Create [`blocks/payments/src/webhooks/stripe.ts`](blocks/payments/src/webhooks/stripe.ts)

---

### 4. **Email System** (PRIORITET: 🟢 LOW)

**Makerkit Pattern:**
```typescript
// Using Resend
import { Resend } from 'resend';

await resend.emails.send({
  from: 'noreply@saas-factory.dev',
  to: user.email,
  subject: 'Your AI Agent Created',
  html: EmailTemplate({ agentName, agentId })
});
```

**Primjena:**
- Agent creation notifications
- Team invitations
- Weekly digest emails
- Alert emails (agent errors)

**Already Implemented:** [`blocks/emails/src/templates/`](blocks/emails/src/templates/)

---

### 5. **Real-time Capabilities** (PRIORITET: 🟠 MEDIUM)

**Makerkit Pattern:**
```typescript
// Supabase Realtime
const subscription = supabase
  .channel('agents')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'agents' },
    (payload) => {
      // Real-time agent status updates
      setAgentStatus(payload.new.status);
    }
  )
  .subscribe();
```

**Primjena:**
- Real-time agent status updates
- Live log streaming
- Team member activity
- Notification system

**File:**
- Create [`factory-brain/src/realtime/agent-broadcaster.ts`](factory-brain/src/realtime/agent-broadcaster.ts)

---

### 6. **Dashboard Layout** (PRIORITET: 🟢 LOW)

**Makerkit Pattern:**
```
apps/app/
├── dashboard/
│   ├── layout.tsx (sidebar + nav)
│   ├── page.tsx (overview)
│   ├── agents/
│   │   ├── page.tsx (list)
│   │   └── [id]/page.tsx (detail)
│   └── settings/
│       ├── page.tsx
│       ├── billing/page.tsx
│       └── team/page.tsx
```

**Already Implemented:** 
- [`factory-dashboard/app/`](factory-dashboard/app/)
- [`apps/saas-001-booking/app/`](apps/saas-001-booking/app/)

---

### 7. **Database Patterns** (PRIORITET: 🟠 MEDIUM)

**Makerkit Best Practices:**
```sql
-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team members
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member'
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  org_id UUID,
  user_id UUID,
  action TEXT,
  table_name TEXT,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Primjena:**
- Organization management
- Team/workspace concept
- Audit trails za agent changes
- Usage tracking

**File:**
- Update [`packages/db/src/types.ts`](packages/db/src/types.ts)

---

### 8. **Error Handling** (PRIORITET: 🟢 LOW)

**Makerkit Pattern:**
```typescript
// Consistent error responses
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// Middleware
export const withErrorHandling = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};
```

**Primjena:**
- Standardizirani error response format
- Error codes za client-side handling
- Error logging/sentry integration

---

### 9. **API Route Structure** (PRIORITET: 🟡 MEDIUM)

**Makerkit Pattern:**
```
apps/app/api/
├── auth/
│   ├── callback/route.ts
│   ├── logout/route.ts
│   └── refresh/route.ts
├── agents/
│   ├── route.ts (GET/POST)
│   └── [id]/route.ts (GET/PUT/DELETE)
└── _middleware.ts (auth + rate limiting)
```

**Primjena:**
- RESTful API za AI agents
- Standard pagination
- Rate limiting
- Request validation (Zod)

**Already Partially Implemented:** 
- [`apps/saas-001-booking/app/api/`](apps/saas-001-booking/app/api/)

---

### 10. **Middleware Pattern** (PRIORITET: 🟠 MEDIUM)

**Makerkit Pattern:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('sb-access-token');
  
  // Rate limiting
  const ip = request.ip;
  if (isRateLimited(ip)) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // Tenant context
  const response = NextResponse.next();
  response.headers.set('x-org-id', org_id);
  
  return response;
}
```

**Primjena:**
- Auth middleware za protected routes
- Rate limiting za API
- Tenant context injection
- Request logging

---

## Što NISU trebalo Primjeniti ❌

1. **UI Components** - SaaS Factory ima već Apple-designed system ✅
2. **Form Builder** - Kompleksno, za trenutnu fazu preskočiti
3. **Background Jobs** - Mahnja own job queue system
4. **Analytics** - Factory Brain handbook analytics
5. **Localization/i18n** - Engleski optimiziran za sada

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Multi-tenancy RLS setup
- [ ] Update database schema (org_id fields)
- [ ] Auth context + hooks

### Phase 2: Features (Week 2)
- [ ] Stripe webhooks
- [ ] Real-time agent broadcaster
- [ ] Dashboard organization switcher

### Phase 3: Polish (Week 3)
- [ ] Middleware + rate limiting
- [ ] Error handling standardization
- [ ] Audit logging

---

## Code Adoption Checklist

### Multi-Tenancy
- [ ] Add `org_id` UUID to all user-facing tables
- [ ] Create RLS policies
- [ ] Test tenant isolation

### Authentication
- [ ] Create auth hooks (useAuth, useAuthorization)
- [ ] Protect /dashboard routes
- [ ] Setup role-based access

### Payments
- [ ] Setup Stripe webhook handlers
- [ ] Create subscription management UI
- [ ] Add billing dashboard tab

### Real-time
- [ ] Supabase Realtime connection
- [ ] Agent status broadcaster
- [ ] Live log streaming

### API Structure
- [ ] Standardize error responses
- [ ] Add request validation (Zod)
- [ ] Implement pagination

### Middleware
- [ ] Rate limiting rules
- [ ] Tenant context injection
- [ ] Request logging

---

## Files Za Kreiranje

```
packages/core/src/
├── auth/
│   ├── context.tsx (useAuth, useTeam)
│   ├── hooks.ts (useAuthorization, useSession)
│   └── types.ts
└── middleware/
    ├── rate-limiter.ts
    ├── tenant-context.ts
    └── error-handler.ts

packages/db/src/
├── multi-tenancy.ts (RLS setup)
├── migrations/ (org_id fields)
└── seed/ (test organizations)

blocks/payments/src/
├── webhooks/stripe.ts
└── subscription-manager.ts

factory-brain/src/
├── realtime/
│   └── agent-broadcaster.ts
└── audit/ (Makerkit audit pattern)
```

---

## Estimation

| Task | Time | Difficulty |
|------|------|-----------|
| Multi-tenancy RLS | 4h | 🟠 Medium |
| Auth context | 3h | 🟢 Easy |
| Stripe webhooks | 6h | 🟠 Medium |
| Real-time setup | 5h | 🟠 Medium |
| Middleware | 3h | 🟢 Easy |
| Error standardization | 2h | 🟢 Easy |
| **Total** | **~23h** | **🟠 Medium** |

---

## Resources

- Makerkit GitHub: https://github.com/makerkit/makerkit
- Makerkit Docs: https://docs.makerkit.dev
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- Stripe Integration: https://stripe.com/docs/payments/checkout
- Next.js Middleware: https://nextjs.org/docs/advanced-features/middleware
