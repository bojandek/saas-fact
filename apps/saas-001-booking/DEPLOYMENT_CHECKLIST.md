# ✅ Production Deployment Checklist

**Before deploying to production, complete all items on this checklist.**

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing locally: `pnpm test`
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] No ESLint errors: `pnpm lint`
- [ ] All Git changes committed
- [ ] Feature branches merged to `main`
- [ ] No console.log/debug code left
- [ ] Environment variables documented

### Application Testing
- [ ] Sign up flow tested locally
- [ ] Login flow tested locally
- [ ] Protected routes redirect correctly
- [ ] Billing page loads pricing
- [ ] Settings page functional
- [ ] Sign out works
- [ ] Error pages display correctly
- [ ] Mobile responsive design tested

### Payment Testing (Stripe Test Keys)
- [ ] Stripe test checkout completes
- [ ] Webhook processes payment
- [ ] Database subscription record created
- [ ] Email notifications sent
- [ ] Order confirmation shows correct plan
- [ ] Cancel subscription works
- [ ] Webhook handles all event types

### Email Testing (Resend Test)
- [ ] Welcome email sends on signup
- [ ] Email HTML renders correctly
- [ ] Email links work
- [ ] Password reset email sends
- [ ] Email templates responsive on mobile

### Database Testing
- [ ] All tables created (users, tenants, subscriptions)
- [ ] RLS policies configured
- [ ] Queries return correct data
- [ ] Migrations documented
- [ ] Backup strategy planned
- [ ] Database size acceptable

---

## 🔐 Security Checklist

### Credentials
- [ ] Supabase production project created
- [ ] Stripe production account verified
- [ ] Resend domain verified for production
- [ ] All production keys obtained
- [ ] Environment variables secured
- [ ] No secrets in Git repository
- [ ] GitHub Secrets configured (COOLIFY_WEBHOOK)

### Application Security
- [ ] HTTPS enabled for custom domain
- [ ] CORS configured for your domain
- [ ] Rate limiting considered for API
- [ ] Input validation in place
- [ ] Password requirements set
- [ ] Session timeouts configured
- [ ] Error messages don't leak sensitive info
- [ ] Sensitive data not logged

### Database Security
- [ ] RLS (Row Level Security) enabled
- [ ] Foreign key constraints in place
- [ ] Indexes created for performance
- [ ] Backup schedule configured
- [ ] Encryption at rest enabled
- [ ] Automatic SSL in Supabase
- [ ] API keys rotated regularly

### Stripe Security
- [ ] Live keys (not test keys!)
- [ ] Webhook signature validation in place
- [ ] Webhook secret stored securely
- [ ] Customer metadata properly set
- [ ] PCI compliance met
- [ ] 3D Secure enabled if needed
- [ ] IP whitelisting considered

---

## 🚀 Deployment Configuration

### Coolify Setup
- [ ] Coolify server ready
- [ ] Application created in Coolify
- [ ] Docker configuration valid
- [ ] Environment variables added
- [ ] Custom domain registered
- [ ] DNS CNAME records configured
- [ ] SSL certificate generating

### GitHub Actions
- [ ] Secrets configured: `COOLIFY_WEBHOOK`
- [ ] Workflows enabled
- [ ] Deployment workflow functional
- [ ] Test workflow passing
- [ ] Build workflow succeeding

### Database Migration
- [ ] SQL scripts ready
- [ ] Backup taken before migration
- [ ] Migration tested on staging
- [ ] Rollback procedure documented
- [ ] Post-migration validation planned

---

## 📧 Communication

### Stakeholders
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Downtime expectations communicated
- [ ] Support plan prepared for launch

### Monitoring
- [ ] Error tracking setup (e.g., Sentry)
- [ ] Uptime monitoring configured
- [ ] Performance monitoring enabled
- [ ] Log aggregation ready
- [ ] Alert thresholds set

---

## ⚡ Performance

### Optimization Complete
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] CSS/JS minified
- [ ] Cache headers configured
- [ ] CDN configured (optional)
- [ ] API response times acceptable
- [ ] Database connection pooling setup

### Monitoring
- [ ] Page load time < 3s
- [ ] API response time < 200ms
- [ ] Database query time < 100ms
- [ ] No N+1 query problems
- [ ] Memory usage acceptable

---

## 📝 Documentation

- [ ] PRODUCTION_DEPLOYMENT.md completed
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented
- [ ] Troubleshooting guide written
- [ ] Team runbooks created

---

## 🔍 Final Review

### Code Review
- [ ] Code reviewed by team member
- [ ] Approved for production
- [ ] Architecture decisions documented
- [ ] Trade-offs documented

### Testing
- [ ] Manual testing completed
- [ ] Cross-browser testing done
- [ ] Mobile testing passed
- [ ] Edge cases considered
- [ ] Error handling tested

### Approvals
- [ ] Technical lead approval
- [ ] Product manager approval
- [ ] Security review passed
- [ ] Operations team ready

---

## 🚀 Deployment Steps

### Step 1: GitHub Push
```bash
# Ensure you're on main branch
git checkout main

# Create .env file (DO NOT COMMIT)
# Add production values to .env.local (local testing only)

# Verify all changes committed
git status

# Push to main (triggers auto-deploy)
git push origin main
```

### Step 2: Monitor Deployment
- [ ] Check GitHub Actions → Workflows → Deploy
- [ ] Verify build passes (test.yml, build.yml)
- [ ] Confirm Coolify webhook triggered (deploy.yml)
- [ ] Check Coolify deployment status

### Step 3: Verify Production
- [ ] Website loads at https://yourdomain.com
- [ ] SSL certificate valid (green lock)
- [ ] Homepage displays correctly
- [ ] Sign up form loads
- [ ] Database connection working
- [ ] Stripe integration responding

### Step 4: Smoke Tests
**Run these tests in production:**

```bash
# Test Sign Up
1. Visit https://yourdomain.com
2. Click "Get Started"
3. Register with test email
4. Verify email received
5. Check Supabase users table

# Test Login
1. Login with registered credentials
2. Should see dashboard
3. Check session in browser

# Test Billing
1. Click "Billing" tab
2. See pricing tiers
3. Click "Upgrade to Pro"
4. Use real Stripe card (or test card if still in test mode)
5. Complete checkout
6. Verify webhook processed (check Supabase subscriptions table)
7. Should show "Pro Plan - active"

# Test Settings
1. Click "Settings"
2. Edit profile
3. Save changes
4. Sign out
```

### Step 5: Monitor
- [ ] Check Coolify logs for errors
- [ ] Monitor Stripe dashboard for transactions
- [ ] Watch Supabase metrics
- [ ] Check email delivery in Resend
- [ ] Review application errors

---

## 🎉 Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check customer support emails
- [ ] Verify all transactions processing
- [ ] Check email delivery
- [ ] Monitor uptime
- [ ] Track performance metrics

### Success Validation
- [ ] No critical errors in logs
- [ ] All customers can sign up
- [ ] All customers can subscribe
- [ ] Webhooks processing correctly
- [ ] Emails delivering
- [ ] Database performing well

### Communication
- [ ] Notify team of successful launch
- [ ] Update status page
- [ ] Post launch announcement
- [ ] Thank customers

---

## 🔄 If Deployment Fails

### Immediately
1. [ ] Assess the issue (check logs)
2. [ ] Notify team
3. [ ] Don't panic, rollback is easy

### Rollback
```bash
# Find previous good commit
git log --oneline | head -5

# Revert to previous commit
git revert <bad-commit-hash>
git push origin main
# Coolify will auto-deploy previous version
```

### Post-Mortem
- [ ] Identify root cause
- [ ] Document lessons learned
- [ ] Fix issue locally
- [ ] Re-deploy after verification

---

## 📞 Support Contacts

- **Coolify Issues:** Check Coolify dashboard, restart application
- **Supabase Issues:** Check Supabase status page
- **Stripe Issues:** Check Stripe status page, email Stripe support
- **Resend Issues:** Check Resend status, email Resend support
- **DNS/Domain Issues:** Contact domain registrar

---

## ✅ Sign-Off

- [ ] All checklist items completed
- [ ] Ready for production deployment
- [ ] Team agrees to deploy
- [ ] Deployment window confirmed

**Deployed by:** ___________________  
**Date:** ___________________  
**Approved by:** ___________________  

---

**🎉 Congratulations! Your SaaS is production-ready!**
