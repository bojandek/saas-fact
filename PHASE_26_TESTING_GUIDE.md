# Phase 26 - Testing Guide

Comprehensive testing procedures for all 3 production bug fixes.

---

## Test 1: Alert Integrations

### Unit Tests
```bash
cd blocks/observability
pnpm test
```

### Integration Test - Slack
```typescript
import { getMonitoringEngine, initializeAlertServices } from '@saas-factory/blocks-observability'

// Setup
process.env.SLACK_WEBHOOK_URL = 'YOUR_TEST_WEBHOOK'
initializeAlertServices()

const monitoring = getMonitoringEngine()

// Register alert
monitoring.registerAlert({
  id: 'test-slack',
  name: 'Test Slack Alert',
  severity: 'critical',
  channels: ['slack'],
  enabled: true,
  condition: (m) => m.errorRate > 5,
  cooldown: 0,
})

// Trigger alert
await monitoring.processMetrics({
  timestamp: new Date(),
  requestCount: 100,
  errorCount: 10,
  errorRate: 10,
  p50Latency: 50,
  p95Latency: 200,
  p99Latency: 500,
  stripeHealth: true,
  supabaseHealth: true,
  redisHealth: true,
  circuitBreakerStates: {},
  activeUsers: 100,
  newSignups: 5,
  failedPayments: 2,
})

// Verify: Check Slack channel for message
```

### Integration Test - Email
```typescript
process.env.RESEND_API_KEY = 'YOUR_TEST_KEY'
process.env.EMAIL_FROM = 'test@example.com'
process.env.EMAIL_RECIPIENTS = 'your-email@example.com'

// Same flow as Slack but with 'email' channel
```

### Integration Test - PagerDuty
```typescript
process.env.PAGERDUTY_INTEGRATION_KEY = 'YOUR_TEST_KEY'

// Same flow but with 'pagerduty' channel
// Verify: Check PagerDuty for incident creation
```

### Load Test
```typescript
// Test multiple alerts firing simultaneously
const promises = Array(10)
  .fill(null)
  .map(() =>
    monitoring.processMetrics({
      timestamp: new Date(),
      requestCount: 100,
      errorCount: 10,
      errorRate: 10,
      p50Latency: 50,
      p95Latency: 200,
      p99Latency: 500,
      stripeHealth: true,
      supabaseHealth: true,
      redisHealth: true,
      circuitBreakerStates: {},
      activeUsers: 100,
      newSignups: 5,
      failedPayments: 2,
    })
  )

await Promise.all(promises)
console.log('✅ Multiple alerts processed successfully')
```

---

## Test 2: Rate Limit Tier Lookup

### Unit Tests
```bash
cd blocks/rate-limit
pnpm test
```

### Integration Test - Tier Lookup
```typescript
import { getTierLookupService } from '@saas-factory/rate-limit'

const tierLookup = getTierLookupService()

// Test 1: Free tier user
const freeTier = await tierLookup.getTier('user:free-user-123')
console.assert(freeTier === 'free', 'Should return free tier')

// Test 2: Pro tier user
const proTier = await tierLookup.getTier('user:pro-user-456')
console.assert(proTier === 'pro', 'Should return pro tier')

// Test 3: Enterprise tier
const enterpriseTier = await tierLookup.getTier('tenant:enterprise-789')
console.assert(enterpriseTier === 'enterprise', 'Should return enterprise tier')

// Test 4: Unknown user defaults to free
const unknownTier = await tierLookup.getTier('user:unknown-user')
console.assert(unknownTier === 'free', 'Should default to free')
```

### Integration Test - Rate Limiting
```typescript
import { withBurstProtection, getRateLimitStatus } from '@saas-factory/rate-limit'
import { NextRequest } from 'next/server'

// Create test request
const req = new NextRequest(new URL('http://localhost:3000/api/test'), {
  method: 'GET',
  headers: {
    'x-user-id': 'test-user',
  },
})

// Test burst protection
const response = await withBurstProtection(req)
console.log(`Response status: ${response?.status || 200}`)

// Check rate limit status
const status = await getRateLimitStatus('user:test-user', 'default')
console.log(`Rate limit status:`, status)
console.assert(status.isLimited === false, 'Should not be limited')
console.assert(status.remaining > 0, 'Should have remaining requests')
```

### Load Test - Rate Limiting
```typescript
import { rateLimit } from '@saas-factory/rate-limit'

// Simulate 150 requests (limit is 100/hour)
let limitedCount = 0
const userId = 'load-test-user'

for (let i = 0; i < 150; i++) {
  const req = new NextRequest(new URL('http://localhost:3000/api/test'), {
    headers: { 'x-user-id': userId },
  })

  const response = await rateLimit(req, 'default')
  if (response?.status === 429) {
    limitedCount++
  }
}

console.log(`Limited requests: ${limitedCount}`)
console.assert(limitedCount > 40, 'Should have limited requests after 100')
```

### Cache Test
```typescript
// Test caching mechanism
const tier1 = await tierLookup.getTier('user:cache-test')
console.time('Cache Hit')
const tier2 = await tierLookup.getTier('user:cache-test')
console.timeEnd('Cache Hit') // Should be <1ms

// Test cache invalidation
tierLookup.invalidateCache('user:cache-test')
console.time('DB Query')
const tier3 = await tierLookup.getTier('user:cache-test')
console.timeEnd('DB Query') // Should be >50ms
```

---

## Test 3: Churn Rate Calculation

### Unit Tests
```bash
cd blocks/analytics
pnpm test
```

### Integration Test - Churn Calculation
```typescript
import { getChurnCalculator } from '@saas-factory/analytics'

const churnCalc = getChurnCalculator()
const tenantId = 'test-tenant-123'

// Test 1: Get churn metrics
const metrics = await churnCalc.calculateChurnRate(tenantId, 30)
console.log('Churn Metrics:', metrics)
console.assert(typeof metrics?.churnRate === 'number', 'Should have churnRate')
console.assert(metrics.churnRate >= 0 && metrics.churnRate <= 100, 'Rate should be 0-100%')

// Test 2: Get risk segmentation
const riskSegments = await churnCalc.getChurnRiskSegmentation(tenantId)
console.log('Risk Segments:', riskSegments)
console.assert(Array.isArray(riskSegments.highRisk), 'Should have highRisk array')
console.assert(Array.isArray(riskSegments.mediumRisk), 'Should have mediumRisk array')
console.assert(Array.isArray(riskSegments.lowRisk), 'Should have lowRisk array')

// Test 3: Get trends
const trends = await churnCalc.analyzeChurnTrends(tenantId)
console.log('Churn Trends:', trends)
console.assert(['improving', 'declining', 'stable'].includes(trends.trend), 'Invalid trend')

// Test 4: Get full analysis
const analysis = await churnCalc.getFullAnalysis(tenantId)
console.log('Full Analysis:', analysis)
console.assert(analysis?.metrics, 'Should have metrics')
console.assert(analysis?.riskSegments, 'Should have risk segments')
console.assert(analysis?.trends, 'Should have trends')
```

### Integration Test - Analytics Manager
```typescript
import { analytics } from '@saas-factory/analytics'

// Test through main analytics interface
const churn = await analytics.getChurnMetrics('test-tenant-123', 30)
console.log('Churn via Analytics Manager:', churn)

const analysis = await analytics.getChurnAnalysis('test-tenant-123')
console.log('Full Analysis via Analytics Manager:', analysis)

const trends = await analytics.getChurnTrends('test-tenant-123')
console.log('Trends via Analytics Manager:', trends)
```

### Validation Tests
```typescript
// Test 1: Churn rate should not be negative
console.assert(metrics.churnRate >= 0, 'Churn cannot be negative')

// Test 2: Churning users should not exceed total users
console.assert(metrics.churningUsers <= metrics.totalUsers, 'Churned > total')

// Test 3: Risk segments should not overlap
const allRisk = new Set([
  ...riskSegments.highRisk,
  ...riskSegments.mediumRisk,
  ...riskSegments.lowRisk,
])
console.assert(
  allRisk.size === riskSegments.highRisk.length + riskSegments.mediumRisk.length + riskSegments.lowRisk.length,
  'Risk segments should not overlap'
)

// Test 4: Trends should show valid comparison
const isValidTrend = trends.thisMonth >= 0 && trends.lastMonth >= 0
console.assert(isValidTrend, 'Both month values should be valid')
```

### Performance Test
```typescript
// Test churn calculation performance
console.time('Churn Calculation')
const metrics = await churnCalc.calculateChurnRate('test-tenant', 30)
console.timeEnd('Churn Calculation') // Should be <5s

console.time('Full Analysis')
const analysis = await churnCalc.getFullAnalysis('test-tenant')
console.timeEnd('Full Analysis') // Should be <10s
```

---

## Automated Test Suite

Create `tests/phase-26.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Phase 26 - Production Hardening', () => {
  describe('Alert Integrations', () => {
    it('should send Slack alerts', async () => {
      // Test implementation
    })

    it('should send email alerts', async () => {
      // Test implementation
    })

    it('should send PagerDuty alerts', async () => {
      // Test implementation
    })
  })

  describe('Rate Limit Tier Lookup', () => {
    it('should lookup free tier users', async () => {
      // Test implementation
    })

    it('should lookup pro tier users', async () => {
      // Test implementation
    })

    it('should cache tier lookups', async () => {
      // Test implementation
    })
  })

  describe('Churn Rate Calculation', () => {
    it('should calculate churn metrics', async () => {
      // Test implementation
    })

    it('should identify risk segments', async () => {
      // Test implementation
    })

    it('should analyze trends', async () => {
      // Test implementation
    })
  })
})
```

Run tests:
```bash
pnpm test:phase-26
```

---

## Manual Testing Checklist

- [ ] Slack alert received for high error rate
- [ ] Email alert received for low uptime
- [ ] PagerDuty incident created for critical error
- [ ] Free tier user limited at 100 requests/hour
- [ ] Pro tier user can make 10,000 requests/hour
- [ ] Enterprise tier user can make 100,000 requests/hour
- [ ] Rate limit cache working (subsequent checks are fast)
- [ ] Churn rate calculated correctly from data
- [ ] Risk segmentation identifies high-risk users
- [ ] Trends correctly show improving/declining/stable

---

## Monitoring Commands

```bash
# Monitor alert delivery
docker logs -f saas-factory-app | grep "\[Monitoring\]"

# Monitor rate limiting
docker logs -f saas-factory-app | grep "\[TierLookup\]"

# Monitor churn calculation
docker logs -f saas-factory-app | grep "\[ChurnCalculator\]"
```

---

## Known Issues & Workarounds

### Issue: Slack webhook URL invalid
**Solution**: Verify webhook URL format and Slack app permissions

### Issue: Rate limit tier always returns 'free'
**Solution**: Check database connectivity and verify subscriptions table

### Issue: Churn calculation takes > 10 seconds
**Solution**: Add indexes on `subscriptions.tenant_id` and `analytics_events.tenant_id`

---

## Rollback Testing

Test that rollback doesn't break functionality:

```bash
# Deploy previous version
git checkout HEAD~1

# Run tests
pnpm test

# Verify system still works with degraded alerts
```
