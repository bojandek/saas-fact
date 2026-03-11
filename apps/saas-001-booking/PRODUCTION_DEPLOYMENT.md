# 🚀 Production Deployment Guide

## Prerequisites

- Supabase production account (active)
- Stripe production account (verified)
- Resend production account (active)
- Coolify server accessible
- Custom domain configured

---

## Step 1️⃣: Setup Supabase Production

### Create Production Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Configure:
   - **Name:** SaaS 001 Production
   - **Region:** Choose closest to your users (e.g., eu-west-1)
   - **Password:** Generate strong password
4. Wait for project to initialize (~2 minutes)

### Get Production Credentials
1. Go to Settings → API
2. Copy:
   - `Project URL` → This is `NEXT_PUBLIC_SUPABASE_URL`
   - `Anon Public key` → This is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Service Role key` → Keep secure, for migrations only

### Create Database Tables
1. Go to SQL Editor
2. Run the setup SQL (from SETUP.md):
   ```sql
   -- Copy the CREATE TABLE statements
   CREATE TABLE users (...)
   CREATE TABLE tenants (...)
   CREATE TABLE subscriptions (...)
   ```
3. Verify tables created in "Table Editor"

### Enable Auth
1. Go to Authentication → Providers
2. Enable Email/Password provider
3. Go to Email Templates
4. Configure custom email templates if needed
5. Go to URL Configuration
6. Add your production URL (e.g., https://yourdomain.com)

---

## Step 2️⃣: Setup Stripe Production

### Activate Production Mode
1. Go to [stripe.com/dashboard](https://stripe.com/dashboard)
2. Click "Activate Production Mode" (if available)
3. Set your account to "Live" mode

### Get Production Keys
1. Go to Developers → API Keys
2. Copy "Live" keys (NOT test keys!):
   - **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - **Secret Key** → `STRIPE_SECRET_KEY` (starts with `sk_live_`)

### Create Production Products & Prices

#### Free Plan
- No Stripe product needed, uses default

#### Pro Plan ($29/month)
1. Go to Products → Create Product
2. Name: "Pro Plan"
3. Price: $29.00 USD
4. Recurring: Monthly, on…
5. Price ID: Copy this → Will be `STRIPE_PRICE_PRO`

#### Enterprise Plan ($299/month)
1. Go to Products → Create Product
2. Name: "Enterprise Plan"
3. Price: $299.00 USD
4. Recurring: Monthly
5. Price ID: Copy this → Will be `STRIPE_PRICE_ENTERPRISE`

### Setup Webhooks for Production
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select Events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add events"
6. Copy Webhook Secret → `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)

---

## Step 3️⃣: Setup Resend Email Service

### Create Production API Key
1. Go to [resend.com](https://resend.com)
2. Go to API Keys
3. Create New Key
4. Name: "Production App"
5. Copy key → `RESEND_API_KEY`

### Setup Sender Domain
1. Go to Domains
2. Add your domain (e.g., noreply@yourdomain.com)
3. Verify DNS records (follow Resend instructions)
4. Enable "Default Sender" for this domain
5. **IMPORTANT:** Use this email in `RESEND_FROM_EMAIL`

---

## Step 4️⃣: Configure Coolify

### Add Environment Variables
1. Go to your Coolify dashboard
2. Select application "saas-001-booking"
3. Go to Environment Tab
4. Add these variables:

```env
# Node Environment
NODE_ENV=production

# Supabase (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe (from Step 2)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xyz...
STRIPE_SECRET_KEY=sk_live_xyz...
STRIPE_WEBHOOK_SECRET=whsec_xyz...

# Resend (from Step 3)
RESEND_API_KEY=re_xyz...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Configure GitHub Webhook for Auto-Deploy
1. In Coolify, get the Webhook URL:
   - Application Settings → Webhooks → Copy URL
2. Go to GitHub:
   - Repository → Settings → Webhooks → Add webhook
   - Paste Coolify webhook URL
   - Events: Push events only
   - Active: ✓
3. Now every push to `main` branch triggers auto-deploy

---

## Step 5️⃣: Custom Domain Setup

### Add Domain in Coolify
1. Go to Application → Domains
2. Click "Add Domain"
3. Enter your domain: `yourdomain.com`
4. Let Coolify provision SSL (automatic)

### DNS Configuration
1. Get CNAME record from Coolify
2. Go to your domain registrar (GoDaddy, etc.)
3. Add CNAME record:
   - **Name:** `@` or leave blank (for apex domain)
   - **Value:** Provided by Coolify
4. Wait for DNS propagation (5-30 min)
5. Test: `curl https://yourdomain.com` should respond

---

## Step 6️⃣: Deploy!

### Push to Main Branch
```bash
# From project root
git add .
git commit -m "chore: production deployment setup"
git push origin main
```

### Monitor Deployment
1. Go to GitHub → Your Repo → Actions
2. Watch the deployment workflow
3. It should:
   - Run tests (test.yml)
   - Build application (build.yml)
   - Trigger Coolify webhook (deploy.yml)
4. Check Coolify dashboard for deployment status

### Verify Deployment
1. Visit `https://yourdomain.com`
2. Test sign up flow:
   - Register new account
   - Check email received
   - Verify in Supabase (users table)
   - Login and see dashboard
3. Test subscription:
   - Go to Billing
   - Click "Upgrade to Pro"
   - Use real Stripe card
   - Complete checkout
   - Verify webhook processed (check Supabase subscriptions table)
4. Check logs in Coolify for errors

---

## 🆘 Troubleshooting

### "Webhook secret is invalid"
- Make sure you copied the **Live** webhook secret, not test
- Check `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- Webhook must be exactly `https://yourdomain.com/api/webhooks/stripe`

### "Email not sending"
- Verify domain DNS records in Resend
- Check `RESEND_FROM_EMAIL` matches verified domain
- Check email templates in blocks/emails/src/api/

### "Stripe checkout stuck"
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is live key (starts `pk_live_`)
- Verify prices exist in Stripe dashboard
- Check logs in Coolify (Logs tab)

### "Database connection failed"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Supabase project is active
- Verify URL Configuration in Supabase includes your domain

### "Deployment not triggering"
- Check GitHub secret `COOLIFY_WEBHOOK` is set
- Go to Repo → Settings → Secrets → Add if missing
- Paste Coolify webhook URL

### "DNS not resolving"
- Check CNAME record was added correctly
- Use `nslookup yourdomain.com` to verify
- Wait up to 30 minutes for propagation
- Check with `dig` command for DNS propagation

---

## ✅ Post-Deployment Checklist

- [ ] Website loads at https://yourdomain.com
- [ ] SSL certificate working (green lock in browser)
- [ ] Register form works → Email received
- [ ] Login works → Redirects to dashboard
- [ ] Billing page loads
- [ ] Stripe checkout works with real card
- [ ] Webhook processes subscription
- [ ] Supabase records updated correctly
- [ ] Settings page working
- [ ] Sign out works
- [ ] CI/CD pipeline triggered on push
- [ ] Logs in Coolify show no errors

---

## 🔄 Continuous Deployment

### Every Push to `main`
1. GitHub Actions runs tests
2. If tests pass, builds Docker image
3. Triggers Coolify webhook
4. Coolify deploys new version
5. Zero downtime deployment

### Rolling Back
If something goes wrong:
```bash
git revert <commit-hash>
git push origin main
# This triggers re-deployment with previous version
```

---

## 📚 Additional Configuration

### Email Service (Resend)
- Welcome emails on signup: ✓ Configured
- Password reset emails: ✓ Configured
- Custom domain: Setup in Resend

### Database Backups
- Enable automatic backups in Supabase
- Go to Settings → Backups
- Set daily backup schedule

### Monitoring
- Setup error tracking (e.g., Sentry)
- Setup uptime monitoring
- Setup performance monitoring

### Security
- Enable Row Level Security (RLS) in Supabase
- Setup CORS properly
- Enable rate limiting on API endpoints

---

## 🎉 Done!

Your production app is now live!

Next steps:
1. Monitor application performance
2. Setup error tracking (optional)
3. Add more features as needed
4. Scale infrastructure if needed
5. Process real customer payments

**Welcome to production! 🚀**
