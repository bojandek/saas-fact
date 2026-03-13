# Metrics Framework: Shreyas Doshi - What to Measure When

## Overview
Shreyas Doshi, former Head of Product at Stripe, systemized how companies should think about which metrics matter at what stage of growth. His framework prevents metric paralysis while ensuring alignment.

Key principle: **Different stages require different metrics**. Measuring wrong things wastes energy.

## The 6 Stages of Metrics

### Stage 1: Problem-Solution Fit (Early Validation)

**Goal**: Does anyone want this?

**Metrics to Track**:
```
Primary Metric:
├─ User Interview Signal (qualitative)
│  "Would you pay for this?" (Yes/No)
│  "How frustrated are you without this?" (1-10 scale)
│  "What would you pay?" ($ amount)
│
├─ Activation Rate (first use)
│  "% who complete first core action"
│  (e.g., "% who create first project")
│
└─ Retention (basic)
   "% who return after first use"
   (e.g., Day 1, Day 7)

Don't track yet:
✗ Revenue (too early, meaningless)
✗ Customer acquisition cost
✗ Daily active users (sample too small)
✗ Geographic breakdown
✗ Feature-specific metrics
```

**Success Criteria**:
```
✓ 50%+ say "extremely frustrated" without product
✓ 30%+ actually try the product (you sold them well)
✓ 10%+ return (product has stickiness)
✓ 5+ users willing to pay (enough for small cohort)
```

**Decision Point**:
If no, pivot or kill. If yes → Move to Stage 2.

### Stage 2: Product-Market Fit (Growth Validation)

**Goal**: Can we keep growing by getting more of the same users?

**Metrics to Track**:
```
Primary Metric (Choose ONE):
├─ Monthly Recurring Revenue (MRR) - for B2B SaaS
├─ Monthly Active Users - for PLG/freemium
├─ Weekly Active Users - for engagement-heavy products
└─ Monthly Bookings - for marketplaces

Supporting Metrics:
├─ Growth rate (% MoM) - should be 10%+ for high growth
├─ Churn rate (% MoM) - should be <5% to maintain growth
├─ Conversion rate (free → paid) - target: 2-5%
└─ Unit economics - should be positive in small cohort

Retention by Cohort:
├─ Week 1 retention: 40%+
├─ Month 1 retention: 15%+
├─ Month 3 retention: 8%+

Don't overtrack:
✗ Net Promoter Score (meaningless at this stage)
✗ Customer satisfaction (keep simple: "would you recommend?")
✗ Feature adoption (not yet mature enough)
```

**Success Criteria**:
```
✓ MRR growing 10%+ month-over-month
✓ Churn < 5% (net positive growth)
✓ Natural word-of-mouth happening (users refer friends)
✓ Revenue compounding for 3+ months
✓ Cohorts retaining similarly (repeatable pattern)
```

**Decision Point**:
If metrics plateau, you hit PMF ceiling → Optimize pricing, distribution, or product.
If growing, scale → Move to Stage 3.

### Stage 3: Repeatability (Build Efficient Growth Engine)

**Goal**: Can we acquire customers efficiently at scale?

**Metrics to Track**:
```
Primary Metric:
├─ Customer Acquisition Cost (CAC)
│  = Total sales & marketing spend / # new customers
│
└─ CAC Payback Period
   = CAC / (Average monthly profit per customer)
   
Supporting Metrics:
├─ Lifetime Value (LTV)
│  = Average revenue per user * Average customer lifetime
│
├─ LTV:CAC Ratio
│  Target: LTV > 3x CAC
│  (E.g., if CAC=$500, LTV should be $1500+)
│
├─ Sales Qualified Leads (SQLs)
│  = Leads that match ideal customer profile
│
├─ Sales conversion (SQL → Customer)
│  = SQLs closed / Total SQLs
│
├─ Marketing qualified leads (MQLs)
│  = Leads from marketing campaigns
│
└─ Lead source attribution
   = Which channels produce highest LTV customers?

Retention sub-metrics:
├─ Retention by acquisition channel (does source matter?)
├─ Retention by customer segment (who sticks around?)
└─ Churn by cohort (are newer cohorts worse?)
```

**Success Criteria**:
```
✓ CAC payback period < 6 months (ideally 3-4)
✓ LTV:CAC ratio > 3x
✓ Repeatable acquisition channels (>100 customers/month from one channel)
✓ Sales efficiency increasing (lower CAC, same revenue)
✓ Unit economics positive already
```

**Decision Point**:
If LTV:CAC < 3x, improve retention or pricing before scaling.
If healthy, scale spend → Move to Stage 4.

### Stage 4: Scale (Optimize Marginal Performance)

**Goal**: Can we scale without destroying unit economics?

**Metrics to Track**:
```
Primary Metrics:
├─ LTV:CAC ratio (maintain during scale)
├─ Rule of 40 (= Revenue Growth % + Profit Margin %)
│  Target: 40+ (e.g., 30% growth + 10% margin)
│
└─ Magic Number (for B2B)
   = (Current ARR - Previous ARR) / Previous Qtr Sales & Marketing
   Target: > 0.75

Functional metrics (by department):
├─ Sales
│  - Sales quota attainment
│  - Sales cycle length (days to close)
│  - Average deal size (ADR)
│
├─ Marketing
│  - Cost per lead (CPL) by channel
│  - Lead quality score (% that convert)
│  - Marketing qualified opportunities (MQO)
│
├─ Product
│  - Feature adoption (% active users using feature)
│  - Usage growth (session frequency, time on platform)
│  - Expansion revenue (% existing customers increasing spend)
│
└─ Customer Success
   - Customer Health Score (composite: usage, support tickets, expansion potential)
   - NRR (Net Revenue Retention) = (Revenue retention + expansion) / starting revenue
   - Expansion per customer (upsell success)

Cohort analysis:
├─ Retention by acquisition quarter (market saturation?)
├─ Retention by customer segment (is PMF universal?)
└─ LTV by cohort (economics holding constant?)
```

**Success Criteria**:
```
✓ Rule of 40 achieved consistently
✓ LTV:CAC maintains at 3x+ despite 50%+ higher volume
✓ NRR > 100% (existing customers growing fast)
✓ Sales cycle not lengthening significantly
✓ Lead quality holding despite volume increase
```

**Decision Point**:
If metrics degrade at scale → optimize before adding more volume.
If maintaining → Expand to Stage 5.

### Stage 5: Diversification (New Revenue Streams)

**Goal**: Can we grow beyond current market's natural boundaries?

**Metrics to Track**:
```
Core metric (previous still matters):
├─ Rule of 40 for entire company
│
New segment metrics (by division):
├─ Division A
│  - MRR growth rate
│  - Customer churn
│  - CAC vs LTV
│
├─ Division B
│  - Similar metrics independently
│
└─ Cross-segment metrics:
   - % customers buying 2+ products
   - Revenue from multi-product customers
   - Churn reduction from product bundling

Portfolio metrics:
├─ Revenue mix (% from each product)
├─ Concentration risk (is 80% revenue from one product?)
├─ Correlation of churn (do products churn together?)
└─ Platform health (shared infrastructure metrics)
```

**Success Criteria**:
```
✓ Second product revenue > 10% of total
✓ New product LTV:CAC > 3x independently
✓ Bundle discount not destroying economics
✓ Cross-sell CAC lower than new acquisition
```

**Decision Point**:
If new product hurts core metrics → refocus.
If diversification working → Move to Stage 6.

### Stage 6: Maturity & Optimization

**Goal**: Maximize returns while protecting incumbency

**Metrics to Track**:
```
Efficiency metrics:
├─ Op. Efficiency Ratio (OpEx / Revenue)
│  Target: 50-60% (as revenue scales)
│
├─ Gross Margin (Revenue - COGS) / Revenue
│  Target: 70%+ for SaaS
│
├─ CAC Ratio (Sales & Marketing / Revenue)
│  Target: 20-30%
│
└─ Net Income Margin
   Target: 20%+ for healthy SaaS

Market metrics:
├─ Market share (vs competitors)
├─ Customer concentration (is top customer >20% revenue?)
├─ Geographic expansion (new markets penetration)
└─ Industry vertical penetration

Innovation metrics:
├─ Revenue from products <1 year old (keeps growth)
├─ Feature adoption (innovation working?)
└─ New customer cohort willingness to pay

Customer metrics:
├─ NRR (should still be >110% for growth)
├─ Customer lifetime (how long do they stay?)
├─ Support cost per customer (scaling issues?)
└─ Customer effort score (are we getting harder to use?)
```

**Success Criteria**:
```
✓ Op efficiency stable or improving
✓ NRR maintaining despite scale
✓ New products contributing to growth
✓ Market leadership position clear
```

## The Biggest Mistakes

### Mistake 1: Tracking Too Much Too Early
```
✗ Early stage (10 users)
  Tracking: MRR, CAC, LTV, NRR, Churn, 
           Engagement metrics, Feature adoption...
  Problem: All metrics are noise, data too small

✓ Early stage (10 users)
  Tracking: "Would you buy this?" 
           "Did you come back?"
           "What would you pay?"
```

### Mistake 2: Vanity Metrics
```
✗ "We have 10,000 users!"
   (But $0 revenue, 5% return rate)

✓ "We have 500 paid customers,"
   "Growing 15% MoM,"
   "Churn stable at 3%"
```

### Mistake 3: Optimizing Wrong Metric
```
✗ "Maximize MAU" → Acquire cheap users who churn instantly
✓ "Maintain LTV:CAC > 3x" while growing MAU → Sustainable

✗ "Lower CAC" → Buy bottom-of-funnel leads, destroy retention
✓ "Lower CAC while maintaining LTV" → Sustainable
```

### Mistake 4: Not Aligning Team to Metrics
```
✗ CEO: "We need to grow MRR"
  Sales: "Focused on maximizing deal size"
  Product: "Adding premium features for enterprise"
  Marketing: "Getting cheap leads"
  
  Result: Misaligned incentives, conflicting behaviors

✓ Everyone: Growth target is "15% MRR growth while maintaining LTV:CAC > 3x"
  Sales: "Focus mid-market, not enterprise"
  Product: "Improve onboarding to reduce churn"
  Marketing: "Get quality leads, not cheap leads"
```

## Decision Framework

At each stage, ask:

```
Stage 1 (Problem-Solution Fit):
Q: Do people want this?
A: Track interview signals + activation + basic retention
Result: Move to Stage 2 ✓ OR Pivot/Kill ✗

Stage 2 (Product-Market Fit):
Q: Can we keep the users we get?
A: Track MRR/MAU growth + churn + cohort retention
Result: Move to Stage 3 ✓ OR Optimize product/pricing ✗

Stage 3 (Repeatability):
Q: Can we affordably acquire customers?
A: Track CAC + LTV + LTV:CAC ratio
Result: Move to Stage 4 ✓ OR Improve economics ✗

Stage 4 (Scale):
Q: Can we scale without destroying economics?
A: Track Rule of 40 + unit economics by channel
Result: Move to Stage 5 ✓ OR Optimize before scaling ✗

Stage 5 (Diversification):
Q: Can we grow beyond current market?
A: Track new product LTV:CAC + cross-sell metrics
Result: Move to Stage 6 ✓ OR Refocus ✗

Stage 6 (Maturity):
Q: Can we maintain position profitably?
A: Track efficiency + NRR + innovation metrics
Result: Stable/Growing ✓ OR Decline starting ✗
```

## Implementation for Your SaaS

### This Month
- [ ] Determine your current stage honestly
- [ ] Identify 1 primary metric for that stage
- [ ] Track it daily/weekly
- [ ] Set success target for next stage

### Next 3 Months
- [ ] Add 2-3 supporting metrics
- [ ] Build dashboard (not overcomplicated)
- [ ] Align team to primary metric
- [ ] Weekly review of trends

### Next 6 Months
- [ ] Stage progression checkpoint
- [ ] Shift metrics as you advance
- [ ] Remove metrics no longer relevant
- [ ] Add metrics for next stage

## Lessons for Your SaaS

1. **Stage determines metrics**: Different metrics matter at different times
2. **One primary metric**: Too many metrics = paralysis, choose one per stage
3. **LTV:CAC ratio is universal**: If not 3x+, you're not ready to scale
4. **Retention solves everything**: Improving retention is almost always right answer
5. **Cohort analysis reveals truth**: Individual metrics can lie; cohorts rarely do
6. **Optimize locally, measure globally**: Tweak features (local), measure retention (global)
7. **Rule of 40 is destiny**: (Growth % + Margin %) = 40+ for healthy SaaS

## The Progression Cheat Sheet

```
Stage 1: Activation + Retention signals
        ↓
Stage 2: MRR/MAU growth + Churn
        ↓
Stage 3: CAC + LTV + LTV:CAC ratio
        ↓
Stage 4: Rule of 40 + Unit economics
        ↓
Stage 5: New product LTV:CAC + Cross-sell
        ↓
Stage 6: Efficiency + NRR + Innovation
```

If your primary metric is healthy, focus on the metric one stage ahead. Don't skip ahead.
