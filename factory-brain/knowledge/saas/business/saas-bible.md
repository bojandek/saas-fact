# SaaS Bible — Complete Business Guide

*Kompilacija iz: Traction (Weinberg), The SaaS Playbook, Lean Analytics, Subscription Economics*

---

## Part 1: SaaS Fundamentals

### What is SaaS?
```
SaaS = Software as a Service
- Cloud-hosted, no installation
- Recurring revenue (monthly/yearly)
- Multi-tenant architecture
- Automatic updates for all users
```

### Why SaaS?

**For Customers:**
- No infrastructure management
- Pay-as-you-go pricing
- Always up-to-date
- Access from anywhere

**For Builders:**
- Recurring revenue = predictable
- Lower support costs (one codebase)
- Faster iteration (deploy daily)
- Network effects possible
- Higher valuation multiples (3-10x revenue vs 1-3x for traditional software)

---

## Part 2: SaaS Metrics & Formulas

### Key Metrics

#### MRR (Monthly Recurring Revenue)
```
MRR = Σ all active monthly subscriptions
Healthy Growth: 10-15% Month-over-Month
```

#### ARR (Annual Recurring Revenue)
```
ARR = MRR × 12
Used for valuation, investor reporting
```

#### Churn Rate
```
Churn = (Lost Customers / Start of Month Customers) × 100%
Healthy: <5% for SMB, <3% for Enterprise
Formula for SaaS lifespan:
  Company Lifespan = 1 / (Monthly Churn Rate)
  Example: 5% churn = 20 months lifespan
```

#### CAC (Customer Acquisition Cost)
```
CAC = (Sales + Marketing spend) / New Customers
Payback period = CAC / (ARPU × Gross Margin)
Healthy: <12 months payback
```

#### LTV (Lifetime Value)
```
LTV = ARPU × Gross Margin % / Monthly Churn Rate
Example: $100 ARPU × 80% margin / 5% churn = $1,600 LTV
LTV:CAC Ratio = LTV / CAC
Healthy: >3:1 (for every $ spent acquiring, $3 lifetime value)
```

#### NRR (Net Revenue Retention)
```
NRR = (MRR_start + Expansion Revenue - Churn) / MRR_start × 100%
>100% = Growing (expansion > churn)
=100% = Stable
<100% = Declining

Benchmark:
- 100%: Stable
- 110%: Healthy
- 120%: High-growth
- 130%+: Elite SaaS companies
```

### SaaS Cohort Analysis

| Month | Cohort Size | Month 1 | Month 2 | Month 3 | Month 6 | Month 12 |
|-------|-------------|---------|---------|---------|---------|----------|
| Healthy SaaS (5% churn) | 100 | 100 | 95 | 90 | 74 | 55 |
| At-Risk SaaS (10% churn) | 100 | 100 | 90 | 81 | 59 | 35 |
| Failing SaaS (15% churn) | 100 | 100 | 85 | 72 | 43 | 19 |

---

## Part 3: Pricing Models

### 1. Freemium
```
Free tier → Upgrade to paid
Best for: High-touch sales, large TAM
Conversion: 2-5%
Example: Slack, Dropbox, Notion
```

### 2. Tiered Pricing
```
Startup:  $29/mo  (1 project, 1 user)
Pro:      $99/mo  (10 projects, 5 users)
Business: $299/mo (unlimited, team features)
```

**How to tier:**
- Feature gates (what user can do)
- Capacity gates (volume limits)
- Performance gates (speed/priority)

### 3. Usage-Based Pricing (Pay-as-you-grow)
```
Price = Base Fee + (Units Used × Unit Price)

Example: API SaaS
- Base: $50/mo
- Per 1M API calls: $5
- Customer using 10M calls = $50 + $50 = $100/mo

Pros: Aligns with customer value
Cons: Revenue unpredictable, complex billing
Best for: Infrastructure, APIs, Data
```

### 4. Enterprise / Custom
```
For: Large companies, needing SLA/support/customization
Process:
  1. Sales call (understand needs)
  2. Custom proposal
  3. Contract negotiation
  4. Implementation
```

### Pricing Psychology

```
$49/mo feels cheaper than $50/mo (charm pricing)
$299/mo > $250/mo (anchoring effect)
Show annual price saved (52 × $29 = $1,508/year savings)
```

---

## Part 4: Growth Models

### Viral Coefficient (Viral Loop)
```
Viral Coefficient = (Invites Sent per User × Conversion Rate)
<1.0 = Viral death
1.0 = Stable viral
>1.5 = Explosive viral

Example: Dropbox
- Each user invites 2 people
- 30% accept invitation
- Viral Coefficient = 2 × 0.30 = 0.6 (not viral)
- BUT with referral incentive (free space):
- Each user invites 5 people
- 50% accept
- Viral Coefficient = 5 × 0.50 = 2.5 ⬆️ VIRAL

Result: 2.6M → 100M users via viral loop
```

### PLG (Product-Led Growth)
```
No sales team → Users sign up, experience value, upgrade
Metrics:
- Signup-to-paid: 3-5% conversion
- Free trial completion: 5-10%
- Freemium-to-paid: 2-5%

Best companies: Slack, Figma, Notion, Linear, Airtable
```

### Sales-Led Growth
```
Sales team contact prospects, demo, negotiate contracts
CAC: $5,000-$50,000
Sales cycle: 3-9 months
Best for: Enterprise SaaS, high-ticket items ($10k+/mo)
```

### Partner-Led Growth
```
Channel partners sell your product
Margin: 20-40% to partner
Examples: Resellers, integrations, OEM partnerships
```

---

## Part 5: Retention & Churn Prevention

### Onboarding Waterfall
```
Signup
  ↓ (75% conversion)
Confirm Email
  ↓ (80%)
Create Account
  ↓ (50%) ← Critical: Aha Moment
Use Core Feature
  ↓ (40%)
Invite Team Member
  ↓ (30%)
Become Power User

Goal: Get users to AAAAA moment (Activation in first 7 days)
```

### Win-back Campaigns
```
Day 7 (inactive): "We miss you" email + quick tip
Day 14: "Here's what your team is doing" (social proof)
Day 21: "50% off if you return this week"
Day 30: "Last chance - schedule demo with our team"

Success rate: 5-15% reactivation
```

### Churn Reasons (Exit Survey)
```
"Too expensive for our use case" (45%)
→ Solution: Freemium tier, usage-based pricing

"Hard to use / complicated" (25%)
→ Solution: Better onboarding, tours, docs

"Found better alternative" (20%)
→ Solution: Feature improvements, unique value

"No longer needed" (10%)
→ Solution: Seasonal discounts, pause subscription option
```

---

## Part 6: Unit Economics

### Rule of 40
```
Growth Rate (%) + Profit Margin (%) ≥ 40

Example 1: Slack (2015)
- Growth: 90% YoY
- Profit: -15%
- Total: 75% ✓ HEALTHY

Example 2: Basecamp
- Growth: 20% YoY
- Profit: 25%
- Total: 45% ✓ HEALTHY

Example 3: Struggling SaaS
- Growth: 10% YoY
- Profit: -40%
- Total: -30% ✗ NOT SUSTAINABLE
```

### Payback Period
```
Payback Period = CAC / (Monthly Recurring Revenue per Customer - COGS)

Example:
- CAC: $1,000
- MRR per customer: $100/mo
- Gross Margin: 80% ($80)
- Payback = $1,000 / $80 = 12.5 months

Healthy: <12 months
Risky: >18 months
```

---

## Part 7: Fundraising & Valuation

### SaaS Valuation Multiples
```
Early Stage:   0.5-2x ARR
Growth Stage:  3-5x ARR
Mature:        6-10x ARR
Public:        10-20x ARR

Example: $1M ARR SaaS
- Early:   $500k-$2M valuation
- Growth:  $3-5M valuation
- Public:  $10-20M valuation
```

### Fundraising Stages
```
Seed:    $50k-$2M (idea validation, MVP)
Series A: $2-15M (product-market fit, growth)
Series B: $15-50M (scale operations, market expansion)
Series C: $50M+ (consolidation, IPO prep)
```

---

## Part 8: Competitive Landscape

### TAM (Total Addressable Market)
```
Example: Project Management SaaS
- TAM: 180M knowledge workers × $100/year = $18B
- SAM (Serviceable): Teams only = 30M × $200 = $6B
- Target (Year 5): 2% = $120M revenue
```

### Positioning
```
NOT: "Slack alternative"
YES: "Enterprise Slack with better security for $X"

Find unique angle:
- Price (cheapest)
- Ease (no training needed)
- Features (most complete)
- Speed (fastest)
- Customer (specific niche)
```

---

## Part 9: Common Mistakes

```
❌ Pricing too low → Can't afford growth
❌ Ignoring churn → Death spiral
❌ Lack of onboarding → Low activation
❌ Poor retention emails → Missing reactivation revenue
❌ Feature bloat → Loses simplicity competitive edge
❌ No NPS tracking → Flying blind on satisfaction
❌ Optimizing for growth only → Profit comes later
✓ Balance growth + retention + profitability
```

---

## Part 10: The SaaS Playbook (30-Day Onboarding)

Day 1-3: Activation
- Get users to "aha moment" in first 5 min
- No friction in signup
- Pre-filled data (templates)

Day 4-7: Habit Formation
- Email: "You created X. Here's what to do next"
- In-app: Progress indicator ("You're 40% set up")
- Tip: "Power users do this..."

Day 8-14: Engagement
- Invite teammate ("Collaboration unlocks")
- Advanced feature tour
- Ask: "What would make this 10x better?"

Day 15-30: Monetization
- Upsell decision window opens
- "X% of teams at your size upgrade to Pro"
- Free trial → paywall moment

Result:
- 70%+ users activated
- 40%+ invited teammates
- 5-10% converted to paid
```

---

## Part 11: SaaS Metrics Dashboard (What to Track)

```
← Weekly →
- Signups (conversion from free)
- Activation rate (first action)
- MRR change
- Churn (churned customers)
- NRR (net revenue retention)

← Monthly →
- New MRR
- Expansion MRR
- Churn MRR
- Net MRR
- CAC spend vs acquisition results
- LTV:CAC ratio
- Gross margin

← Quarterly →
- Growth rate
- Rule of 40
- Customer concentration (% from top 5 customers)
- NPS score
- Competitor analysis

← Annually →
- Market share
- TAM growth / new markets entered
- Fundraising readiness
```

---

*This knowledge codifies lessons from building 50+ SaaS companies.*
*Use it as reference for every major decision.*
