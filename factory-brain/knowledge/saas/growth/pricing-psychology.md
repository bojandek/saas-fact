# Pricing Psychology & Value-Based Pricing for SaaS

## Willingness to Pay (WTP) Framework

### Understanding Customer Value Perception
```
Customer WTP Calculation:

WTP = Value Perceived - Price Competitors - Switching Cost Friction
      + Brand Premium + Network Effects + Lock-in Benefits
```

### Value Discovery Methods

#### 1. Van Westendorp Price Sensitivity Meter (PSM)
```typescript
// Four-question framework to determine price range
interface PricingSurvey {
  tooExpensive: number;      // "At what price would you consider this too expensive?"
  tooMuch: number;           // "At what price would you consider it to be poor value?"
  bargain: number;           // "At what price would you consider it a bargain?"
  acceptable: number;        // "At what price would you consider it a good value?"
}

// Optimal price = intersection of "too expensive" and "bargain" curves
// Acceptable range = between "acceptable" and "too much"

// Example: SaaS Dashboard Tool
const pricingSurvey = {
  tooExpensive: 299,   // 10% say too expensive at this point
  tooMuch: 199,        // Cost of switching/alternatives
  bargain: 49,         // "Great deal" point
  acceptable: 79,      // Sweet spot ($79-$149 range optimal)
};
```

#### 2. Conjoint Analysis (Feature-Based Pricing)
```typescript
// Test which features drive WTP
interface FeatureValue {
  feature: string;
  baseWTP: number;      // Baseline willingness
  marginalValue: number; // Additional WTP for this feature
}

const featureValues: FeatureValue[] = [
  { feature: "Real-time Collab", baseWTP: 0, marginalValue: 45 },
  { feature: "Advanced Analytics", baseWTP: 0, marginalValue: 65 },
  { feature: "API Access", baseWTP: 0, marginalValue: 35 },
  { feature: "SSO/SAML", baseWTP: 0, marginalValue: 55 },
  { feature: "Priority Support", baseWTP: 0, marginalValue: 25 },
];

// Example: Customer WTP for Pro tier
// Base ($29) + Real-time Collab ($45) + Analytics ($65) + API ($35)
// = $174 WTP, price at $99 = strong value
```

#### 3. Jobs-to-be-Done (JTBD) Pricing
```typescript
// Price based on economic value created
interface JobMetrics {
  job: string;
  currentCost: number;        // What customer pays now
  timeValue: number;          // Value of time saved
  riskReduction: number;      // Value of reduced risk
  totalEconomicValue: number; // Sum of value drivers
}

// Example: HR Software
const hjob: JobMetrics = {
  job: "Reduce hiring time by 40%",
  currentCost: 5000,          // Manual recruiting costs/month
  timeValue: 3000,            // HR team time savings
  riskReduction: 2000,        // Bad hire prevention value
  totalEconomicValue: 10000,  // Monthly economic value created
};

// Pricing formula: Can capture 15-30% of economic value
// $10,000 * 0.15 = $1,500/month viable price point
// But market competition may dictate lower
```

---

## Price Anchoring & Reference Points

### Anchoring Effect in SaaS
```typescript
// High anchor → Higher perceived value
// Low anchor → Price sensitization

// Example: Pricing page interaction
interface PricingPresentation {
  anchor: number;           // Initial price shown
  reference: number;        // Industry standard
  discount: number;         // Perceived savings
}

// GOOD: High anchor first
"Was $299/month, now $99/month" 
→ Anchor = $299, perceived value = $200 savings

// GOOD: Enterprise anchor
"Enterprise: $2,000+/month" shows possible spending
→ Pro tier $199 seems reasonable investment

// BAD: Just show $99
→ No reference, no perceived value
```

### Charm Pricing & Psychological Pricing
```typescript
// Price point psychology
$99  vs  $100 (Charm pricing: -1 effect is significant)
$99  vs  $95  (Quality/fairness perception differs)
$99  vs  $89  (Too-low perception, doubts quality)

// Optimal ranges for SaaS:
Starter:  $9/$19/$29     (charm prices)
Pro:      $99/$129/$149  (premium perception)
Enterprise: $499+        (ROI-based, not charm)

// Tiered pricing psychology
Free   → converts to trial
↓ (10-20% convert)
$29    → starter
↓ (15-25% upgrade)
$99    → pro
↓ (5-10% upgrade)
$299   → enterprise
↓ (1-2% upgrade)
Custom → large deals
```

---

## Value Communication Strategies

### Value-Based Pricing Messaging
```typescript
// Example: Analytics Platform

// POOR VALUE MESSAGING
"Get 50 metrics for $99/month"
→ Feature-focused, no value context

// GOOD VALUE MESSAGING
"Reduce analysis time from 4 hours to 30 minutes.
Your analyst's time: $50/hour
Time saved: 3.5 hours × $50 = $175/week
Annual value: $9,000"
→ Economics-based, clear ROI

// Implementation
interface PricingTier {
  name: string;
  price: number;
  value_proposition: {
    primary_metric: string;    // Main value
    roi_calculator: number;    // Quick math
    time_saved_hours: number;
    annual_savings: number;
  };
}

const ProTier: PricingTier = {
  name: "Pro",
  price: 99,
  value_proposition: {
    primary_metric: "Analytics in 30 minutes (not 4 hours)",
    roi_calculator: 0.0821,    // Annual cost ÷ annual savings
    time_saved_hours: 182,     // 26 weeks × 7 hours/week
    annual_savings: 9100,      // 182 hours × $50/hour
  },
};
```

### Comparative Value Frame
```typescript
// Show value vs alternatives

"Choose Your Path:
┌─────────────────────┐
│ Build In-House      │
│ 3 months dev: $60k  │
│ 1 year maintenance  │
│ = $5,000/month TCO  │
└─────────────────────┘
         vs
┌─────────────────────┐
│ Pro Tier ($99)      │
│ Ready in 10 min     │
│ 99.9% uptime SLA    │
│ = Savings: $4,901/mo│
└─────────────────────┘"

// Establish value anchor before asking for commitment
```

---

## Pricing Psychology Tactics for SaaS

### 1. The Decoy Effect (Pricing Model Selection)
```typescript
// Three-tier pricing structure
interface Pricing {
  Basic: {
    price: 29,
    users: 1,
    features: ["Basic Reports"],
  },
  Pro: {
    price: 99,      // DECOY: Higher value, attracts uprades
    users: 10,
    features: ["Basic", "Advanced Reports", "Integrations"],
  },
  Enterprise: {
    price: "Custom",
    users: "Unlimited",
    features: ["All Pro", "SSO", "SLA", "Dedicated Support"],
  },
}

// Decoy positioned slightly worse than Pro but better than Basic
// → 80%+ choose Pro (sweet spot)
// → Few choose Basic (looks weak)
// → Few choose Enterprise (expensive)

// By removing Middle tier:
// Basic: 40% choose (cheap)
// Enterprise: 10% choose (expensive)
// Revenue: 40×$29 + 10×$499 = $6,570

// Decoy effect:
// Basic: 10% choose
// Pro: 80% choose ← Decoy effect activates
// Enterprise: 10% choose
// Revenue: 10×$29 + 80×$99 + 10×$499 = $8,900 (+36% revenue!)
```

### 2. Bundle Pricing
```typescript
// Unbundled vs Bundled perception

// UNBUNDLED (feels expensive)
Analytics: $50/month
Integrations: $30/month
Support: $20/month
Total: $100/month

// BUNDLED (feels valuable)
"Complete Pro Suite: $99/month"
→ Perceived as discount
→ Feels more complete
→ Higher perceived value
```

### 3. Social Proof in Pricing
```typescript
// Anchoring with market information
"350,000 teams use Pro tier"
"Recommended by 94% of customers"
"Industry standard pricing"

// Testimonial with pricing context
"As a startup with limited budget, Pro ($99) gave us
enterprise features without enterprise pricing.
ROI was immediate."
— Sarah Chen, Acme Startup

// Usage-based social proof
"Most popular tier" badge on Pro
"Join thousands of businesses..."
```

### 4. Loss Aversion in Annual Pricing
```typescript
// Monthly vs Annual comparison
Monthly: $99/month = $1,188/year
Annual:  $79/month = $948/year
                     ↑
                   "SAVE $240/YEAR"

// Alternative framing:
"$79 is essentially $6.58/day"
"Less than a coffee to power your team"

// Loss aversion effect:
// "Pay $948 now and AVOID $240 loss"
// vs
// "Save $240 on annual plan"
// → First version drives higher annual % conversion
```

---

## Competitive Pricing Psychology

### Price War Dynamics
```typescript
// AVOID: Direct price competition
Competitor: $99
You: $89 (undercut)
Result: Price war → race to bottom → commoditization

// BETTER: Differentiate on value
Competitor: $99 (basic features, OK support)
You: $99 (all features + white-glove support + API)
Result: Better value at same price → market share growth

// BEST: Premium positioning
Competitor: $99 (average tool)
You: $149 (best-in-class + 10x support + unique features)
Result: Market separates → you serve premium segment
```

### Psychological Pricing Ladder
```typescript
// Force customer segmentation
Starter:    $29   (individuals, hobbyists)
Pro:        $99   (small teams, serious users)
Business:   $299  (mid-market)
Enterprise: $999+ (large enterprises, custom)

// Each price point serves different WTP segment
// Prevents cannibalization

// Price elasticity typically follows:
Starter demand:    -1.8 (elastic, price sensitive)
Pro demand:        -1.2 (moderately elastic)
Business demand:   -0.8 (inelastic, low sensitivity)
Enterprise demand: -0.5 (very inelastic, value-based)
```

---

## Advanced Pricing Psychology

### Penetration Pricing (Growth Focus)
```typescript
// Start low, increase over time as value proven
Launch: $29 (attract users, build network effects)
Month 6: $49 (early adopters now loyal)
Month 12: $79 (market established, switching costs high)
Month 24: $99 (market leader, premium positioning)

// Existing customer retention: Honor original price
// New customers: New tier pricing
// Win-win: Loyalty reward + revenue growth
```

### Premium Pricing Psychology
```typescript
// Raise prices to signal quality (counterintuitive)

Low Price ($9): "Must be cheap tool"
Mid Price ($29): "Looks reasonable"
High Price ($99): "Must be premium/powerful"

// Premium tier psychology activation:
- Higher price = higher perceived quality
- Higher price = better support expectations
- Higher price = more committed customers
- Higher price = less churn (already paid premium)
```

### Free Trial Psychology
```typescript
// Optimal trial duration varies by complexity

Simple tool: 7-day trial
  → Easy to evaluate quickly
  → High conversion rate

Complex tool: 14-day trial
  → Needs time to realize value
  → Moderate conversion rate

Enterprise tool: 30-day trial
  → Needs testing at scale
  → Build buying consensus
  → ROI calculations

// Psychological effect:
// Day 1-3: Honeymoon (high intent)
// Day 4-7: Reality check (churn begins)
// Day 8-14: Habit formation (stickier)
// Day 15-30: Integration complete (committed)

// 14-day optimal for most SaaS
// Too short: insufficient habit formation
// Too long: decision fatigue, abandonment
```

---

## A/B Testing Pricing

### Test Framework
```typescript
// Controlled experiment template
interface PricingTest {
  control: string;    // Current pricing
  variant: string;    // New pricing experiment
  metrics: {
    conversion_rate: number;
    revenue_per_user: number;
    customer_ltv: number;
  };
  sample_size: number;
  duration_days: number;
  statistical_significance: number;
}

// Example: Test $99 vs $129 for Pro tier
const test: PricingTest = {
  control: "$99/month",
  variant: "$129/month",
  metrics: {
    conversion_rate: 0, // Track during test
    revenue_per_user: 0,
    customer_ltv: 0,
  },
  sample_size: 5000,
  duration_days: 30,
  statistical_significance: 0.95,
};

// Winner determined by: (Revenue per User × LTV) - Churn Impact
```

---

## SaaS-Specific Pricing Psychology

### Payment Frequency Psychology
```
Annual > Monthly in perception because:
1. Lower effective rate anchors well
2. Commitment = quality signal
3. Switching cost increases
4. Customer LTV predictions improve

Conversion rates typically:
Monthly: 100% (baseline)
Quarterly: 120%
Annual: 180% (heavy discount perception)

But consider CAC:
If CAC = $100 and monthly = $99
→ Break-even Month 2, but low retention hurt
If CAC = $100 and annual = $79
→ Break-even Month 2, but better retention
→ LTV 12-18 months, much higher profitability
```

### Usage-Based Pricing Psychology
```typescript
// Pay-as-you-grow model
// Psychological advantage: No immediate sticker shock
// "Start free, grow together"

interface UsageBasedTier {
  free: {
    limit: "1,000 events/month",
    price: 0,
  },
  growth: {
    limit: "10,000 events/month",
    price: "0.0002 per event", // Appears cheap: $2 for 1k
  },
  scale: {
    limit: "1M+ events/month",
    price: "volume discount", // Anchors high but pro-rata low
  },
}

// Psychology: Customers don't see total cost until locked in
// Leads to higher effective spend than fixed pricing
```

---

## Resources & Case Studies

- [Stripe Pricing Psychology](https://stripe.com/docs/pricing)
- ["Pricing Intelligently" - Reid Hoffman, LinkedIn](https://www.redhoodie.com/pricing)
- [Notion Pricing Strategy](https://notion.so/pricing) - Free → Pro $10 → Team $25
- [Slack Pricing Ladder](https://slack.com/pricing) - Free → Pro $12.50
- [Van Westendorp PSM Guide](https://www.pricingsociety.com/)
- [Conjoint Analysis for SaaS](https://www.surveymonkey.com/mp/conjoint-analysis/)
