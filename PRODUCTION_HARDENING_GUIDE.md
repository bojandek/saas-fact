# Production Hardening Phase 26 - Bug Fixes Guide

Complete guide for implementing 3 critical production bug fixes.

---

## ✅ BUG 1: Real Alert Integrations

### What Was Fixed
- **Before**: Slack/Email/PagerDuty alerts were only `console.log()` stubs
- **After**: Real integrations with actual API calls

### Implementation

#### Slack Integration
```typescript
import { initializeAlertServices } from '@saas-factory/blocks-observability'

// Initialize with Slack webhook
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
process.env.SLACK_CHANNEL = '#incidents' // Optional
process.env.SLACK_CRITICAL_MENTIONS = '@devops,@oncall'
process.env.SLACK_WARNING_MENTIONS = '@team'

initializeAlertServices()
```

**Environment Variables Required:**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#incidents (optional, defaults to webhook channel)
SLACK_CRITICAL_MENTIONS=@devops,@oncall (optional)
SLACK_WARNING_MENTIONS=@team (optional)
```

#### Email Integration (Resend)
```typescript
process.env.RESEND_API_KEY = 're_xxxxxxxxxxxx'
process.env.EMAIL_FROM = 'alerts@yourdomain.com'
process.env.EMAIL_RECIPIENTS = 'ops@domain.com,team@domain.com'
process.env.EMAIL_CRITICAL_RECIPIENTS = 'oncall@domain.com'

initializeAlertServices()
```

**Environment Variables Required:**
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=alerts@yourdomain.com
EMAIL_RECIPIENTS=ops@domain.com,team@domain.com
EMAIL_CRITICAL_RECIPIENTS=oncall@domain.com (optional)
```

#### PagerDuty Integration
```typescript
process.env.PAGERDUTY_INTEGRATION_KEY = 'YOUR_INTEGRATION_KEY'
process.env.PAGERDUTY_SERVICE_ID = 'YOUR_SERVICE_ID' // Optional

initializeAlertServices()
```

**Environment Variables Required:**
```
PAGERDUTY_INTEGRATION_KEY=YOUR_INTEGRATION_KEY
PAGERDUTY_SERVICE_ID=YOUR_SERVICE_ID (optional)
```

### Files Changed
- `blocks/observability/src/alerts/slack-alert.ts` (NEW)
- `blocks/observability/src/alerts/email-alert.ts` (NEW)
- `blocks/observability/src/alerts/pagerduty-alert.ts` (NEW)
- `blocks/observability/src/monitoring.ts` (UPDATED with real handlers)

### Testing
```typescript
import { getMonitoringEngine, initializeAlertServices } from '@saas-factory/blocks-observability'

// Initialize services
initializeAlertServices()

const monitoring = getMonitoringEngine()

// Register test alert
monitoring.registerAlert({
  id: 'test-alert',
  name: 'High Error Rate',
  severity: 'critical',
  channels: ['slack', 'email', 'pagerduty'],
  enabled: true,
  condition: (metrics) => metrics.errorRate > 5,
})

// Simulate metrics that trigger alert
await monitoring.processMetrics({
  timestamp: new Date(),
  requestCount: 1000,
  errorCount: 100,
  errorRate: 10,
  p50Latency: 50,
  p95Latency: 200,
  p99Latency: 500,
  stripeHealth: true,
  supabaseHealth: true,
  redisHealth: true,
  circuitBreakerStates: {},
  activeUsers: 500,
  newSignups: 50,
  failedPayments: 5,
})
```

---

## ✅ BUG 2: Real Rate Limit Database Tier Lookup

### What Was Fixed
- **Before**: All users hardcoded to `'free'` tier (100 req/hour)
- **After**: Real database lookup with caching

### Implementation

The tier lookup now performs real database queries:

```typescript
import { getTierLookupService } from '@saas-factory/rate-limit'

const tierLookup = getTierLookupService()

// Get tier directly
const tier = await tierLookup.getTier('user:user123')
// Returns: 'free' | 'pro' | 'enterprise'

// Supports multiple identifier formats:
// - user:user123
// - tenant:tenant456
// - api-key:key789
```

### Rate Limits by Tier
```
FREE:       100 requests/hour
PRO:      10,000 requests/hour
ENTERPRISE: 100,000 requests/hour
```

### Database Schema Requirements
The system expects these tables in Supabase:

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  plan_id UUID NOT NULL,
  status TEXT NOT NULL, -- 'active', 'past_due', 'canceled', etc
  created_at TIMESTAMP,
  cancel_at TIMESTAMP
)

-- Plans table
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL, -- 'free', 'pro', 'enterprise'
  name TEXT,
  price DECIMAL,
  created_at TIMESTAMP
)

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  user_id TEXT,
  tenant_id TEXT,
  subscription_id UUID,
  created_at TIMESTAMP
)
```

### Caching Strategy
- 5-minute TTL per identifier
- Automatic cache invalidation for expired entries
- Max 10,000 cached entries

### Files Changed
- `blocks/rate-limit/src/tier-lookup.ts` (NEW)
- `blocks/rate-limit/src/rate-limit-middleware.ts` (UPDATED to use real lookup)

### Testing
```typescript
import { getTierLookupService } from '@saas-factory/rate-limit'

const tierLookup = getTierLookupService()

// Test lookups
const freeTier = await tierLookup.getTier('user:free-user-id')
console.log(freeTier) // 'free'

const proTier = await tierLookup.getTier('user:pro-user-id')
console.log(proTier) // 'pro'

// Invalidate cache if needed
tierLookup.invalidateCache('user:free-user-id')
```

---

## ✅ BUG 3: Real Churn Rate Calculation

### What Was Fixed
- **Before**: Hardcoded 5% churn rate
- **After**: Real calculation from historical subscription and activity data

### Implementation

```typescript
import { getChurnCalculator } from '@saas-factory/analytics'

const churnCalc = getChurnCalculator()

// Get churn metrics for 30-day window
const metrics = await churnCalc.calculateChurnRate('tenant-id', 30)
// Returns: ChurnMetrics with actual churn%, churn count, MRR, etc

// Get full analysis with risk segmentation
const analysis = await churnCalc.getFullAnalysis('tenant-id')
// Returns: {
//   metrics: ChurnMetrics,
//   riskSegments: { highRisk: [], mediumRisk: [], lowRisk: [] },
//   trends: { lastMonth, thisMonth, trend }
// }

// Get trends
const trends = await churnCalc.analyzeChurnTrends('tenant-id')
// Returns: { lastMonth: 3.2, thisMonth: 2.8, trend: 'improving' }
```

### Analytics Manager Integration

The main analytics module now includes churn methods:

```typescript
import { analytics } from '@saas-factory/analytics'

// Get churn metrics
const churn = await analytics.getChurnMetrics('tenant-id', 30)

// Get full analysis
const analysis = await analytics.getChurnAnalysis('tenant-id')

// Get trends
const trends = await analytics.getChurnTrends('tenant-id')
```

### Churn Calculation Formula

```
Churn Rate = (Churned Users / Starting Users) * 100

Where Churned Users includes:
- Subscriptions with status='canceled' in window
- Downgraded subscriptions
- Users inactive for 14+ days
```

### Database Requirements

Expected tables:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  plan_id UUID NOT NULL,
  status TEXT, -- 'active', 'canceled', etc
  created_at TIMESTAMP,
  cancel_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP
)

CREATE TABLE plans (
  id UUID PRIMARY KEY,
  slug TEXT, -- used to determine tier
  price DECIMAL
)

-- Optional: Required for downgrade tracking
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY,
  subscription_id UUID,
  old_plan_id UUID,
  new_plan_id UUID,
  changed_at TIMESTAMP
)
```

### Required RPC Functions

```sql
-- Get downgraded subscriptions
CREATE OR REPLACE FUNCTION get_downgraded_subscriptions(
  p_tenant_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (churn_count INT) AS $$
BEGIN
  -- Implementation to count downgrades
  -- Should return count of subscription downgrades in period
END;
$$ LANGUAGE plpgsql;

-- Get high-risk churn users
CREATE OR REPLACE FUNCTION get_high_risk_churn_users(
  p_tenant_id TEXT,
  p_inactive_threshold TIMESTAMP
)
RETURNS TABLE (user_id TEXT) AS $$
BEGIN
  -- Users with no activity since threshold
END;
$$ LANGUAGE plpgsql;

-- Get medium-risk churn users
CREATE OR REPLACE FUNCTION get_medium_risk_churn_users(
  p_tenant_id TEXT,
  p_inactive_threshold TIMESTAMP
)
RETURNS TABLE (user_id TEXT) AS $$
BEGIN
  -- Users with sporadic activity
END;
$$ LANGUAGE plpgsql;

-- Calculate tenant MRR
CREATE OR REPLACE FUNCTION calculate_tenant_mrr(p_tenant_id TEXT)
RETURNS DECIMAL AS $$
BEGIN
  -- Sum of recurring revenue
END;
$$ LANGUAGE plpgsql;

-- Calculate MRR churn
CREATE OR REPLACE FUNCTION calculate_mrr_churn(
  p_tenant_id TEXT,
  p_start_date TIMESTAMP
)
RETURNS DECIMAL AS $$
BEGIN
  -- Lost recurring revenue in period
END;
$$ LANGUAGE plpgsql;
```

### Files Changed
- `blocks/analytics/src/churn-calculator.ts` (NEW)
- `blocks/analytics/src/index.ts` (UPDATED with churn methods)

### Testing
```typescript
import { analytics } from '@saas-factory/analytics'

// Get churn metrics
const metrics = await analytics.getChurnMetrics('tenant-123', 30)
console.log(`Churn Rate: ${metrics?.churnRate}%`)
console.log(`Churning Users: ${metrics?.churningUsers}`)

// Get risk analysis
const analysis = await analytics.getChurnAnalysis('tenant-123')
console.log(`High Risk Users: ${analysis?.riskSegments.highRisk.length}`)
console.log(`Trend: ${analysis?.trends.trend}`)
```

---

## Environment Setup Checklist

### Slack
- [ ] Create Slack App at https://api.slack.com/apps
- [ ] Enable "Incoming Webhooks"
- [ ] Create webhook URL for #incidents channel
- [ ] Add to `.env.local`: `SLACK_WEBHOOK_URL`

### Email (Resend)
- [ ] Sign up at https://resend.com
- [ ] Create API key
- [ ] Verify sending domain
- [ ] Add to `.env.local`: `RESEND_API_KEY`

### PagerDuty
- [ ] Create account at https://www.pagerduty.com
- [ ] Create Service for your application
- [ ] Create Integration (Events API v2)
- [ ] Copy Integration Key
- [ ] Add to `.env.local`: `PAGERDUTY_INTEGRATION_KEY`

### Database (Supabase)
- [ ] Verify `subscriptions` table exists
- [ ] Verify `plans` table exists
- [ ] Create required RPC functions
- [ ] Verify `analytics_events` table has `tenant_id` and `user_id`

---

## Deployment Steps

1. **Deploy new files:**
   ```bash
   pnpm install
   pnpm build
   ```

2. **Set environment variables** in production:
   ```bash
   # Alerts
   SLACK_WEBHOOK_URL=...
   RESEND_API_KEY=...
   PAGERDUTY_INTEGRATION_KEY=...
   
   # Others already configured
   ```

3. **Initialize alert services** in your app startup:
   ```typescript
   import { initializeAlertServices } from '@saas-factory/blocks-observability'
   
   // Call on app bootstrap
   initializeAlertServices()
   ```

4. **Test each integration:**
   ```bash
   pnpm test:alerts
   ```

5. **Deploy to production:**
   ```bash
   git push origin main
   # CI/CD pipeline handles the rest
   ```

---

## Rollback Plan

If issues occur:

1. **For Alerts**: Services gracefully degrade to console logging
2. **For Rate Limiting**: Falls back to DEFAULT tier (100 req/hour)
3. **For Churn**: Returns 0% or uses cached value

No database rollback needed - all changes are additive.

---

## Monitoring & Observability

### Alert Delivery Monitoring
```typescript
const monitoring = getMonitoringEngine()
const health = monitoring.getHealthReport()
console.log(`Active Incidents: ${health.activeIncidents}`)
```

### Rate Limit Monitoring
```typescript
import { getRateLimitStatus } from '@saas-factory/rate-limit'

const status = await getRateLimitStatus('user:123')
console.log(`Used: ${status.percentageUsed}%`)
```

### Churn Monitoring
```typescript
const analysis = await analytics.getChurnAnalysis('tenant-id')
console.log(`Churn Trend: ${analysis.trends.trend}`)
if (analysis.trends.trend === 'declining') {
  // Alert the team
}
```

---

## Support

- **Slack Integration Issues**: Check webhook URL and channel permissions
- **Email Issues**: Verify Resend API key and sending domain
- **PagerDuty Issues**: Confirm Integration Key and service configuration
- **Rate Limiting Issues**: Check Supabase connectivity and query performance
- **Churn Calculation Issues**: Verify RPC functions and table schemas
