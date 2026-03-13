# Amplitude Product Analytics: Advanced Patterns & Implementation

## Overview
Amplitude transformed product analytics from "what happened" to "why it happened" through event-based architecture, behavioral cohorts, and predictive analytics.

Key insight: **Product analytics is about understanding user behavior sequences**, not just individual events.

## Event-Based Architecture

### Core Concept: Events as First-Class Citizens

```typescript
interface Event {
  // Identity
  userId: string;              // Required
  sessionId: string;           // Session grouping
  deviceId: string;            // Cross-device tracking
  
  // Event definition
  eventType: string;           // e.g., "button_clicked", "page_viewed"
  eventProperties: {
    [key: string]: any;        // Context-specific data
  };
  
  // User properties (updated with each event)
  userProperties: {
    [key: string]: any;        // Persists across sessions
  };
  
  // Temporal
  timestamp: number;           // milliseconds
  
  // Revenue tracking (optional)
  revenue?: number;
  revenueType?: 'purchase' | 'subscription' | 'refund';
}

// Example events sequence
const userJourney = [
  {
    userId: "user_123",
    sessionId: "session_abc",
    eventType: "page_viewed",
    eventProperties: { page: "pricing" },
    timestamp: 1704067200000,
  },
  {
    userId: "user_123",
    sessionId: "session_abc",
    eventType: "button_clicked",
    eventProperties: { button: "start_trial", destination: "checkout" },
    timestamp: 1704067290000,
  },
  {
    userId: "user_123",
    sessionId: "session_abc",
    eventType: "purchase",
    eventProperties: { plan: "pro", amount: 99 },
    revenue: 99,
    revenueType: "subscription",
    timestamp: 1704067500000,
  },
];
```

### Event Taxonomy (Your SaaS)

```
Application
├─ Page Views
│  └─ page_viewed{page, referrer, utm_source}
│
├─ User Actions (Core)
│  ├─ button_clicked{button_id, destination}
│  ├─ form_submitted{form_type, fields_count}
│  ├─ search_executed{query, results_count}
│  ├─ filter_applied{filter_type, filter_value}
│  └─ download_clicked{file_type, file_size}
│
├─ Feature Engagement
│  ├─ feature_viewed{feature_name}
│  ├─ feature_used{feature_name, duration}
│  ├─ feature_abandoned{feature_name, reason}
│  └─ tutorial_completed{tutorial_name}
│
├─ Content Interactions
│  ├─ item_viewed{item_id, category, price}
│  ├─ item_favorited{item_id}
│  ├─ item_shared{item_id, platform}
│  └─ item_purchased{item_id, amount}
│
├─ User Account
│  ├─ signed_up{source, referrer}
│  ├─ signed_in{method, is_first_time}
│  ├─ password_reset_requested{email}
│  ├─ settings_changed{setting_name, new_value}
│  └─ account_deleted{reason}
│
├─ Support/Help
│  ├─ help_article_viewed{article_id}
│  ├─ support_ticket_created{category}
│  ├─ chat_started{topic}
│  └─ feedback_submitted{rating, category}
│
└─ Error Tracking
   ├─ error_occurred{error_type, error_message}
   ├─ page_crashed{error_code}
   └─ api_failed{endpoint, status_code}
```

## Behavioral Cohorts (Beyond Acquisition Date)

### Concept: Cohorts Based on Actions, Not Demographics

```typescript
// Acquisition cohort (old way)
const acquisitionCohort = users.filter(u => 
  u.signupDate.between('2024-01', '2024-02')
);

// Behavioral cohort (new way)
const behavioralCohort = users.filter(u => 
  u.events.filter(e => e.eventType === 'feature_X_used').count > 0 &&
  u.lastEventDate.isWithin(7, 'days')
);

// More specific
const powerUserCohort = users.filter(u => 
  u.events.count > 50 &&
  u.sessionCount > 10 &&
  u.lastSessionDuration > 300
);
```

### Built-in Cohort Definitions

```
Activation Ladder:
├─ Signed Up: Just created account
├─ Activated: Completed first key action
├─ Engaged: Used 2+ features this week
├─ Power User: 50+ events this month
└─ At Risk: Inactive for 7+ days

Engagement Tiers:
├─ Inactive: 0 events in 30 days
├─ Low: < 5 events this week
├─ Medium: 5-20 events this week
├─ High: 20-50 events this week
└─ Power: 50+ events this week

Trial Status:
├─ Trial Started: Signup → trial initiated
├─ Trial Active: Last event within 30 days
├─ Trial Expiring: Last event 25-30 days ago
├─ Trial Expired: Signed up 30+ days ago, no purchase
└─ Converted: Purchased after trial

Churn Risk:
├─ New: < 7 days since signup
├─ Stable: Active this week
├─ At Risk: Inactive 7+ days but < 30 days
├─ Churning: Inactive 30-60 days
└─ Churned: Inactive 60+ days
```

## Funnel Analysis: Finding Drops

### Standard Funnel

```
Visitors
    ↓
Account Created (80%)
    ↓
Set Up Profile (65%)
    ↓
Took First Action (45%)
    ↓
Completed Tutorial (30%)
    ↓
Purchased (5%)

Insights:
├─ 15% drop after signup (registration issue?)
├─ 20% drop at profile setup (too many fields?)
├─ 15% drop at first action (ux unclear?)
├─ 15% drop at tutorial (engagement drops)
└─ 25% drop at purchase (price objection? friction?)
```

### Segment Funnels

```sql
-- Compare funnel by segment
SELECT 
  segment,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_1 THEN user_id END) / 
        COUNT(DISTINCT user_id), 1) AS step_1_pct,
  
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_2 THEN user_id END) / 
        COUNT(DISTINCT user_id), 1) AS step_2_pct,
  
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_3 THEN user_id END) / 
        COUNT(DISTINCT user_id), 1) AS step_3_pct
FROM users
GROUP BY segment;
```

Results:
```
Segment    Step1  Step2  Step3  Insight
─────────────────────────────────────────
Enterprise  95%    92%    88%    (smooth funnel)
Mid-market  90%    75%    50%    (big drop at step 2)
SMB         80%    55%    25%    (big drop at step 1)
```

**Action**: Address SMB onboarding (biggest drop early).

## Feature Adoption Curves

### The S-Curve Pattern

```
Day 0-7: Launch
├─ Adoption: 5%
├─ Why low: Users don't know feature exists
└─ Fix: In-app notification, email alert

Day 8-30: Ramping
├─ Adoption: 5% → 25%
├─ Why rising: Early adopters finding value
└─ Fix: Help content, tutorials

Day 31-90: Plateau
├─ Adoption: 25% → 40%
├─ Why plateau: Reached natural audience
└─ Fix: Experiment with UX to expand audience

Day 90+: Steady State
├─ Adoption: 40%
├─ Why flat: Market equilibrium
└─ Insight: 60% of users don't need this feature
```

### Tracking Feature Adoption

```typescript
interface FeatureMetric {
  featureName: string;
  totalUsers: number;
  
  adopted: {
    count: number;
    percentage: number;      // / totalUsers
  },
  
  usage: {
    weekly: number,          // % of adopted using this week
    monthly: number,         // % of adopted using this month
  },
  
  timeToAdopt: {
    median: number,          // days from signup
    p75: number,
  },
  
  retention: {
    oneWeek: number,         // % still using after 1 week
    oneMonth: number,
  },
}

// Implementation
const featureAdoption = {
  featureName: 'Advanced Filters',
  totalUsers: 1000,
  
  adopted: {
    count: 350,
    percentage: 35,          // 350/1000
  },
  
  usage: {
    weekly: 0.65,            // 65% of 350 active this week
    monthly: 0.80,           // 80% of 350 active this month
  },
  
  timeToAdopt: {
    median: 14,              // days from signup or feature launch
    p75: 28,
  },
  
  retention: {
    oneWeek: 0.72,
    oneMonth: 0.45,
  },
};

// Interpretation
// Only 35% ever adopted (undermarketed?)
// Of adopters, 65% use weekly (good stickiness)
// Median 14 days to adopt (discovery working)
// Drops after month (feature value retention issue?)
```

## Predictive Analytics

### Churn Prediction

```typescript
// ML model: Predict 30-day churn risk
interface ChurnPrediction {
  userId: string;
  churnRisk: number;        // 0-100, higher = more likely to churn
  riskFactors: Array<{
    factor: string;
    weight: number;         // Importance
    value: any;             // User's current value
  }>;
  interventionSuggestion: string;
}

// Feature engineering for churn model
const churnFeatures = {
  // Recency
  daysSinceLastEvent: 7,
  
  // Frequency
  eventsLastWeek: 5,
  eventsLastMonth: 20,
  
  // Engagement decline
  eventsTrendLastMonth: -0.3,    // 30% decline
  
  // Feature adoption
  featuresUsed: 3,
  coreFeatureUsed: false,
  
  // Support
  supportTickets: 2,
  npsScore: 6,
  
  // Retention pattern
  weeksActive: 8,
  monthsAtRisk: 0,
  
  // Payment
  planType: 'starter',
  monthlyRecurringRevenue: 29,
};

// Prediction: 72% churn risk
// Top factors:
// 1. Inactive 7 days (-50 correlation)
// 2. Event trend declining (-25 correlation)
// 3. Low Core feature use (-15 correlation)

// Intervention: Send re-engagement email about core features
```

### Expansion Prediction

```typescript
// ML model: Predict likely to upgrade
interface ExpansionPrediction {
  userId: string;
  expansionLikelihood: number;   // 0-100
  suggestedUpgradePath: string;  // Which plan to recommend
  timeToFocus: string;           // Now, within month, later
}

// Signals for expansion:
// - Using 5+ features (ready for more)
// - Growing event count (using more)
// - Support tickets on advanced features (wants them)
// - Attempting to use premium feature (blocked)
// - Long session time (power user)
```

## Retention Insights Through Events

### By Event Sequence

```sql
-- Identify event sequences that predict retention
SELECT 
  user_id,
  STRING_AGG(event_type ORDER BY timestamp, '→') AS event_sequence,
  COUNT(*) AS event_count,
  MAX(timestamp) AS last_event_date,
  CASE WHEN MAX(timestamp) >= CURRENT_DATE - 7 THEN true ELSE false END AS retained_7d
FROM events
WHERE DATE(timestamp) BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE
GROUP BY user_id
HAVING COUNT(*) >= 3  -- At least 3 events

-- Find which sequences correlate with retention
SELECT 
  event_sequence,
  COUNT(*) AS user_count,
  SUM(CASE WHEN retained_7d THEN 1 ELSE 0 END) / COUNT(*) AS retention_rate
FROM user_sequences
GROUP BY event_sequence
ORDER BY retention_rate DESC
LIMIT 10;

-- Results show:
-- 'page_viewed→feature_used→feature_used' = 85% retention
-- 'page_viewed→button_clicked' = 45% retention
-- 'page_viewed→page_viewed' = 20% retention
```

### Property-Based Analysis

```sql
-- Retention by user property
SELECT 
  plan_type,
  industry,
  company_size,
  ROUND(100.0 * SUM(CASE WHEN retained THEN 1 ELSE 0 END) / COUNT(*), 1) AS day_7_retention
FROM users
WHERE signup_date >= CURRENT_DATE - 30
GROUP BY plan_type, industry, company_size
ORDER BY day_7_retention DESC;

-- Results:
-- plan_type='pro', industry='saas', size='1-10': 92% retention
-- plan_type='starter', industry='other', size='1-50': 35% retention

-- Action: Focus onboarding on SMB/startup segment
```

## Real-World Dashboards

### Product Manager Dashboard

```
Activation
├─ Trial starts/week: 150
├─ 1-day retention: 65%
├─ 7-day retention: 35%
└─ Conversion to paid: 12%

Feature Usage
├─ Advanced Filters: 45% (↑ 3%)
├─ Team Collaboration: 32% (↑ 2%)
├─ Custom Reporting: 18% (stable)
└─ API Integrations: 8% (↓ 1%)

Churn & Risk
├─ Churned this week: 8 (2 enterprise)
├─ At-risk users: 45
└─ Predicted saved: 12 (via intervention)

Top Friction Points (Funnels)
├─ Profile setup: 65% completion
└─ First feature use: 45% completion
```

### Data Analyst Dashboard

```
Events Ingested
├─ Last 24h: 2.3M events
├─ 30-day trend: +15%
└─ Data quality: 99.2%

User Tracking
├─ Active users (DAU): 5,200
├─ Active users (MAU): 18,400
├─ Cross-device: 340 (6%)

Event Pipeline Health
├─ Latency (p95): 120ms
├─ Errors: 12 events (0.0005%)
└─ Duplicate rate: 0.2%
```

## Implementation Best Practices

### Event Validation

```typescript
// Every event must pass validation
const validateEvent = (event: Event) => {
  const errors = [];
  
  // Required fields
  if (!event.userId) errors.push('Missing userId');
  if (!event.eventType) errors.push('Missing eventType');
  if (!event.timestamp) errors.push('Missing timestamp');
  
  // Data validation
  if (event.userId.length > 100) errors.push('userId too long');
  if (event.eventType.length > 50) errors.push('eventType too long');
  
  // Business logic
  if (event.timestamp > Date.now() + 60000) {
    errors.push('Timestamp in future (>1min)');
  }
  if (event.timestamp < Date.now() - 86400000) {
    errors.push('Timestamp >24h old');
  }
  
  // Revenue validation
  if (event.revenue && event.revenue < 0) {
    errors.push('Revenue cannot be negative');
  }
  if (event.revenue && event.revenue > 100000) {
    errors.push('Revenue suspiciously high');
  }
  
  return errors;
};

// Only send if validation passes
if (validateEvent(event).length === 0) {
  amplitude.logEvent(event);
}
```

### Property Management

```typescript
// User properties (identify)
amplitude.setUserProperties({
  plan_type: 'pro',
  industry: 'saas',
  company_size: 42,
  mrr: 299,
  employee_count: 5,
  tags: ['power_user', 'integrations'],
  created_at: 1704067200000,
});

// Event properties (contextual)
amplitude.logEvent('feature_used', {
  feature_name: 'advanced_filters',
  feature_count: 3,
  time_on_feature: 45,
  filter_combinations: 5,
});
```

### Segmentation Strategy

```
Core dimensions (always filter):
├─ Plan (starter, pro, enterprise)
├─ Segment (SMB, mid-market, enterprise)
├─ Geography (US, EU, APAC, other)
└─ Cohort (acquisition month/week)

Analysis dimensions (for deep dives):
├─ Channel (organic, paid, referral)
├─ Industry (saas, marketing, other)
├─ Feature usage (power users, light users)
└─ Company size (1-10, 11-50, etc.)
```

## Migration from Traditional Analytics

From Google Analytics to event-based:

```
Google Analytics:
├─ Page views aggregated
├─ User journey opaque
├─ Limited retention analysis
└─ Can't track product features

Event-Based (Amplitude):
├─ Every action captured
├─ Complete user sequences visible
├─ Cohort retention automatic
└─ Feature adoption measurable
```

## Implementation Timeline

1. **Week 1**: Enable tracking SDK, basic events
2. **Week 2**: Property taxonomy, user identification
3. **Week 3**: First dashboards (activation, retention)
4. **Week 4**: Feature adoption tracking
5. **Week 5**: Behavioral cohorts
6. **Week 6**: Funnel analysis setup
7. **Week 7**: Predictive models (churn, expansion)
8. **Week 8**: Team training, workflow establishment

## Lessons for Your SaaS

1. **Events > Page views**: Track actions, not pages
2. **User properties matter**: Enrich events with context
3. **Behavioral cohorts > Demographics**: Actions speak louder
4. **Funnel analysis finds friction**: Look for >20% drops
5. **Feature adoption follows S-curve**: Expected pattern
6. **Retention is sequence-dependent**: Some event sequences = higher retention
7. **Predictive models are possible**: Churn/expansion signals clear
8. **Privacy matters**: Respect user data regulations (GDPR, CCPA)

## Amplitude Setup Checklist

- [ ] SDK integration
- [ ] User identification scheme
- [ ] Event taxonomy documented
- [ ] Basic events logging
- [ ] User properties set up
- [ ] Retention dashboard created
- [ ] Feature adoption tracking
- [ ] Funnel analysis templates
- [ ] Behavioral cohorts defined
- [ ] Alerts set up (churn spike, etc.)
- [ ] Team trained on queries
- [ ] Weekly reporting established
