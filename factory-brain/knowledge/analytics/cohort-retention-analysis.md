# Cohort Retention Analysis: Understanding Your Users Through Time

## The Power of Cohort Analysis

Cohort analysis reveals patterns that aggregate metrics hide. It answers the critical question: **Are newer users staying as long as older users?**

```
Aggregate view (MISLEADING):
├─ 30-day retention: 45%
└─ Looks stable for months...

Cohort view (TRUTH):
├─ Cohort Jan 2024: Day 30 retention = 60%
├─ Cohort Jul 2024: Day 30 retention = 40%
├─ Cohort Jan 2025: Day 30 retention = 25%
└─ Retention deteriorating → Product/market degradation
```

## Fundamental Concepts

### Cohort Definition
A cohort is a group of users that share a characteristic over a defined time period.

```
Acquisition cohort:
├─ Users who signed up in same week/month
├─ Most common for SaaS
└─ Tracks: retention after signup

Behavior cohort:
├─ Users who performed action (first purchase, key feature use)
├─ More precise than acquisition cohort
└─ Tracks: engagement after behavior

Invoice cohort:
├─ Users grouped by first purchase amount
├─ Tracks: LTV difference by initial segment
└─ Reveals: Quality vs volume trade-off

Renewal cohort:
├─ Users grouped by subscription renewal month
├─ Tracks: churn/expansion after renewal
└─ Reveals: Contract value stability
```

### Retention Definition
Percentage of users from cohort that remain active in given period.

```
Day N Retention = (Users active on day N / Initial cohort size) × 100

Example:
├─ Cohort size (Jan 2024): 1000 users signed up
├─ Day 1: 850 active (85% retention)
├─ Day 7: 450 active (45% retention)
├─ Day 30: 270 active (27% retention)
└─ Day 90: 95 active (9.5% retention)
```

## Building Retention Tables

### Standard Format: Weekly Cohorts

```
            Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Week Jan 1   1000    850     450     270      180    95
Week Jan 8   1200    900     520     380      250   120
Week Jan 15   950    680     380     220      140    60
Week Jan 22  1100    750     480     310      190    85
Week Jan 29   880    620     350     220      140    70

Interpretation:
├─ Horizontal: Week 0 = signup week, Week 1 = 1 week later, etc.
├─ Vertical: Different cohorts (signed up on different weeks)
├─ Values: % of initial cohort still active
└─ Trend: Are cohorts diverging? Improving? Degrading?
```

### As Percentages (Easier to Read)

```
            Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Week Jan 1   100%    85%     45%     27%     18%     9%
Week Jan 8   100%    75%     43%     32%     21%    10%
Week Jan 15  100%    72%     40%     23%     15%     6%
Week Jan 22  100%    68%     44%     28%     17%     8%
Week Jan 29  100%    70%     40%     25%     16%     8%

Pattern detection:
├─ Column check: Week 1 retention declining (85% → 70%)
│  → Product onboarding degrading
├─ Row check: Jan 1 cohort better than later ones
│  → Earlier adopters inherently stickier (selection bias)
└─ Corner check: Week 8 cohorts ~8-10%
   → Long-term stickiness stable
```

### SQL Implementation

```sql
-- Create cohort retention table
WITH signed_up_users AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', created_at) AS signup_week,
    created_at
  FROM users
),

user_activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', event_date) AS activity_week
  FROM events
  WHERE event_type IN ('login', 'action_taken', 'post_created')
  GROUP BY user_id, DATE_TRUNC('week', event_date)
),

cohort_size AS (
  SELECT 
    signup_week,
    COUNT(DISTINCT user_id) AS cohort_size
  FROM signed_up_users
  GROUP BY signup_week
),

cohort_with_activity AS (
  SELECT 
    s.signup_week,
    s.user_id,
    DATEDIFF(week, s.signup_week, ua.activity_week) AS weeks_since_signup
  FROM signed_up_users s
  LEFT JOIN user_activity ua ON s.user_id = ua.user_id
)

SELECT 
  c.signup_week,
  c.cohort_size,
  DATEDIFF(week, 0, cwa.weeks_since_signup) AS week_number,
  COUNT(DISTINCT cwa.user_id) AS users_active,
  ROUND(100.0 * COUNT(DISTINCT cwa.user_id) / c.cohort_size, 1) AS retention_pct
FROM cohort_with_activity cwa
JOIN cohort_size c ON cwa.signup_week = c.signup_week
GROUP BY c.signup_week, c.cohort_size, DATEDIFF(week, 0, cwa.weeks_since_signup)
ORDER BY c.signup_week, week_number;
```

## Retention Patterns & What They Mean

### Pattern 1: Cliff (Sharp Drop)

```
     Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Jan   100%    70%     68%     67%     66%     62%
     ↓↓↓↓
     Cliff

Interpretation:
├─ Day 7 (Week 1): 30% churn in first week
├─ Then stabilizes: Small churn after
└─ Root cause candidates:
   ├─ Poor onboarding (users confused)
   ├─ Product doesn't deliver value immediately
   ├─ Wrong audience acquired
   └─ Unclear value proposition

Fix:
├─ Audit onboarding flow (is it obvious how to use?)
├─ Monitor key feature adoption (are users reaching value?)
├─ Survey churners (why did you leave?)
├─ Improve job-to-be-done clarity
```

### Pattern 2: Gradual Decline (No Cliff)

```
     Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Jan   100%    85%     75%     60%     45%     20%
     ↓       ↓       ↓       ↓       ↓       ↓
     Gradual

Interpretation:
├─ No immediate cliff (onboarding OK)
├─ Steady erosion (stickiness issue)
└─ Root cause candidates:
   ├─ Can't build habits (daily retention → low)
   ├─ Value is one-time, not repeatable
   ├─ Competitors pulling users away
   └─ Feature depth lacking

Fix:
├─ Add notifications to drive repeat visits
├─ Improve feature breadth (more reasons to return)
├─ Create daily habit loop (streaks, challenges)
├─ Competitive analysis
```

### Pattern 3: Improving Cohorts

```
     Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Jan   100%    65%     40%     25%     15%      8%
Feb   100%    68%     43%     30%     18%     10%
Mar   100%    72%     48%     35%     22%     12%
Apr   100%    75%     52%     40%     25%     14%
     ↑       ↑       ↑       ↑       ↑       ↑
     Improving

Interpretation:
├─ Recent cohorts stickier than older ones
├─ Newer product iterations better
└─ Opportunities:
   ├─ Improvements working (celebrate!)
   ├─ Continue current direction
   ├─ Announce improvements to old users?
   └─ Revisit churned users
```

### Pattern 4: Flat Retention (Alarming)

```
     Week 0  Week 1  Week 2  Week 3  Week 4  Week 8
Jan   100%    50%     50%     50%     50%     50%
Feb   100%    50%     50%     50%     50%     50%
Mar   100%    50%     50%     50%     50%     50%
     All stable at 50%

Interpretation:
├─ Something external controlling retention
├─ Not improving despite changes
└─ Root cause candidates:
   ├─ Plateau of addressable market reached
   ├─ Cohorts getting lower quality
   ├─ Market saturation
   ├─ Churn controlled by external factor (term limits?)
   └─ Data quality issue (measurement problem)

Action:
├─ Segment cohorts further (by signup channel, geography, etc.)
├─ Check data quality (are all users tracked?)
├─ Analyze why others churn (not why they stay)
```

## Advanced Retention Analysis

### Segmented Retention

By geography:

```
            Week 0  Week 1  Week 2  Week 4  Week 8
US Only      100%    72%     50%     32%     15%
EU Only      100%    68%     42%     24%     8%
Rest World   100%    55%     35%     18%     5%

← US outperforming → Localization issue? Time zone?
```

By acquisition channel:

```
            Week 0  Week 1  Week 2  Week 4  Week 8
Paid Search  100%    78%     55%     38%     20%
Organic      100%    65%     45%     28%     12%
Referral     100%    82%     62%     42%     25%

← Referral > Paid > Organic → Better product-market fit for referral users
```

By user segment:

```
            Week 0  Week 1  Week 2  Week 4  Week 8
SMB (<50)    100%    70%     48%     32%     15%
Mid (50-500) 100%    75%     55%     38%     20%
Enterprise   100%    85%     68%     52%     35%

← Enterprise > Mid > SMB → Use case clarity improves retention
```

### SQL: Segmented Retention

```sql
SELECT 
  signup_week,
  user_segment,     -- SMB, Mid, Enterprise
  cohort_size,
  week_number,
  retention_pct
FROM cohort_retention
WHERE user_segment IS NOT NULL
ORDER BY user_segment, signup_week, week_number;
```

## Churn Analysis (Inverse of Retention)

Understanding who leaves and when:

```sql
-- Churned users cohort analysis
WITH churned_users AS (
  SELECT 
    DATE_TRUNC('week', created_at) AS signup_week,
    DATE_TRUNC('week', last_activity_date) AS churn_week,
    user_id,
    user_segment,
    mrr_at_signup,
    DATEDIFF(week, created_at, last_activity_date) AS weeks_to_churn
  FROM users
  WHERE status = 'churned'
),

churn_distribution AS (
  SELECT 
    signup_week,
    weeks_to_churn,
    COUNT(*) AS churned_users,
    ROUND(100.0 * SUM(mrr_at_signup), 0) AS revenue_lost
  FROM churned_users
  GROUP BY signup_week, weeks_to_churn
  ORDER BY signup_week DESC, weeks_to_churn
)

SELECT * FROM churn_distribution;
```

Results show:
```
If most churn in Week 1 → Onboarding problem
If most churn in Week 4 → Trial period ended (convert issue)
If most churn in Week 13 → Annual review point (value not clear)
If most churn randomly → Product issues deeper
```

## Creating Actionable Retention Reports

### Weekly Dashboard

```
┌─────────────────────────────────────────────┐
│ Retention Overview (Last 8 Weeks)           │
├─────────────────────────────────────────────┤
│                                             │
│ Week 1 Retention: 72% (↑ 2% from last week)│
│ Week 4 Retention: 42% (↓ 1% from last week)│
│ Week 8 Retention: 15% (stable)             │
│                                             │
├─────────────────────────────────────────────┤
│ Cohorts Older Than 8 Weeks                  │
│ Avg retention: 14% (stable)                 │
│ Most common churn point: Week 1             │
│                                             │
├─────────────────────────────────────────────┤
│ By Segment                                  │
│ Enterprise: Week 1 = 85% (good)             │
│ Mid-market: Week 1 = 75% (good)             │
│ SMB: Week 1 = 60% (needs work)              │
│                                             │
├─────────────────────────────────────────────┤
│ Alerts                                      │
│ ⚠ Week 1 retention down 2 points            │
│ ✓ Week 4 retention holding                  │
│ ✗ SMB segment deteriorating                 │
└─────────────────────────────────────────────┘
```

### Root Cause Analysis Template

When retention drops:

```
Step 1: Identify the drop
├─ Is it Week 1? (onboarding)
├─ Is it Week 4? (trial ends)
├─ Is it Week 13? (annual)
└─ Is it random? (product issue)

Step 2: Which cohorts affected?
├─ All cohorts or specific ones?
├─ By segment? (Enterprise OK, SMB bad?)
├─ By channel? (Paid down, organic up?)
└─ By geography? (US OK, EU bad?)

Step 3: Timeline of changes
├─ Did we ship a feature?
├─ Did we change onboarding?
├─ Did we change pricing?
└─ Did we change marketing message?

Step 4: Data validation
├─ Did tracking change?
├─ Did definition of "active" change?
├─ Were there bugs in data pipeline?
└─ Did team apply filtering wrong?

Step 5: User feedback
├─ Survey recent churners
├─ Check support tickets
├─ Analyze in-app events
└─ Review session recordings
```

## Practical Rules of Thumb

### Healthy Retention Targets

By business model:

```
SaaS (per month):
├─ Week 1: 70%+
├─ Month 1: 45%+
├─ Month 3: 25%+
└─ Month 6: 10%+

Freemium (per week):
├─ Week 1: 25%+
├─ Week 4: 10%+
└─ Week 8: 5%+

Marketplace (per month):
├─ Week 1: 60%+
├─ Month 1: 35%+
├─ Month 3: 15%+
└─ Month 6: 5%+

Gaming (per day):
├─ Day 1: 30%+
├─ Day 7: 5%+
└─ Day 30: 2%+
```

### Red Flags

```
🚩 Week 1 retention < 50% → Serious onboarding issue
🚩 Week 4 retention < 20% → Trial conversion problem
🚩 Week 8 retention < 5% → Product not sticky
🚩 Cohorts diverging badly → Product degradation
🚩 All segments declining in sync → Market issue
🚩 Retention perfectly flat → Measurement issue
```

## Implementation Checklist

- [ ] Define "active user" clearly (minimum engagement threshold)
- [ ] Set up cohort table (weekly, monthly, daily options)
- [ ] Create dashboard showing Week 1, 4, 8 retention
- [ ] Add segmentation (channel, segment, geography)
- [ ] Set up alerts for 2+ point drops
- [ ] Weekly review of retention changes
- [ ] Quarterly deep dive on patterns
- [ ] Survey random churned users
- [ ] Track feature adoption by cohort
- [ ] A/B test onboarding changes against control cohorts

## Lessons for Your SaaS

1. **Cohorts reveal what aggregates hide**: Always segment by signup date
2. **Week 1 is make-or-break**: Most churn happens in first week
3. **Different products different targets**: Gaming, SaaS, freemium all different
4. **Retention > Acquisition**: Fixing retention beats acquiring more users
5. **Segmentation is insight**: Dig into by-channel retention differences
6. **Churn patterns reveal problems**: When they leave tells you why
7. **Track improvements over time**: Celebrate if cohorts improve month-over-month

## Template Dashboard SQL

```sql
-- Weekly cohort retention table (ready for BI tool)
SELECT 
  signup_week,
  SUM(CASE WHEN weeks_since = 0 THEN users ELSE 0 END) AS week_0,
  SUM(CASE WHEN weeks_since = 1 THEN users ELSE 0 END) AS week_1,
  SUM(CASE WHEN weeks_since = 2 THEN users ELSE 0 END) AS week_2,
  SUM(CASE WHEN weeks_since = 4 THEN users ELSE 0 END) AS week_4,
  SUM(CASE WHEN weeks_since = 8 THEN users ELSE 0 END) AS week_8
FROM cohort_retention
GROUP BY signup_week
ORDER BY signup_week DESC;
```
