# SaaS Retention & Churn Reduction

## Churn Analysis

### Why Users Leave
1. **Low activation** (never used key features) — 40%
2. **Poor onboarding** (confusion) — 25%
3. **Better alternative** (competitor) — 20%
4. **Price too high** — 10%
5. **Technical issues** — 5%

## Churn Reduction Framework

### 1. Activation Metrics (First 7 Days)
```typescript
interface ActivationMetrics {
  signed_up: number
  completed_profile: number // 80% target
  used_core_feature: number // 70% target
  invited_team_member: number // 40% target
}

const activation_rate = used_core_feature / signed_up
// Target: >70% for healthy SaaS
```

### 2. Early Warning Signals
Monitor for churn risk:
```typescript
interface ChurnRiskSignals {
  days_since_last_login: number // >7 days = risk
  feature_usage_down: boolean // <50% of average
  support_tickets: number // >3 recent
  payment_failures: number // Any retry
}

// Trigger intervention
if (riskScore > 0.7) {
  sendWinbackEmail(user)
  offerDiscount(user)
  scheduleCheckIn(user)
}
```

### 3. Win-back Campaigns
For at-risk users:

**Email Sequence:**
- Day 1: "We miss you" personal message
- Day 3: New features/updates showcase
- Day 5: Special offer (50% off 1 month)
- Day 7: Last chance offer + success stories

**In-app:**
- Engagement prompts
- Feature tutorials
- Limited-time offers

### 4. Reasons to Stay (Stickiness)
- **Network effects** — teammates, integrations
- **Switching costs** — data locked in
- **Habit** — daily usage becomes routine
- **Results** — clear ROI/benefit tracking

## Retention Tactics by Stage

### At-Risk (30-60 days)
- Personal outreach
- ROI report
- Feature tutorial
- Discounted renewal

### Loyal (>6 months)
- Early access to new features
- Case studies (social proof)
- Co-marketing opportunities
- Community involvement

## Onboarding for Retention

```typescript
// Aha-moment framework
interface OnboardingFlow {
  step: 1, // Sign up
  action: createAccount,
  nextIncentive: "Invite teammates"
  
  step: 2, // Import/create data
  action: uploadData,
  nextIncentive: "See your first result"
  
  step: 3, // Use core feature
  action: runAnalysis, // The aha moment
  measurement: "actionable_result"
  
  step: 4, // Invite team
  action: inviteTeammate,
  nextIncentive: "Unlock team features"
}
```

## Pricing Retention
- **Lock-in**: Annual billing = better retention
- **Upgrades path**: Show premium tier value early
- **Failed payments**: Retry logic + communication
- **Downgrades**: Exit survey to understand why

## NRR (Net Revenue Retention)

```
NRR = (MRR_start + Expansion - Churn) / MRR_start

>100% = Growing (expansion > churn)
100% = Stable
<100% = Declining
```

Targets:
- SaaS benchmark: 95-105%
- High-growth: >120%
- Enterprise: >130%

## Metrics Dashboard

```
Churn Rate (MoM):
- < 5% = Healthy
- 5-10% = Monitor
- >10% = Critical

Retention Cohorts:
- Month 1: 85%
- Month 3: 70%
- Month 6: 60%
- Month 12: 50%

CAC Payback:
- < 12 months = Good
- < 6 months = Excellent
```
