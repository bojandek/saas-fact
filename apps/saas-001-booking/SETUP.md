# 🚀 SaaS 001 - Setup Guide

## Prerequisites

- Node.js 18+ και pnpm
- Supabase account
- Stripe account
- Resend account

---

## 1️⃣ Environment Setup

### Copy environment variables
```bash
cp .env.example .env.local
```

### Get your credentials

#### Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get `Project URL` and `Anon Key` from Settings → API
4. Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

#### Stripe
1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Get Publishable Key (starts with `pk_`) and Secret Key (starts with `sk_`)
3. Get Webhook Secret for localhost testing
4. Add to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Resend (Email)
1. Go to [resend.com](https://resend.com)
2. Create API key
3. Add to `.env.local`:
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 2️⃣ Database Setup

### Create Supabase tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  tenant_id UUID NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing')),
  plan_name TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
```

---

## 3️⃣ Stripe Setup

### Create prices for subscriptions

In Stripe Dashboard:

1. Go to Products → Create Product
   - Name: "Pro Plan"
   - Price: $29/month
   - Price ID: `price_monthly_pro`

2. Create another product
   - Name: "Enterprise Plan"
   - Price: $299/month
   - Price ID: `price_monthly_enterprise`

### Setup webhook

1. Go to Webhooks → Add endpoint
2. URL: `http://localhost:3000/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret and add to `.env.local`

---

## 4️⃣ Local Development

### Install dependencies
```bash
pnpm install
```

### Start development server
```bash
pnpm dev
```

App will be available at: http://localhost:3000

### Run tests
```bash
pnpm test
```

### Format code
```bash
pnpm format
```

---

## 5️⃣ Testing the Flow

### 1. **Sign Up**
- Go to http://localhost:3000
- Click "Get Started"
- Register with email/password
- A new **Tenant** is created automatically

### 2. **Login**
- Go to http://localhost:3000/auth/login
- Use registered credentials
- Redirected to `/dashboard`

### 3. **Subscribe**
- Click "Billing" in navbar
- Select "Pro" or "Enterprise"
- Click "Upgrade" button
- Redirected to Stripe Checkout
- Use test card: `4242 4242 4242 4242`
- Complete checkout
- Webhook processes subscription
- Database updated automatically

### 4. **Check Subscription Status**
- Return to Billing page
- Should show "Pro Plan" with status
- Shows current period end date

---

## 6️⃣ Local Stripe Webhook Testing

To test webhooks locally:

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 📝 Project Structure

```
app/
├── (auth)/              # Public auth routes
│   ├── login/
│   ├── register/
│   └── layout.tsx
├── (dashboard)/         # Protected routes
│   ├── page.tsx
│   └── layout.tsx
├── api/
│   ├── payments/
│   │   └── checkout/
│   └── webhooks/
│       └── stripe/
├── billing/
├── settings/
├── layout.tsx           # Root layout with AuthProvider
└── page.tsx             # Home page
```

---

## 🔑 Key Features Implemented

✅ **Authentication**
- Supabase Auth with email/password
- Auto-create tenant on signup
- Session management

✅ **Multi-Tenant**
- Tenant created per account
- Tenant_id in all queries
- Subscription tied to tenant

✅ **Payments**
- Stripe checkout integration
- Subscription management
- Webhook-based syncing to database

✅ **Emails**
- Resend integration
- Welcome email on signup
- Password reset email

✅ **Dashboard**
- Protected routes with middleware
- User account info
- Billing management

---

## 🆘 Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Make sure `.env.local` exists at root of app
- Restart dev server after adding variables

### "Stripe API key is invalid"
- Check you're using test keys (pk_test_, sk_test_)
- Verify keys are correct from Dashboard

### "Webhook not hitting my endpoint"
- Make sure `stripe listen` is running
- Check webhook URL is `http://localhost:3000/api/webhooks/stripe`
- Look at Stripe Dashboard → Webhooks → Events for logs

### "Login not working"
- Check Supabase project is active
- Verify ANON key has login permissions
- Check browser console for errors

---

## 📚 Next Steps

1. **Add more fields** to user signup (phone, address, etc)
2. **Customize email templates** in `blocks/emails/src/api/`
3. **Add booking logic** to `/dashboard/booking`
4. **Create admin panel** for managing bookings
5. **Setup CI/CD** with GithubActions (already configured)
6. **Deploy to production** (Coolify configured)

---

## 🚀 Deploy to Production

See [../docs/runbooks/launch-checklist.md](../docs/runbooks/launch-checklist.md)

---

**Questions?** Check the main docs at [../docs/](../docs/) 📖
