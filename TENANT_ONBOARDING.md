# Tenant Onboarding Process

## Overview

This document describes the complete flow for onboarding a new tenant (customer) in SaaS Factory, from registration to first use.

## Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Registration                             │
│  1. User visits /auth/register                                  │
│  2. Fills in: name, email, password                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Supabase Auth Sign Up                               │
│  1. Create auth user (email + password)                         │
│  2. Return auth.user.id (UUID)                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Create Tenant (Organization)                        │
│  1. Generate unique subdomain                                   │
│  2. Insert into tenants table                                   │
│  3. Return tenant.id                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Create User Record                                  │
│  1. Link auth.user.id to tenant.id                              │
│  2. Set role = 'owner'                                          │
│  3. Insert into users table                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Create Initial Subscription                         │
│  1. Create free trial subscription                              │
│  2. Set 14-day trial period                                     │
│  3. Link to tenant.id                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Email Verification                                  │
│  1. Send verification email via Resend                          │
│  2. User clicks verification link                               │
│  3. Redirect to /auth/verify-email                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Redirect to Dashboard                               │
│  1. User is now authenticated                                   │
│  2. Access /dashboard with tenant_id in JWT                     │
│  3. See their workspace                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Registration Form (`blocks/auth/src/components/RegisterForm.tsx`)

```typescript
<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('name')} placeholder="John Doe" />
  <input {...register('email')} placeholder="you@example.com" />
  <input {...register('password')} type="password" />
  <input {...register('passwordConfirm')} type="password" />
  <button type="submit">Sign Up</button>
</form>
```

**Validation**:
- Name: min 2 characters
- Email: valid email format
- Password: min 8 characters
- Passwords must match

### 2. Sign Up Logic (`blocks/auth/src/hooks/useAuth.ts`)

```typescript
const signUp = async (email: string, password: string, name: string) => {
  // Step 1: Create auth user
  const { data: authData } = await supabase.auth.signUp({
    email,
    password,
  })

  // Step 2: Create tenant
  const { data: tenantData } = await supabase
    .from('tenants')
    .insert({
      name: `${name}'s Workspace`,
      subdomain: generateUniqueSubdomain(email),
      plan: 'free',
    })
    .select()
    .single()

  // Step 3: Create user record
  await supabase.from('users').insert({
    id: authData.user.id,
    email,
    name,
    tenant_id: tenantData.id,
    role: 'owner',
  })

  // Step 4: Create subscription
  await supabase.from('subscriptions').insert({
    tenant_id: tenantData.id,
    status: 'trialing',
    plan_name: 'Free Trial',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // Step 5: Redirect to email verification
  router.push('/auth/verify-email')
}
```

### 3. Database Records Created

After successful signup, the following records are created:

#### `auth.users` (Supabase Auth)
```json
{
  "id": "uuid-123",
  "email": "user@example.com",
  "email_confirmed_at": null,
  "created_at": "2024-03-17T10:00:00Z"
}
```

#### `public.tenants`
```json
{
  "id": "tenant-uuid-456",
  "name": "John Doe's Workspace",
  "subdomain": "johndoe-abc123",
  "plan": "free",
  "stripe_customer_id": null,
  "created_at": "2024-03-17T10:00:00Z"
}
```

#### `public.users`
```json
{
  "id": "uuid-123",
  "email": "user@example.com",
  "name": "John Doe",
  "tenant_id": "tenant-uuid-456",
  "role": "owner",
  "created_at": "2024-03-17T10:00:00Z"
}
```

#### `public.subscriptions`
```json
{
  "id": "sub-uuid-789",
  "tenant_id": "tenant-uuid-456",
  "stripe_subscription_id": null,
  "status": "trialing",
  "plan_name": "Free Trial",
  "current_period_start": "2024-03-17T10:00:00Z",
  "current_period_end": "2024-03-31T10:00:00Z",
  "created_at": "2024-03-17T10:00:00Z"
}
```

## JWT Token Structure

After login, the user receives a JWT token containing:

```json
{
  "sub": "uuid-123",
  "email": "user@example.com",
  "tenant_id": "tenant-uuid-456",
  "role": "owner",
  "aud": "authenticated",
  "iat": 1710753600,
  "exp": 1710840000
}
```

This JWT is used for:
- **Authentication**: Proving the user's identity
- **RLS Enforcement**: Filtering database queries by `tenant_id`
- **Authorization**: Checking user's `role` for admin operations

## Error Handling

### Scenario: Tenant Creation Fails

```typescript
if (tenantError || !tenantData) {
  // Cleanup: Delete the auth user
  await supabase.auth.admin.deleteUser(authData.user.id)
  throw new Error('Failed to create workspace')
}
```

### Scenario: User Record Creation Fails

```typescript
if (userError) {
  // Cleanup: Delete the tenant
  await supabase.from('tenants').delete().eq('id', tenantData.id)
  throw new Error('Failed to complete profile setup')
}
```

## Email Verification

After signup, the user receives a verification email:

```
Subject: Verify your email for SaaS Factory

Hi John Doe,

Please verify your email by clicking the link below:
https://yourdomain.com/auth/callback?token=...

This link expires in 24 hours.

Best regards,
SaaS Factory Team
```

**Flow**:
1. User clicks link
2. Supabase verifies the token
3. Sets `email_confirmed_at` in auth.users
4. Redirects to `/auth/verify-email` → `/dashboard`

## Inviting Team Members

Once a tenant is created, the owner can invite team members:

```typescript
// Owner invites a team member
const inviteUser = async (email: string, role: 'user' | 'admin') => {
  // 1. Create user record (no auth account yet)
  const { data: newUser } = await supabase
    .from('users')
    .insert({
      email,
      name: email.split('@')[0],
      tenant_id: currentTenantId,
      role,
    })
    .select()
    .single()

  // 2. Send invitation email
  await resend.emails.send({
    from: 'team@saas-factory.com',
    to: email,
    subject: 'You\'ve been invited to join a workspace',
    html: `
      <p>You've been invited to join ${tenantName}</p>
      <a href="https://yourdomain.com/auth/join?token=${inviteToken}">
        Accept Invitation
      </a>
    `,
  })
}
```

## Trial Period Management

After signup, users get a 14-day free trial:

```typescript
// Check if trial is active
const isTrialActive = (subscription: Subscription) => {
  const now = new Date()
  const endDate = new Date(subscription.current_period_end)
  return subscription.status === 'trialing' && now < endDate
}

// Handle trial expiration
const handleTrialExpiration = async (tenantId: string) => {
  await supabase.from('subscriptions')
    .update({
      status: 'past_due',
      plan_name: 'Free (Trial Expired)',
    })
    .eq('tenant_id', tenantId)

  // Send email: "Your trial has expired, please upgrade"
  await sendTrialExpiredEmail(tenantId)
}
```

## Monitoring & Analytics

Track onboarding metrics:

```typescript
// Log signup event
analytics.track('user_signup', {
  tenant_id: tenantData.id,
  email: email,
  plan: 'free',
  timestamp: new Date(),
})

// Log trial expiration
analytics.track('trial_expired', {
  tenant_id: tenantId,
  days_active: calculateDays(createdAt, now),
})

// Log first upgrade
analytics.track('first_upgrade', {
  tenant_id: tenantId,
  from_plan: 'free',
  to_plan: 'pro',
})
```

## Checklist for Deployment

- [ ] Email verification is configured in Supabase
- [ ] Resend API key is set in environment variables
- [ ] RLS policies are enabled on all tables
- [ ] JWT custom claims are configured (tenant_id, role)
- [ ] Subdomain generation is unique (no collisions)
- [ ] Error handling and cleanup logic is tested
- [ ] Trial period is set correctly (14 days)
- [ ] Welcome email is sent after signup
- [ ] Analytics tracking is implemented
- [ ] Monitoring alerts are set up

## Next Steps

1. **Implement Stripe Integration**: Upgrade from trial to paid plans
2. **Add Team Management**: Allow inviting team members
3. **Implement Onboarding Tour**: Guide new users through the app
4. **Add Usage Tracking**: Monitor feature usage during trial
5. **Implement Churn Prevention**: Send upgrade reminders before trial expires

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Multi-Tenant Architecture](./EXPERT_RECOMMENDATIONS.md)
- [RLS Setup Guide](./blocks/database/RLS_SETUP.md)
