# 🚀 FINAL DEPLOYMENT GUIDE - Step by Step

**Status:** ✅ Code pushed to GitHub main branch  
**GitHub Actions:** ⚡ Automatically triggered  
**Next Step:** Complete production setup and deploy

---

## 📊 Current Status

✅ **Code Commit:** 82 files modified/created  
✅ **GitHub Push:** Successful to `main` branch  
✅ **GitHub Actions:** Triggered (building now)  
⏳ **Coolify Deployment:** Waiting for webhook configuration

---

## ⚙️ What Happens Automatically Now

### GitHub Actions Pipeline (Running now):
1. **test.yml** - Runs tests (pnpm test)
2. **build.yml** - Builds application (pnpm build)
3. **deploy.yml** - Sends webhook to Coolify

You can monitor progress at:
```
https://github.com/bojandek/saas-fact/actions
```

---

## 🛫 PRODUCTION DEPLOYMENT - 5 Easy Steps

### **STEP 1: Prepare Supabase Production** (10 min)

Go to [supabase.com](https://supabase.com)

```bash
1. Create new project
   ├─ Name: "SaaS 001 Production"
   ├─ Region: Close to your users
   └─ Password: Strong unique password

2. Wait 2-3 minutes for initialization

3. Get credentials
   └─ Settings → API
      ├─ NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
      └─ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

4. Create database tables (copy-paste SQL)
   └─ SQL Editor → Paste from SETUP.md → Run
      ├─ CREATE TABLE users
      ├─ CREATE TABLE tenants
      ├─ CREATE TABLE subscriptions

5. Configure Authentication
   └─ Authentication → Providers → Email/Password → Enabled

6. Add your domain
   └─ Authentication → Email Templates → Configure SMTP
```

**Save these values:**
```
NEXT_PUBLIC_SUPABASE_URL = ?
NEXT_PUBLIC_SUPABASE_ANON_KEY = ?
```

---

### **STEP 2: Prepare Stripe Production** (15 min)

Go to [stripe.com/dashboard](https://stripe.com/dashboard)

```bash
1. Activate Live Mode
   ├─ If not already activated
   └─ Developers → Get Live API Keys

2. Get production keys
   ├─ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xyz...
   └─ STRIPE_SECRET_KEY=sk_live_xyz...

3. Create subscription products
   ├─ Products → New product
   │  ├─ Name: "Pro Plan"
   │  ├─ Price: $29.00 USD
   │  ├─ Billing: Monthly
   │  └─ Price ID: price_monthly_pro
   │
   └─ Next product
      ├─ Name: "Enterprise Plan"
      ├─ Price: $299.00 USD
      ├─ Billing: Monthly
      └─ Price ID: price_monthly_enterprise

4. Create webhook
   ├─ Developers → Webhooks → Add endpoint
   ├─ URL: https://yourdomain.com/api/webhooks/stripe
   ├─ Events:
   │  ├─ customer.subscription.created
   │  ├─ customer.subscription.updated
   │  └─ customer.subscription.deleted
   └─ STRIPE_WEBHOOK_SECRET=whsec_xyz...
```

**Save these values:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_?
STRIPE_SECRET_KEY = sk_live_?
STRIPE_WEBHOOK_SECRET = whsec_?
```

---

### **STEP 3: Prepare Resend Email Service** (5 min)

Go to [resend.com](https://resend.com)

```bash
1. Create API key
   ├─ API Keys → Create key
   ├─ Name: "Production App"
   └─ RESEND_API_KEY=re_xyz...

2. Verify domain
   ├─ Domains → Add domain
   ├─ Domain: noreply@yourdomain.com
   ├─ Add DNS records (Resend will show)
   └─ Set as default sender
```

**Save these values:**
```
RESEND_API_KEY = re_?
RESEND_FROM_EMAIL = noreply@yourdomain.com
```

---

### **STEP 4: Setup Coolify Deployment** (15 min)

Go to your **Coolify server** at your IP/domain

```bash
1. Create application
   ├─ Applications → Create
   ├─ Source: GitHub (saas-fact repo)
   ├─ App: saas-001-booking
   └─ Build: Dockerfile (already configured)

2. Add environment variables
   ├─ Go to Application → Environment
   ├─ Add all values from STEPS 1-3:
   │
   ├─ NODE_ENV=production
   │
   ├─ NEXT_PUBLIC_SUPABASE_URL=(from Step 1)
   ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY=(from Step 1)
   │
   ├─ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(from Step 2)
   ├─ STRIPE_SECRET_KEY=(from Step 2)
   ├─ STRIPE_WEBHOOK_SECRET=(from Step 2)
   │
   ├─ RESEND_API_KEY=(from Step 3)
   ├─ RESEND_FROM_EMAIL=(from Step 3)
   │
   └─ NEXT_PUBLIC_APP_URL=https://yourdomain.com

3. Configure custom domain
   ├─ Domains → Add domain
   ├─ Domain: yourdomain.com
   ├─ Coolify will provision SSL
   └─ Get CNAME record

4. Setup GitHub auto-deploy webhook
   ├─ Application → Webhooks → Copy URL
   ├─ Go to GitHub → Repository Settings
   ├─ Webhooks → Add webhook
   ├─ Payload URL: (Coolify webhook URL)
   ├─ Events: Push events only
   ├─ Active: ✓
```

---

### **STEP 5: Configure DNS & Deploy** (10 min)

Go to your **domain registrar** (GoDaddy, Namecheap, etc.)

```bash
1. Add CNAME record
   ├─ Name: @ (or your subdomain)
   ├─ Value: (from Coolify)
   ├─ TTL: 3600
   └─ Save

2. Wait 5-30 minutes for DNS propagation

3. Test DNS
   ├─ Open terminal
   ├─ nslookup yourdomain.com
   ├─ Should show Coolify IP
   └─ Or test with: curl https://yourdomain.com

4. Verify deployment
   ├─ Visit https://yourdomain.com
   ├─ Should see your app homepage
   ├─ SSL certificate working (green lock)
   └─ Database connected
```

---

## ✅ TEST PRODUCTION DEPLOYMENT

After app is live at https://yourdomain.com:

### Test 1: Sign Up Flow
```
1. Visit https://yourdomain.com
2. Click "Get Started"
3. Register: test@example.com / password
4. Check email for verification
5. Click verification link
6. Should be logged in → See dashboard
7. Check Supabase → users table should have new user
8. Check Supabase → tenants table should have new tenant
```

### Test 2: Subscription Flow
```
1. From dashboard, click "Billing"
2. See pricing tiers
3. Click "Upgrade to Pro"
4. Redirected to Stripe checkout
5. Use real card or test card (if still in test mode)
   ├─ Card: 4242 4242 4242 4242
   ├─ Exp: 12/25
   ├─ CVC: 123
6. Complete payment
7. Redirected to https://yourdomain.com/billing?success=true
8. Should show "Pro Plan - active"
9. Check Supabase → subscriptions table
   └─ Should have new subscription record with status='active'
10. Check Stripe Dashboard
    └─ Should show customer and subscription
11. Check Stripe Webhooks → Events
    └─ customer.subscription.created should show "success"
```

### Test 3: Email Delivery
```
1. Sign up with new email
2. Check inbox (and spam folder)
3. Should receive welcome email from Resend
4. Email should show verification link
5. Click link to verify and login
```

### Test 4: Protected Routes
```
1. Logout from dashboard
2. Try to visit https://yourdomain.com/dashboard
3. Should redirect to login
4. Login again
5. Should see dashboard
```

---

## 🎉 DEPLOYMENT SUCCESSFUL!

If all tests pass:

✅ Production app deployed  
✅ Database connected  
✅ Payments working  
✅ Emails sending  
✅ Users can sign up  
✅ Users can subscribe  
✅ Webhooks syncing  

---

## 📞 TROUBLESHOOTING

### "Website shows 502 Bad Gateway"
```
1. Check Coolify logs (Application → Logs)
2. Verify environment variables are set
3. Check database connection
4. Restart application in Coolify
5. Check GitHub Actions build status
```

### "DNS not resolving"
```
1. Check CNAME record added to domain
2. Use: nslookup yourdomain.com
3. Wait up to 30 minutes for propagation
4. Check TTL is not too long
```

### "Stripe payment not processing webhook"
```
1. Verify webhook secret is LIVE (whsec_), not test
2. Check webhook URL is exactly: https://yourdomain.com/api/webhooks/stripe
3. Test webhook from Stripe → Webhooks → Events → Resend
4. Check Coolify logs for webhook errors
5. Verify STRIPE_WEBHOOK_SECRET in Coolify matches
```

### "Email not sending"
```
1. Verify domain DNS records in Resend
2. Check RESEND_FROM_EMAIL matches verified domain
3. Check API key is correct
4. Look for bounces in Resend dashboard
5. Check spam folder
```

### "Supabase connection failing"
```
1. Verify URL and ANON KEY are correct (from Step 1)
2. Check Supabase project is "Active"
3. Verify tables exist (users, tenants, subscriptions)
4. Check RLS policies allow access
5. Look at Supabase logs
```

---

## 🔍 MONITORING

After deployment, monitor these:

### Daily Checks
- [ ] Visit https://yourdomain.com - page loads
- [ ] Try sign up - account created
- [ ] Try login - session works
- [ ] Check new emails - Resend deliver

### Weekly Checks
- [ ] New user signups working
- [ ] Payments processing
- [ ] Webhooks firing (Stripe dashboard)
- [ ] Database syncing correctly
- [ ] No error logs

### Monthly Tasks
- [ ] Review Stripe transactions
- [ ] Check database size
- [ ] Rotate API keys (optional)
- [ ] Review security logs
- [ ] Plan scaling if needed

---

## 📚 Documentation Reference

- **SETUP.md** - Local development setup
- **PRODUCTION_DEPLOYMENT.md** - Detailed production guide
- **DEPLOYMENT_CHECKLIST.md** - Full pre-deployment checklist
- **COMPLETION_SUMMARY.md** - What was built
- **production.env.example** - All environment variables

---

## ✨ SUMMARY

**What just happened:**
1. ✅ Code pushed to GitHub
2. ✅ GitHub Actions building & testing  
3. ⏳ Waiting for Coolify setup
4. ⏳ Waiting for Supabase/Stripe/Resend keys
5. ⏳ Waiting for DNS configuration

**What you need to do:**
1. **STEPS 1-4** above (~45 minutes total)
2. **Configure DNS** (~5 min + wait)
3. **Test the app** (~10 min)
4. 🎉 **Live!**

**Total time: ~1 hour to production**

---

**Questions?** Check the docs or check Coolify logs for specific errors.

**Ready? Let's go! 🚀**
