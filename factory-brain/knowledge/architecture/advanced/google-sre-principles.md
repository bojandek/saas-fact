# Google SRE Principles: SLI/SLO/SLA & Error Budgets

## Overview
Google's Site Reliability Engineering book systematized operational excellence. Their framework—SLI, SLO, SLA, and error budgeting—shifted reliability from "hope it works" to "measure and manage it."

Key insight: **You can't improve what you don't measure. SLO makes reliability a product requirement, not an afterthought.**

## Definitions: SLI, SLO, SLA

### SLI: Service Level Indicator

```
SLI = Quantifiable measure of service performance

Examples:
├─ Availability: % of requests that succeed (not 5xx errors)
├─ Latency: % of requests under 500ms
├─ Throughput: % of target requests per second achieved
├─ Correctness: % of results that are correct
├─ Durability: % of data written that's still readable after 1 year
└─ Custom: % of payments processed within 5 seconds

Formula:
SLI = (Good events) / (Total events)

Example: Request latency
├─ Good events: Requests completed in < 500ms
├─ Total events: All requests
├─ SLI: 95% of requests < 500ms
```

### SLO: Service Level Objective

```
SLO = Target for SLI over a time window

"We commit to achieving this level"

Examples:
├─ Availability SLO: 99.9% (3 nines)
│  └─ Downtime acceptable: 43 minutes/month
│
├─ Latency SLO: 99% of requests < 500ms
│  └─ Up to 1% of requests can exceed 500ms
│
├─ Error Rate SLO: <0.1% errors
│  └─ Up to 0.1% of requests can error
│
└─ Multi-window SLO:
   └─ 99.9% availability over 30 days + 99.95% over 365 days
```

### SLA: Service Level Agreement

```
SLA = Contract promise to customers

"If we fail, what happens?"

Examples:
├─ Availability SLA: 99.9% ($X credit if we miss)
├─ Latency SLA: 95% under 1000ms
├─ Support SLA: P1 response within 1 hour
└─ Penalty: $X credit, refund, or termination

Relationship:
SLI (measurement) → SLO (internal target) → SLA (customer promise)

Stripe SLA example:
├─ SLI: Payment processing latency
├─ SLO: 99.95% processed within 2 seconds
├─ SLA: 99.9% ("if we miss, 10% credit on monthly fees")
```

## SLI Selection (What to Measure)

### Four Golden Signals (Google's Framework)

```
Every SLO should include 4 key dimensions:

1. Latency
   ├─ How long requests take to complete
   ├─ Measure: P50, P99, P99.9 (percentiles)
   ├─ Good SLI: 99% under 500ms
   └─ Red flag: Increasing tail latency (P99.9)

2. Traffic / Throughput
   ├─ Requests per second
   ├─ Measure: Absolute or % of theoretical max
   ├─ Good SLI: 100% of required capacity
   └─ Red flag: Can't handle traffic spike

3. Errors
   ├─ % of requests that error
   ├─ Measure: 5xx, timeouts, data errors
   ├─ Good SLI: 99.9% success (0.1% error rate)
   └─ Red flag: Error rate spiking

4. Saturation
   ├─ How close to capacity are we?
   ├─ Measure: CPU, memory, disk, queue depth, connections
   ├─ Good SLI: <70% utilization
   └─ Red flag: >85% utilization (can't handle spikes)
```

### Business-Driven SLIs

```
Different services, different priorities:

Search Service:
├─ SLI 1: Latency (users care about response time)
├─ SLI 2: Availability (search down = bad)
├─ SLI 3: Correctness (wrong results = bad)
└─ SLI 4: Saturation (can handle search volume)

Batch Job:
├─ SLI 1: Success rate (job completes)
├─ SLI 2: Duration (completes within 8 hours)
├─ SLI 3: Lateness (how late is result available?)
└─ SLI 4: Throughput (items processed per hour)

Mobile App:
├─ SLI 1: Crash rate (<0.1%)
├─ SLI 2: Battery drain (< 10% per hour of use)
├─ SLI 3: Data usage (< 100MB for video)
└─ SLI 4: Startup time (< 2 seconds)
```

## Setting SLOs

### Conservative vs Ambitious

```
99.9% (Three nines) = 43 minutes downtime/month
99.95% (Four and a half nines) = 22 minutes downtime/month
99.99% (Four nines) = 4.3 minutes downtime/month
99.999% (Five nines) = 26 seconds downtime/month

Question: How much downtime is acceptable?

Conservative (99.9%):
├─ Realistic for most services
├─ 43 minutes/month is acceptable
├─ Error budget: Use liberally
└─ Typical for user-facing features

Ambitious (99.99%):
├─ High engineering cost
├─ Requires redundancy everywhere
├─ Error budget: Barely exists
└─ Only critical services (payments, auth)
```

### Multi-Window SLOs

```
Not just 30 days, look at multiple windows:

30-day SLO: 99.9% (allows flexibility)
├─ Used for error budgeting
├─ Rolling window
└─ What teams optimize for

365-day SLO: 99.95% (more stringent average)
├─ Prevents: "Let's be down for entire month then perfect next"
├─ Ensures: Consistent reliability
└─ Long-term trend measurement

Quarterly SLO: 99.87% (looser window)
├─ Allows for maintenance windows
├─ Planning/upgrade worst-case accounting
└─ Incident recovery budgeting
```

## Error Budgets (The Innovation)

### Core Concept

```
Error Budget = How much imperfection is allowed?

If SLO is 99.9% availability:
├─ Budget = 100% - 99.9% = 0.1%
├─ Over 30 days = 0.1% × 43200 min = 43 minutes
└─ "We have 43 minutes of downtime to spend in a month"

If SLI tracks success rate 99.9%:
├─ Budget = 0.1% errors
├─ Over 1M requests = 1000 errors acceptable
└─ "We can tolerate 1000 failed requests"
```

### Error Budget as Feature Toggle

```
CRUCIAL: Error budget is currency

If error budget remaining:
├─ Deploy aggressively (faster iteration)
├─ Push risky changes (experiment)
├─ Skip extra testing (move fast)
└─ Ship improvements (invest in velocity)

If error budget exhausted:
├─ Freeze new deployments (stabilize)
├─ Focus on reliability (fix issues)
├─ Testing mandatory (prevent failures)
├─ Minimal risky changes (conservative)

Example Month:
├─ Budget: 43 minutes downtime
├─ Used: 10 minutes (deployment issue)
├─ Remaining: 33 minutes
├─ Decision: Aggressive deploys this week (utilize budget)

Next Month:
├─ Previous month: Used 40 minutes
├─ New budget: 43 minutes
├─ Decision: Conservative month (rebuild budget for next)
```

### Automated Error Budget Monitoring

```typescript
interface ErrorBudgetStatus {
  slo: {
    target: 0.999;        // 99.9%
    window: 'rolling_30d';
  };
  
  current: {
    sli: 0.9989;          // currently 99.89%
    errorBudgetRemaining: 0.0001; // 0.01% left
    minutesRemaining: 4.3; // 4.3 minutes of acceptable downtime
  };
  
  status: 'healthy' | 'warning' | 'critical';
  
  actions: {
    canDeploy: true;      // if budget > 2x minimum
    canRiskyChange: true; // if budget > 4x minimum
    mustStabilize: false; // if budget < 0.5x minimum
  };
}

// Dashboard shows:
// ┌─ Error Budget ────────────┐
// │ SLO: 99.9%                │
// │ Current: 99.89%           │
// │ Budget: 43 min/month      │
// │ Used: 39 min              │
// │ Remaining: 4 min          │
// └───────────────────────────┘
// Status: ⚠️ Low (4 min left)
```

## SLO Composition (Complex Services)

### Combining SLOs

```
Service dependencies:

API Latency SLO: 99% under 500ms
├─ Depends on: Database SLO
├─ Depends on: Cache SLO
├─ Depends on: Search service SLO
└─ Overall: All must succeed

If Database: 99.95% availability
If Cache: 99.5% availability
If Search: 99.9% availability

Combined:
├─ All succeed: 0.9995 × 0.995 × 0.999 = 0.9935 (99.35%)
├─ Less than individual SLOs!
└─ Account for: Distributed system degradation
```

### Dependency Breakdown

```
API SLO 99.9% depends on:

Single server: 99.99%
├─ If one server fails, query goes to another
├─ Probability both fail: 0.0001 × 0.0001 = 0.00000001
└─ Effective: 99.9999%

Cascade failure:
├─ Cache SLO: 99.5%
├─ Database SLO: 99.95%
├─ If cache down: Hit database (increased load)
├─ Database may fail under load
├─ Overall < 99.5%

Set individual SLOs high enough:
├─ API SLO: 99.9%
├─ Set Database SLO: 99.95% (higher margin)
├─ Set Cache SLO: 99.95% (compensate for cascade)
└─ Composed: ~99.85% (acceptable)
```

## SLO Practices

### 1. Start Conservative

```
DON'T:
├─ "We'll do 99.99% (four nines)"
├─ Nobody can measure it accurately
├─ Forces excessive engineering
└─ Team burns out

DO:
├─ "Let's start at 99.5% (rolling 30d)"
├─ Achievable with normal engineering
├─ Build infrastructure incrementally
├─ Move to 99.9% next year
```

### 2. Bake SLOs into Hiring

```
On-call expectations:
├─ "For 99.9% SLO, expect 43 min downtime, so ~1 incident/quarter"
├─ "For 99.95% SLO, expect 22 min downtime, so ~1 incident/half-year"
└─ Helps candidate understand real on-call load

Compensation:
├─ High SLO (99.99%) = Higher on-call pay
├─ Low SLO (99.5%) = Lower on-call pay
└─ Incentives aligned
```

### 3. Alert on SLO Burn Rate

```
Don't alert on individual incidents.
Alert on SLO trajectory.

Burn Rate = How fast are we using error budget?

Example:
├─ SLO: 99.9% (0.1% budget)
├─ Last hour: 0.2% error rate
├─ Burn rate: 200% (using budget 2x faster than allowed)
├─ Alert: "SLO will be missed this month"

Alert thresholds:
├─ >100% burn rate for 1 hour → Alert
├─ >50% burn rate for 6 hours → Alert
├─ >10% burn rate for 24 hours → Alert
└─ Goal: Catch issues early before SLO breached
```

## SLA Negotiation

### Setting SLA Based on SLO

```
SLO: 99.9% (internal goal)
SLA: 99.5% (customer promise)

Gap = 0.4% "safety margin"

Benefit:
├─ Some tolerance for measurement differences
├─ Don't need credits for minor oops
├─ Align with customer expectations
└─ Realistic promises

Example: Stripe
├─ SLO: 99.99% uptime (internal target)
├─ SLA: 99.9% uptime (customer guarantee)
├─ If fail: 10% monthly bill credit
```

### SLA Credit Policy

```
99.9% availability SLA for month:

If uptime 99.9-99.5%: 10% credit
If uptime 99.5-99.0%: 25% credit
If uptime < 99.0%: 50% credit + service extension

Example:
├─ Month target: 630 minutes uptime (excluding 30 min downtime)
├─ Actual: 600 minutes uptime (70 min downtime)
├─ SLA breached: 99.5% achieved
├─ Credit: 25% of monthly bill
```

## SRE Best Practices

### 1. Toil Reduction (Free Up Time)

```
Toil = Operational work (manual, repetitive, tactical)

Example toil:
├─ Manually restarting services
├─ Responding to alerts at 3 AM
├─ Manually scaling servers
├─ Formatting logs by hand
└─ Time: 50% of SRE time

Eliminate toil through:
├─ Automation (auto-restarts)
├─ Monitoring (automatic scaling)
├─ Alerting (interrupt only when necessary)
├─ Runbooks (consistent response)
└─ Goal: <50% toil, >50% on improvements
```

### 2. Strategic Dashboards

```
SRE Dashboard shows:

SLO Status:
├─ Current SLI vs target
├─ Burn rate (% of budget used per hour)
├─ Minutes remaining in month
├─ Trajectory (will we hit SLO?)

Incident Status:
├─ Number of open incidents
├─ Time to resolution (MTTR)
├─ Severity of incidents
└─ On-call engineer

System Health:
├─ Saturation (CPU, memory, disk)
├─ Error rate (by service)
├─ Latency (by percentile)
└─ Pending deployments

One glance: Do I need to do something right now?
```

### 3. Change Management

```
Changes = Biggest cause of outages

Before deploying:
├─ Is error budget available?
├─ Is this canary deployment?
├─ Do we have rollback plan?
├─ Is monitoring in place?
└─ Can we deploy in next window?

Deployment windows:
├─ Business hours (team available)
├─ Low-traffic periods (less impact)
├─ Not Friday evening (no recovery team)
└─ Batched changes (efficiency)
```

## Lessons for Your SaaS

1. **Measure what matters**: SLI should reflect user experience
2. **Conservative SLOs**: Achievable goals, revisit annually
3. **Error budgets**: Currency for deciding when to ship vs stabilize
4. **Multi-window tracking**: Prevent month-long debt accumulation
5. **Blameless incidents**: Learn, don't blame (+ improve SLO practices)
6. **Dependency math**: Composed SLOs < individual SLOs
7. **Burn rate alerts**: Alert on trajectory, not incidents
8. **SLA gap**: Always have gap between SLO and SLA

## Implementation Roadmap

### Week 1: Define SLIs
- [ ] Choose metric for each service (latency, availability, errors)
- [ ] Implement measurement (timestamp events, track outcomes)
- [ ] Dashboard showing real-time SLI

### Week 2: Set SLOs
- [ ] Analyze historical data (what's realistic?)
- [ ] Set conservative targets (99.5% or 99.9%)
- [ ] Document why this level

### Week 3: Error Budget
- [ ] Calculate monthly budget
- [ ] Implement burn rate tracking
- [ ] Create alert on burn rate

### Week 4: Culture
- [ ] Use error budget for deployment decisions
- [ ] Blameless post-mortems
- [ ] Celebrate SLO achievement

### Week 5+: Optimization
- [ ] Review SLOs quarterly
- [ ] Increase SLO if sustainable
- [ ] Add more detailed SLIs
- [ ] Multi-region SLO tracking

## SLI Template

```
Service: [Name]

SLI 1: Availability
├─ Definition: % of requests returning 2xx
├─ Measurement: Count(status=2xx) / Count(all requests)
├─ Target SLO: 99.9%
├─ Alert threshold (burn rate): >100% for 1 hour

SLI 2: Latency
├─ Definition: % of requests completing in <500ms
├─ Measurement: Count(duration<500ms) / Count(all requests)
├─ Target SLO: 99%
├─ Alert threshold: >100% for 1 hour

Monthly review:
├─ Did we hit SLOs?
├─ Error budget used vs remaining?
├─ Any incidents?
├─ Any changes for next month?
```
