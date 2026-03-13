# Product-Led Growth (PLG): Framework & Mechanics

## PLG vs Sales-Led Growth

### Traditional Sales-Led Growth
```
Marketing → Sales Demo → Contract → Onboarding → Usage → Expansion

Characteristics:
✓ High ACV (thousands/month)
✓ Strong CAC justification
✗ Slow sales cycle (3-6 months)
✗ Sales team dependency
✗ Scalability limited by headcount

Examples: Salesforce, Marketo, HubSpot (traditional)
```

### Product-Led Growth (PLG)
```
Product → Self-serve Trial → Free Account → Usage → Monetization → Expansion

Characteristics:
✓ Fast time-to-value (minutes, not days)
✓ Self-serve onboarding
✓ No sales dependency
✓ Scales with engineering (not headcount)
✗ Lower ACV initially
✗ Requires excellent product

Examples: Slack, Figma, Notion, Stripe, Zapier
```

### Hybrid (Common for Modern SaaS)
```
Free Product → PLG for SMB
           ↓ (If customer qualifies)
     Sales-Assisted Expansion
           ↓
    Enterprise Contracts

Example: Slack
- Startup: Freemium → PLG → self-serve upgrade
- SMB: Pro tier → occasionally sales support
- Enterprise: Sales-driven custom deals
```

---

## PLG Framework: Core Elements

### Element 1: Freemium or Free Trial (Frictionless Entry)

```typescript
interface FrictionlessEntry {
  // Option 1: Freemium
  freemium: {
    limit: "Generous but constrained",
    philosophy: "Full product, limited scope",
    examples: {
      slack: "Full features, 10k message history",
      figma: "Full features, 3 files",
      notion: "Full features, unlimited access",
    },
  },

  // Option 2: Free trial
  freeTrial: {
    duration: 14,                    // Days
    philosophy: "Full product, time-limited",
    examples: {
      stripe: "Full access, 30-day trial",
      intercom: "Full access, 14-day trial",
    },
  },

  // Option 3: Freemium + Trial
  hybrid: {
    freemium: "Limited but meaningful",
    trial: "14 days of full product",
    philosophy: "Two conversion chances",
    examples: {
      calendly: "Free with limits, 2-month trial",
    },
  },
}

// Key: User must get value in first session
const frictionTargets = {
  timeToFirstValue: "< 5 minutes",  // See benefit immediately
  setupTime: "< 10 minutes",         // Create account + first action
  aha_moment: "First real usage",    // User completes core job
};
```

### Element 2: Self-Serve Onboarding (No Human Interaction)

```typescript
// PLG onboarding flow
interface PLGOnboardingFlow {
  step1: {
    action: "Signup",
    time: "1 minute",
    friction: "Email, password only",
    // Avoid: Detailed form, company size, industry, etc.
  },
  
  step2: {
    action: "Create workspace",
    time: "1 minute",
    friction: "Name + select role",
  },
  
  step3: {
    action: "Interactive tutorial",
    time: "2 minutes",
    friction: "Show core feature in action",
    // Avoid: Long videos, reading docs
  },
  
  step4: {
    action: "First meaningful action",
    time: "2 minutes",
    friction: "Template or guided action",
    example: "Create first project",
  },
}

// Implementation: Onboarding checklist
export function OnboardingPage({ user }: { user: User }) {
  const [checklist, setChecklist] = useState([
    { id: 'profile', done: false, title: 'Complete profile' },
    { id: 'first_project', done: false, title: 'Create first project' },
    { id: 'invite', done: false, title: 'Invite teammate' },
    { id: 'settings', done: false, title: 'Customize settings' },
  ]);

  // Show progress
  const progress = checklist.filter(item => item.done).length;
  const progressPercent = (progress / checklist.length) * 100;

  return (
    <div>
      <ProgressBar value={progressPercent} />
      
      {/* Only show NEXT immediate step */}
      {checklist.map(item => 
        !item.done && (
          <TaskCard
            key={item.id}
            title={item.title}
            onComplete={() => markComplete(item.id)}
          />
        )
      )}
      
      {/* Celebration when done */}
      {progress === checklist.length && (
        <CelebrationBanner message="Welcome to [Product]!" />
      )}
    </div>
  );
}
```

### Element 3: Aha Moment (Core Value Delivery)

```typescript
// The "aha moment" is when user realizes the product's value
// Different for each product

interface AhaMomentExamples {
  slack: "Message appears instantly in team channel",
  figma: "Realtime design collaboration - see teammate's cursor",
  stripe: "Accept first payment - instant revenue received",
  notion: "Database powers a dashboard - see data in real-time",
  zapier: "First automation runs - see two services talking",
}

// Track aha moment completion
interface AhaMomentTracking {
  product: "Analytics Dashboard",
  aha_moment: "User creates first dashboard",
  
  pre_aha: {
    engagement: "Low (setup phase)",
    retention_d7: 0.15,                // 15% retention
  },
  
  post_aha: {
    engagement: "High (using product daily)",
    retention_d7: 0.75,                // 75% retention
  },
}

// Implementation: Detect and celebrate aha moment
export async function handleDashboardCreated(user: User, dashboard: Dashboard) {
  // Mark user as "aha reached"
  await db.user.update({
    where: { id: user.id },
    data: {
      aha_moment_at: new Date(),
      aha_moment_type: "first_dashboard",
    },
  });

  // Show celebration
  showConfetti(
    `🎉 Dashboard created! Watch your data in real-time`
  );

  // Send email
  await emailService.send({
    to: user.email,
    template: 'aha-moment',
    data: { dashboard },
  });

  // Track in analytics
  analytics.track('aha_moment_reached', {
    userId: user.id,
    type: 'first_dashboard',
    timeToAha: calculateSecondsSinceSignup(user),
  });
}
```

### Element 4: Shareable Value (Network Effects)

```typescript
// Users should want to invite others
interface ShareableValueMechanics {
  slack: {
    value: "Team communication hub",
    sharing: "Invite teammates to workspace",
    effect: "Each invitation creates more value for inviter",
    network: "More users = more valuable channel = more retention",
  },
  
  figma: {
    value: "Real-time collaboration",
    sharing: "Share design file + collaborate live",
    effect: "Can't use figma effectively solo (if team uses it)",
    network: "Becomes essential once team adopts",
  },
  
  stripe: {
    value: "Process payments",
    sharing: "Share webhook integrations",
    effect: "Team members see live transactions",
    network: "Becomes company infrastructure",
  },
}

// Implementation: Viral referral mechanics
export function ShareButton({ resource }: { resource: Document }) {
  const shareUrl = generateShareLink(resource);
  
  const handleClick = async () => {
    // Option 1: Direct slack share
    if (navigator.share) {
      await navigator.share({
        title: resource.title,
        text: "Check out this document",
        url: shareUrl,
      });
    }
    
    // Option 2: Copy link
    copyToClipboard(shareUrl);
    
    // Track share
    analytics.track('resource_shared', {
      resourceId: resource.id,
      resourceType: resource.type,
    });
  };

  return (
    <button onClick={handleClick}>
      Share → Invite teammates
    </button>
  );
}

// Referral incentive (optional)
export async function handleNewUserFromReferral(
  newUser: User,
  referrerUser: User
) {
  // Give referrer bonus
  await db.referral.create({
    data: {
      referrer_id: referrerUser.id,
      referred_id: newUser.id,
      bonus_credits: 50,  // $50 credit
      status: 'pending',
    },
  });

  // When referred user adopts (aha moment), convert to real
  await db.referral.update({
    where: { referred_id: newUser.id },
    data: { status: 'completed' },
  });

  // Give referrer credit
  await creditService.addCredits(referrerUser.id, 50);
}
```

---

## PLG Monetization Strategies

### Monetization Model 1: Low-Touch Self-Serve Upgrade

```typescript
interface SelfServeMonetization {
  // Freemium with smooth upgrade
  freemium: {
    limit: "1 project",
    features: ["Basic tools", "Community support"],
  },

  pro: {
    // Natural upgrade trigger
    triggerEvent: "User tries to create 2nd project",
    message: "Pro plan: unlimited projects - $19/month",
    friction: "Low - one-click upgrade",
    
    features: [
      "Unlimited projects",
      "Advanced tools",
      "Email support",
      "API access",
      "Custom integrations",
    ],
  },
}

// Implementation: Seamless upgrade
export async function handleProjectCreationAttempt(
  user: User,
  projectName: string
) {
  const projectCount = await db.project.count({
    where: { userId: user.id },
  });

  if (projectCount >= 1 && !user.isPro) {
    // Show upgrade prompt
    return showUpgradeModal({
      title: "Unlock unlimited projects",
      description: "Pro plan includes unlimited projects + advanced features",
      price: "19/month",
      ctaText: "Upgrade to Pro",
      onConfirm: async () => {
        // Direct to checkout
        window.location.href = '/checkout?plan=pro';
      },
    });
  }

  // Create project
  return await db.project.create({
    data: { name: projectName, userId: user.id },
  });
}
```

### Monetization Model 2: Expansion Through Usage

```typescript
interface UsageBasedMonetization {
  free: {
    limit: "1,000 monthly events",
    price: 0,
  },
  
  pro: {
    limit: "100,000 monthly events",
    price: 29,
  },
  
  enterprise: {
    limit: "1,000,000+ monthly events",
    price: "custom",
  },
}

// Warning system before hitting limit
export async function trackEventUsage(user: User) {
  const monthlyEvents = await db.event.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: getMonthStart(),
      },
    },
  });

  const limit = getLimit(user.plan);
  const percentUsed = monthlyEvents / limit;

  if (percentUsed > 0.8 && !user.hasSeenWarning) {
    // Send warning email
    await emailService.send({
      to: user.email,
      template: 'usage-warning',
      data: {
        currentUsage: monthlyEvents,
        limit: limit,
        percentUsed: Math.round(percentUsed * 100),
        nextPlan: getNextPlan(user.plan),
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { hasSeenWarning: true },
    });
  }

  if (monthlyEvents >= limit) {
    // Block new usage, show upgrade
    return {
      error: "Usage limit reached",
      message: "Upgrade to Pro for 100x more events",
      upgradeUrl: '/upgrade',
    };
  }
}
```

---

## PLG Metrics & Dashboard

### Core PLG Metrics

```typescript
interface PLGMetrics {
  // Acquisition
  signups: {
    daily: 100,              // Target: 100+ daily
    source: "organic",       // PLG relies on organic
  },

  // Activation
  activation_rate: 0.40,     // 40% reach aha moment
  activation_threshold: "D7: 40% of signups active",

  // Retention
  d7_retention: 0.45,        // Day 7: 45% still using
  d30_retention: 0.25,       // Day 30: 25% still using
  
  // Monetization
  freemium_to_paid_rate: 0.08, // 8% convert to paid
  paid_arpu: 45,             // Average paid user: $45/month

  // Expansion
  nrr: 1.25,                 // 125% NRR (strong expansion)

  // Viral
  viral_coefficient: 1.2,    // Each user brings 1.2 new users
  k_factor: 0.2,             // 20% invite rate × 100% conversion
}

// Healthy PLG benchmark
const healthyPLG = {
  // Ratio: For every 1 person on sales, need 1000 daily signups
  daily_signups: 1000,
  sales_team: 1,

  // Conversion funnel
  signups: 1000,
  activated: 400,            // 40% activation
  trial_conversion: 32,      // 8% of activated convert
  paid_monthly_revenue: 1440, // 32 × $45
  annual_revenue: 17280,
};
```

### Dashboards to Track

```typescript
interface PLGDashboards {
  // Funnel dashboard
  funnel: {
    signups: 1000,
    aha_reached: 400,
    trial_activated: 200,
    purchased: 32,
    
    conversion: {
      signup_to_aha: 0.40,
      aha_to_trial: 0.50,
      trial_to_paid: 0.16,
      overall: 0.032,        // 3.2% of signups → paid
    },
  },

  // Cohort retention
  cohorts: {
    week_1: {
      signups: 1000,
      // Days of active usage
      d1: 0.60,              // 60% day 1
      d7: 0.35,              // 35% day 7
      d30: 0.12,             // 12% day 30
      d60: 0.05,             // 5% day 60
      d90: 0.03,             // 3% day 90
    },
  },

  // Engagement (for active users)
  engagement: {
    avg_daily_sessions: 3,
    avg_session_duration: 12,    // minutes
    features_used: 6,            // out of 20 total
  },

  // Monetization
  monetization: {
    free_users: 8000,
    paid_users: 300,
    arpu: 45,
    mrr: 13500,
    frr: 0,                      // Freemium retention rate
  },
}
```

---

## PLG Execution Roadmap

### Month 1-2: Foundation
```
✓ Build freemium tier (generous, no artificial limits)
✓ Self-serve onboarding (< 3 minutes to first value)
✓ Aha moment identification (what's "AH HA!")
✓ Usage analytics (track user journey)
✓ Email automation (welcome, aha, activation)
```

### Month 3-4: Optimize Conversion
```
✓ A/B test onboarding flows
✓ Identify and optimize aha moment
✓ Implement usage-based upgrade prompts
✓ Add referral/sharing mechanics
✓ Measure activation and retention
```

### Month 5-6: Scale Acquisition
```
✓ SEO optimization (own organic keywords)
✓ Content marketing (product blogs, guides)
✓ Product-driven virality (sharing, templates)
✓ Community building (Discord, Slack, forums)
✓ Paid performance marketing (if organic saturates)
```

### Month 7-12: Monetization
```
✓ Add paid tier with clear value
✓ Implement smooth upgrade flow
✓ Optimize pricing (A/B test, pricing ladder)
✓ Add expansion/upsell mechanics
✓ Establish sales motion for enterprises
```

---

## PLG Red Flags

###Mistakes to Avoid

```typescript
// ❌ MISTAKE 1: Free tier too limited
free: {
  feature_access: 20,        // Can only access 20 features
  storage: "1GB",            // Too restrictive
  result: "No aha moment"
}

// ✅ CORRECT: Free tier makes product work
free: {
  feature_access: "all",     // Full features
  storage: "unlimited",      // Unlimited
  friction: "limited_to_1_project", // Different constraint
  result: "User gets value, hits natural upgrade point"
}

// ❌ MISTAKE 2: Forcing signup before trying
flow: "Marketing page → Signup required → Trial"
result: "High friction, low activation"

// ✅ CORRECT: Product first, then monetization
flow: "Marketing page → Try for free → Signup for progress → Trial"
result: "Low friction, high activation"

// ❌ MISTAKE 3: Poor onboarding
onboarding: {
  steps: 15,
  forms: 10,
  time: 45,  // minutes!
  videos: 5,
  result: "95% drop-off"
}

// ✅ CORRECT: Guided product discovery
onboarding: {
  steps: 3,
  forms: 0,
  time: 3,   // minutes
  aha_moment: "Happens in flow"
  result: "40% activation"
}

// ❌ MISTAKE 4: No clear monetization path
free: { features: "ALL" }
paid: { features: "same?" }
result: "No reason to upgrade"

// ✅ CORRECT: Clear upgrade trigger
free: { projects: 1 }
paid: { projects: "unlimited" }
result: "Natural upgrade when user needs 2nd project"
```

---

## Famous PLG Companies & Their Mechanics

### Slack
```
Land: Free forever (10k message history)
Activate: Create team, add members, post messages
Aha: "Team can see conversations in real-time"
Expand: Hit history limit → "Upgrade to Pro"
NRR: 125%+
CAC: Near zero (organic)
ARR Growth: 60%+ YoY
```

### Figma
```
Land: 3 free files
Activate: Create design, share with teammate
Aha: "Real-time multiplayer design"
Expand: Hit file limit → "Pro: unlimited files"
NRR: Strong (design system tools drive expansion)
CAC: Organic
Key insight: Figma's multiplayer made it viral
```

### Stripe
```
Land: Full trial (30 days)
Activate: Create account, integrate API
Aha: "Accept first payment - money in account"
Expand: Usage-based (2.9% + 30¢ per charge)
NRR: High (businesses scale, payment volume grows)
Key insight: Revenue tied to business success
```

### Zapier
```
Land: Free tier (100 tasks/month)
Activate: Connect 2 apps, create automation
Aha: "Automation runs - two services talking"
Expand: Hit usage limit → "Pro: 750 tasks/month"
Viral: Users build automations, share with team
NRR: Strong (as business scales, task usage scales)
```

---

## Resources

- [PLG Definition & Framework](https://www.productled.com/)
- [Slack's PLG Strategy](https://slack.com/blog/productivity)
- [Figma's Network Effects](https://www.figma.com/blog/)
- [Stripe's Developer-First Approach](https://stripe.com/docs)
- ["Hacking Growth" - Sean Ellis](https://www.sean-ellis.com/book)
- [PLG Metrics Guide](https://www.saastr.com/product-led-growth/)
