# Phase 26 - Deployment Checklist

Final deployment and production rollout procedures.

---

## Pre-Deployment Verification

### Code Quality
- [ ] All TypeScript types check: `pnpm type-check`
- [ ] All tests pass: `pnpm test`
- [ ] No console errors or warnings
- [ ] ESLint passes: `pnpm lint`

### Dependencies
- [ ] All new packages added to `package.json`
- [ ] Lock file updated: `pnpm install`
- [ ] No security vulnerabilities: `pnpm audit`

### Database
- [ ] Supabase migrations applied
- [ ] RPC functions created:
  - [ ] `get_downgraded_subscriptions`
  - [ ] `get_high_risk_churn_users`
  - [ ] `get_medium_risk_churn_users`
  - [ ] `calculate_tenant_mrr`
  - [ ] `calculate_mrr_churn`
- [ ] Indexes created on key columns:
  - [ ] `subscriptions.tenant_id`
  - [ ] `subscriptions.user_id`
  - [ ] `subscriptions.status`
  - [ ] `analytics_events.tenant_id`
  - [ ] `analytics_events.user_id`

### External Services
- [ ] Slack webhook URL verified and working
- [ ] Resend API key valid and email verified
- [ ] PagerDuty integration key created
- [ ] All services accessible from production environment

---

## Environment Configuration

### Production Environment Variables

Configure in your deployment platform (Vercel, Railway, AWS, etc.):

```bash
# Alert Integration - Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#incidents
SLACK_CRITICAL_MENTIONS=@devops,@oncall
SLACK_WARNING_MENTIONS=@team

# Alert Integration - Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=alerts@yourdomain.com
EMAIL_RECIPIENTS=ops@domain.com,team@domain.com
EMAIL_CRITICAL_RECIPIENTS=oncall@domain.com

# Alert Integration - PagerDuty
PAGERDUTY_INTEGRATION_KEY=YOUR_INTEGRATION_KEY
PAGERDUTY_SERVICE_ID=YOUR_SERVICE_ID

# Existing Supabase config (verify no changes needed)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Rate Limiting - Upstash Redis (must be configured)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Staging Environment Variables

Same as production but with test accounts:
- Slack: Use @staging channel
- Email: Use staging@domain.com recipients
- PagerDuty: Use staging service

---

## Build & Deploy Steps

### Step 1: Build Verification
```bash
# Install dependencies
pnpm install

# Type check
pnpm type-check

# Run tests
pnpm test

# Build project
pnpm build

# Check build output sizes
ls -lah .next/
```

Expected outputs:
- All TypeScript compiles without errors
- All tests pass (or acceptable number of known failures)
- Build succeeds with no critical errors

### Step 2: Pre-Production Deployment (Staging)

```bash
# Deploy to staging environment
git checkout -b release/phase-26
git push origin release/phase-26

# Your CI/CD pipeline should:
# 1. Run all tests
# 2. Run integration tests
# 3. Deploy to staging
# 4. Run smoke tests
```

### Step 3: Staging Validation

After staging deployment, verify:

```bash
# Test alert integration
curl -X POST http://staging.yourdomain.com/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"severity": "critical", "message": "Test alert"}'

# Expected: Alert in Slack, email received, PagerDuty incident created

# Test rate limiting
for i in {1..150}; do
  curl -X GET http://staging.yourdomain.com/api/test \
    -H "x-user-id: test-user"
done

# Expected: Last 50 requests should get 429 status

# Test churn calculation
curl -X GET http://staging.yourdomain.com/api/churn-report \
  -H "x-tenant-id: test-tenant"

# Expected: Real churn % instead of hardcoded 5%
```

Checklist:
- [ ] Slack alerts received correctly
- [ ] Emails delivered to all recipients
- [ ] PagerDuty incidents created
- [ ] Rate limiting working per tier
- [ ] Churn calculation returns real data
- [ ] No error logs related to new features
- [ ] Performance is acceptable (<500ms for analytics queries)

### Step 4: Create Release

```bash
# Create release tag
git tag -a v1.0.0-phase-26 -m "Phase 26: Production Hardening - Real Integrations"
git push origin v1.0.0-phase-26

# Create GitHub release with notes (from this file)
```

### Step 5: Production Deployment

```bash
# Merge to main branch
git checkout main
git merge release/phase-26

# Push to trigger production deployment
git push origin main

# Monitor deployment:
# - Check deployment logs
# - Monitor error tracking (Sentry, etc.)
# - Monitor uptime/latency
```

### Step 6: Post-Deployment Verification

Immediately after production deployment:

```bash
# Check production health
curl https://yourdomain.com/api/health

# Verify no new errors in logs
tail -f /var/log/app.log | grep ERROR

# Check alert delivery latency
# - Slack: < 5 seconds
# - Email: < 30 seconds
# - PagerDuty: < 10 seconds
```

---

## Rollback Procedure

If deployment fails or issues arise:

### Quick Rollback (< 5 minutes)

```bash
# Revert to previous version
git revert HEAD
git push origin main

# CI/CD will automatically redeploy previous version

# Disable new features if possible:
# Set feature flags or toggle environment variables
```

### Full Rollback (Complex Data Issues)

If database migrations cause issues:

```bash
# 1. Stop accepting new requests
# 2. Revert Supabase migration
# 3. Redeploy previous code
# 4. Verify data integrity

# Command to revert Supabase migration:
supabase db pull --schema-only
# Then manually edit and revert changes
supabase push --dry-run
```

### Partial Rollback (Specific Features)

If only one feature has issues:

```bash
# Disable alerts while keeping rate limiting and churn:
unset SLACK_WEBHOOK_URL
unset RESEND_API_KEY
unset PAGERDUTY_INTEGRATION_KEY

# Services will gracefully degrade
```

---

## Monitoring & Observability

### Set Up Alerts

Configure these alerts in your monitoring system:

1. **Alert Delivery Failures**
   ```
   If: Any alert channel returns error for 5 consecutive failures
   Then: Alert ops@domain.com
   ```

2. **Rate Limit Lookup Latency**
   ```
   If: Tier lookup takes > 1 second
   Then: Alert devops@domain.com
   ```

3. **Churn Calculation Errors**
   ```
   If: Churn calculation fails 3 times in 10 minutes
   Then: Alert analytics@domain.com
   ```

### Metrics to Monitor

```
Metrics Dashboard:
├── Alerts
│   ├── Slack delivery latency
│   ├── Email delivery rate
│   ├── PagerDuty incident creation time
│   └── Failed alert count
├── Rate Limiting
│   ├── Tier lookup cache hit rate
│   ├── Tier lookup latency (p50, p95, p99)
│   ├── Requests limited per tier
│   └── Cache size
└── Churn
    ├── Calculation latency
    ├── Churn rate trend (30d)
    ├── Risk segment distribution
    └── Calculation error rate
```

### Dashboards

Create Grafana/DataDog dashboards showing:
- Alert delivery status (last 24h)
- Rate limit distribution by tier
- Churn rate trend with forecast
- All services health status

---

## Communication Plan

### Before Deployment (T-1 hour)
- [ ] Notify ops team via Slack
- [ ] Post in #announcements: "Phase 26 deployment starting in 1 hour"
- [ ] Prepare rollback plan

### During Deployment (T-0)
- [ ] Pin deployment in Slack
- [ ] Provide link to logs
- [ ] Monitor critical metrics
- [ ] Be ready to rollback

### After Deployment (T+1 hour)
- [ ] Verify all systems operational
- [ ] Post success message in Slack
- [ ] Update status page
- [ ] Schedule retrospective if issues

### Announcement Template

```
🚀 Phase 26: Production Hardening Deployment

What's changing:
✅ Real Slack/Email/PagerDuty alerts (no more console.log)
✅ Real database tier lookup (pro/enterprise get higher limits)
✅ Real churn calculation (from actual data, not hardcoded 5%)

Expected impact: None (transparent update)
Estimated time: 5-15 minutes
Rollback ready: Yes

Questions? Reply to this thread.
```

---

## Success Criteria

Deployment considered successful when:

- [ ] All services deploy without errors
- [ ] No spike in error rates
- [ ] Alert delivery working (test all 3 channels)
- [ ] Rate limiting functioning per tier
- [ ] Churn calculation returns real data
- [ ] Latency remains < 200ms p95
- [ ] No customer complaints within 1 hour

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor error logs continuously
- [ ] Test each alert channel manually
- [ ] Verify rate limit distribution by tier
- [ ] Check churn calculation accuracy

### Day 3
- [ ] Review alert delivery metrics
- [ ] Analyze rate limit false positives
- [ ] Validate churn calculation against manual audit
- [ ] Performance baseline established

### Week 1
- [ ] Full health assessment
- [ ] Document lessons learned
- [ ] Plan optimization improvements
- [ ] Celebrate successful deployment! 🎉

---

## Optimization Notes for Future

After deployment stabilizes:

1. **Alert Delivery**
   - Consider batch sending for efficiency
   - Add alert deduplication
   - Implement alert escalation policies

2. **Rate Limiting**
   - Add user-specific rate limit policies
   - Implement burst allowance for pro users
   - Add rate limit bypass for support team

3. **Churn Analysis**
   - Add predictive churn modeling
   - Create automated retention campaigns
   - Add cohort analysis by signup source

---

## Contact & Support

During deployment:
- **Ops Lead**: ops-lead@domain.com
- **Database**: db-team@domain.com
- **Oncall**: Check PagerDuty escalation

After deployment (issues):
- Check logs: `docker logs app`
- Check metrics: Grafana dashboard
- Check Sentry: Error tracking
- Roll back if needed

---

## Approval Sign-off

- [ ] Engineering Lead Approval: _______
- [ ] Operations Lead Approval: _______
- [ ] Security Review Approval: _______
- [ ] Product Manager Notification: _______

Date: _______________
Deployed By: _______________
