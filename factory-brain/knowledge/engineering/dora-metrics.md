# DORA Metrics: DevOps Performance & Delivery Excellence

## DORA Framework Overview

### The Four Key Metrics
```
DORA (DevOps Research and Assessment) measures deployment performance

1. Deployment Frequency (DF) - How often do we deploy?
2. Lead Time for Changes (LT) - How long from commit to production?
3. Mean Time to Recovery (MTTR) - How quickly do we fix failures?
4. Change Failure Rate (CFR) - What % of deployments cause issues?
```

### Performance Levels

```typescript
interface DORAPerformanceLevel {
  metric: string;
  elite: string;
  high: string;
  medium: string;
  low: string;
}

const doraPerformance: DORAPerformanceLevel[] = [
  {
    metric: "Deployment Frequency",
    elite: "On-demand (multiple/day)",
    high: "Weekly",
    medium: "Monthly",
    low: "Quarterly or less",
  },
  {
    metric: "Lead Time for Changes",
    elite: "< 1 hour",
    high: "1 day - 1 week",
    medium: "1 week - 1 month",
    low: "> 1 month",
  },
  {
    metric: "Mean Time to Recovery",
    elite: "< 1 hour",
    high: "< 1 day",
    medium: "1-7 days",
    low: "> 1 week",
  },
  {
    metric: "Change Failure Rate",
    elite: "< 15%",
    high: "15-45%",
    medium: "46-60%",
    low: "> 60%",
  },
];

// Correlation: Companies in "elite" category are:
// - 3x more productive
// - 2x faster at feature delivery
// - Better retention (lower burnout)
// - Higher profitability
```

---

## Metric 1: Deployment Frequency (DF)

### Definition
Frequency of production deployments, regardless of size.

```
Low performers: Deploy quarterly (4x/year)
Medium performers: Deploy monthly (12x/year)
High performers: Deploy weekly (52x/year)
Elite performers: Deploy multiple times per day (365+/year)

Elite = 52-365x more frequent than low performers!
```

### How to Measure

```typescript
interface DeploymentFrequencyMetric {
  deploy_date: Date;
  deploy_hash: string;      // Git commit hash
  environment: "staging" | "production";
  status: "success" | "failure" | "rollback";
}

// Calculate deployment frequency
export async function calculateDeploymentFrequency(
  timeWindow: "day" | "week" | "month" | "quarter"
) {
  const startDate = getWindowStart(timeWindow);
  const endDate = getWindowEnd(timeWindow);

  const deployments = await db.deployments.count({
    where: {
      environment: "production",
      status: "success",
      deploy_date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const windowSize = calculateWindowSize(timeWindow);
  return deployments / windowSize;
}

// Example: Slack's deployment frequency
export const slackDeploymentMetrics = {
  frequency: "Multiple times per day",
  reasoning: "Microservices architecture, feature flags per service",
  typical: "50-100 deployments/day",
  pipeline: "Automated tests → Staging → Canary → Production",
};
```

### Improving Deployment Frequency

```typescript
// Strategy 1: Feature Flags
// Deploy continuously, control rollout

export const featureFlagSystem = {
  deployment: "Ship code to production daily",
  activation: "Control via feature flag",
  rollout: "Gradually increase percentage",
  
  benefits: [
    "Low risk deployments",
    "Fast iteration",
    "Easy rollback (flip flag)",
    "A/B testing capability",
  ],
};

// Implementation
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rollout_percentage: number;  // 0-100
  user_segments?: string[];    // Specific users
}

export async function isFeatureEnabled(
  featureName: string,
  userId: string
): Promise<boolean> {
  const flag = await db.featureFlags.findUnique({
    where: { name: featureName },
  });

  if (!flag?.enabled) return false;

  // Check rollout percentage
  const userHash = hash(userId + featureName);
  const percentage = userHash % 100;

  return percentage < flag.rollout_percentage;
}

// Usage in code
export async function checkoutPage() {
  const useNewCheckout = await isFeatureEnabled(
    "new-checkout-flow",
    currentUser.id
  );

  if (useNewCheckout) {
    return <NewCheckout />;
  } else {
    return <LegacyCheckout />;
  }
}

// Strategy 2: Canary Deployments
// Deploy to 1% of traffic first, monitor, then 100%

export const canaryDeployment = {
  step1: "Deploy to 1% of servers",
  monitor1: "Wait 5 minutes, watch error rate",
  step2: "Deploy to 10% of servers",
  monitor2: "Wait 5 minutes, watch error rate",
  step3: "Deploy to 50% of servers",
  monitor3: "Wait 5 minutes, watch error rate",
  step4: "Deploy to 100% of servers",
  
  benefits: "Catch issues before full rollout",
  rollback: "If error rate rises, automatic rollback",
};

// Implementation
export async function deployWithCanary(version: string) {
  // Step 1: Deploy to canary (1%)
  await deployServers(version, { percentage: 0.01 });
  await monitorMetrics(5 * 60 * 1000); // 5 minutes

  if (hasUnacceptableErrorRate()) {
    await rollback();
    return;
  }

  // Step 2: Deploy to 10%
  await deployServers(version, { percentage: 0.1 });
  await monitorMetrics(5 * 60 * 1000);

  if (hasUnacceptableErrorRate()) {
    await rollback();
    return;
  }

  // ... continue to 100%
}

// Strategy 3: Database Schema Migrations (Deploy without downtime)
export const zeroDowntimeMigration = {
  step1: "Add new column as nullable",
  deploy1: "Deploy code that ignores new column",
  step2: "Backfill existing data",
  deploy2: "Deploy code that uses new column",
  step3: "Remove old column",
  deploy3: "Deploy without old column reference",
  
  benefit: "Can deploy schema + code changes together",
};
```

---

## Metric 2: Lead Time for Changes (LT)

### Definition
Time between commit and production deployment.

```
Low: > 1 month (bureaucratic process)
Medium: 1-4 weeks (manual reviews, testing)
High: 1-7 days (good process, some manual steps)
Elite: < 1 hour (automated from commit to production)

Key insight: Faster lead time = faster iteration = faster learning
```

### How to Measure

```typescript
interface LeadTimeMetric {
  commit_timestamp: Date;      // When code was committed
  production_deployed: Date;   // When it reached production
  lead_time_minutes: number;
}

export async function calculateLeadTimeForChanges() {
  const deployments = await db.deployments.findMany({
    where: {
      environment: "production",
      status: "success",
    },
    select: {
      commit_timestamp: true,
      production_deployed: true,
    },
  });

  const leadTimes = deployments.map((d) => {
    const leaTime = d.production_deployed.getTime() - d.commit_timestamp.getTime();
    return leadTime / (1000 * 60); // Convert to minutes
  });

  return {
    average: average(leadTimes),
    median: median(leadTimes),
    p95: percentile(leadTimes, 95),
    p99: percentile(leadTimes, 99),
  };
}

// Example: Netflix's lead time
export const netflixLeadTime = {
  average: "< 15 minutes",
  process: [
    "Commit to feature branch",
    "Automated tests run (2 min)",
    "Code review approved (5 min)",
    "Merge to main branch",
    "CI/CD pipeline (3 min)",
    "Auto-deploy staging (1 min)",
    "Manual approval (varies, usually immediate)",
    "Auto-deploy production (1 min)",
  ],
  total: "< 15 minutes",
};
```

### Improving Lead Time for Changes

```typescript
// Component 1: Automated Testing (Fast feedback)
export const improveTestingSpeed = {
  unit_tests: {
    speed: "< 1 second",
    purpose: "Catch logic errors immediately",
    action: "Run on every commit (pre-commit hook)",
  },
  
  integration_tests: {
    speed: "< 10 seconds",
    purpose: "Verify components work together",
    action: "Run in CI/CD pipeline",
  },
  
  e2e_tests: {
    speed: "< 30 seconds",
    purpose: "Verify user flows work",
    action: "Run critical paths only",
  },
  
  performance_tests: {
    speed: "< 60 seconds",
    purpose: "Catch regressions",
    action: "Run on every merge",
  },
}

// Component 2: Branch-based CI/CD
export const branchBasedCICD = {
  step1: "Developer creates feature branch",
  step2: "Push to GitHub",
  step3: "GitHub Actions triggers",
  action1: "Run unit tests (1 min)",
  action2: "Build Docker image (2 min)",
  action3: "Push to staging registry",
  action4: "Deploy to staging (1 min)",
  total: "4 minutes from push to staging",
  
  step4: "Merge to main branch",
  step5: "CI/CD triggers again",
  action5: "Run full test suite (3 min)",
  action6: "Build release Docker image (2 min)",
  action7: "Deploy to production canary (1 min)",
  total: "< 6 minutes from merge to production",
};

// Implementation example
export async function ciCdPipeline(pushEvent: GitPushEvent) {
  if (pushEvent.branch === "feature/*") {
    // Feature branch
    await runUnitTests();
    await buildDockerImage();
    await deployToStaging();
    await runE2ETests();
    await notifySlack("Dev environment ready");
  }

  if (pushEvent.branch === "main") {
    // Main branch (production)
    await runFullTestSuite();
    await buildReleaseImage();
    await deployToCanary();
    await monitorCanaryMetrics(5 * 60 * 1000);
    
    if (isHealthy()) {
      await deployToProduction();
    } else {
      await rollback();
    }
  }
}

// Component 3: Code Review Efficiency
export const efficientCodeReview = {
  // Target: 30 minutes from PR to approval
  
  challenge1: "Finding available reviewer",
  solution1: "Auto-assign CODEOWNERS per file",
  
  challenge2: "Waiting for review",
  solution2: "Incentivize quick review (team culture)",
  
  challenge3: "Large PRs slow to review",
  solution3: "Keep PRs small (< 400 lines of code)",
  
  challenge4: "Bikeshedding on style",
  solution4: "Use automated linting (prettier, eslint)",
  
  benchmark: "GitHub shows Slack's PRs review time: 1-2 hours",
};
```

---

## Metric 3: Mean Time to Recovery (MTTR)

### Definition
Average time to restore service after production failure.

```
Elite: < 1 hour (automated rollback, fast diagnosis)
High: < 1 day (good monitoring, quick team response)
Medium: 1-7 days (manual investigation needed)
Low: > 1 week (poor observability, unclear root cause)
```

### How to Measure

```typescript
interface OutageEvent {
  incident_id: string;
  service: string;
  detected_at: Date;
  severity: "critical" | "major" | "minor";
  root_cause: string;
  resolved_at: Date;
  mttr_minutes: number;
}

export async function calculateMTTR() {
  const incidents = await db.incidents.findMany({
    where: { resolved_at: { not: null } },
  });

  const mttrs = incidents.map((i) => {
    return (i.resolved_at.getTime() - i.detected_at.getTime()) / (1000 * 60);
  });

  return {
    average: average(mttrs),
    critical_mttr: average(
      incidents.filter((i) => i.severity === "critical").map((i) => i.mttr_minutes)
    ),
    major_mttr: average(
      incidents.filter((i) => i.severity === "major").map((i) => i.mttr_minutes)
    ),
  };
}

// Example: Stripe's MTTR
export const stripeOutageResponse = {
  incident: "Payment processing service down",
  timeline: {
    t0: "14:32 - Error spike detected (automated alert)",
    t30sec: "14:32:30 - On-call engineer alerted (Opsgenie)",
    t1m: "14:33 - Root cause found (database connection pool exhausted)",
    t2m: "14:34 - Automatic remediation attempted (connection restart)",
    t3m: "14:35 - Service recovered",
  },
  
  mttr: "3 minutes",
  impact: "< 0.1% of transactions affected",
};
```

### Improving MTTR

```typescript
// Component 1: Monitoring & Alerting
export const monitoringStrategy = {
  application_metrics: [
    "Error rate (alert if > 5%)",
    "Latency p95 (alert if > 1s)",
    "Database connections (alert if > 80%)",
    "Memory usage (alert if > 85%)",
    "API rate limits (alert if approaching)",
  ],
  
  infrastructure_metrics: [
    "CPU usage",
    "Disk space",
    "Network bandwidth",
    "Pod restarts (alert on > 3 in 5 min)",
  ],
  
  business_metrics: [
    "Payment success rate (alert if < 99%)",
    "Checkout completion rate",
    "Active user count",
  ],
};

// Implementation
export async function setupMonitoring() {
  const datadog = new DatadogClient();

  // Error rate monitoring
  await datadog.monitor({
    name: "High error rate",
    query: 'avg:trace.web.request.errors{env:prod}',
    threshold: 0.05, // 5%
    alertCondition: "above",
    action: {
      type: "pagerduty",
      service_id: "payment-processing",
    },
  });

  // Latency monitoring
  await datadog.monitor({
    name: "High latency p95",
    query: 'p95:trace.web.request.duration{env:prod}',
    threshold: 1000, // 1 second in ms
    alertCondition: "above",
  });
}

// Component 2: Automatic Rollback
export const automaticRollback = {
  trigger: "If error rate increases > 50% after deployment",
  
  process: [
    "Detect anomaly in metrics",
    "Compare to baseline (pre-deployment)",
    "Automatically trigger rollback if delta > 50%",
    "Switch load balancer to previous version",
    "Verify service restored",
    "Notify team in Slack",
  ],
  
  timeline: "< 2 minutes from detection to recovery",
};

// Implementation
export async function deployWithAutoRollback(version: string) {
  const baseline = await getMetricsBaseline();
  
  await deploy(version);
  
  // Monitor for 10 minutes
  for (let i = 0; i < 10; i++) {
    await sleep(60_000); // 1 minute
    
    const current = await getLatestMetrics();
    const errorDelta = (current.error_rate - baseline.error_rate) / baseline.error_rate;
    
    if (errorDelta > 0.5) {
      // Error rate increased > 50%
      console.log("🚨 Error rate spiked, rolling back");
      await rollback(baseline.version);
      return;
    }
  }
  
  console.log("✓ Deployment successful, no issues detected");
}

// Component 3: Incident Response Playbooks
export async function handlePaymentServiceOutage() {
  // Immediately documented runbook
  const playbook = {
    title: "Payment Service Outage",
    severity: "critical",
    actions: [
      {
        step: 1,
        action: "Acknowledge alert in PagerDuty",
        owner: "On-call engineer",
        time: "T+0",
      },
      {
        step: 2,
        action: "Check Datadog dashboard (payment-service-critical)",
        owner: "On-call engineer",
        time: "T+30sec",
      },
      {
        step: 3,
        action: "If canary shows errors, manual rollback",
        owner: "On-call engineer",
        time: "T+1min",
      },
      {
        step: 4,
        action: "Page senior engineer if issue persists",
        owner: "On-call engineer",
        time: "T+2min",
      },
      {
        step: 5,
        action: "Post update to #payments-incidents",
        owner: "Whoever is coordinating",
        frequency: "Every 2 minutes until resolved",
      },
    ],
    
    // Post-incident
    postIncident: {
      timeline: "Within 1 hour",
      notification: "Email + Slack notification",
      follow_up: "Postmortem within 48 hours",
    },
  };

  return playbook;
}
```

---

## Metric 4: Change Failure Rate (CFR)

### Definition
% of deployments causing issues that require hotfix/rollback.

```
Elite: < 15% (most deployments work fine)
High: 15-45% (reasonable quality)
Medium: 46-60% (need improvement)
Low: > 60% (major quality issues)

Key insight: More frequent deployments should LOWER CFR
(smaller changes = easier to test = fewer bugs)
```

### How to Measure

```typescript
interface DeploymentQualityMetric {
  total_deployments: number;
  deployments_with_issues: number;
  change_failure_rate: number; // percentage
  issues_by_type: {
    bugs: number;           // Logic errors
    performance: number;    // Slowness
    crashes: number;        // Runtime errors
    security: number;       // Security vulnerabilities
  };
}

export async function calculateCFR(timeWindow: string) {
  const deployments = await db.deployments.findMany({
    where: { environment: "production" },
  });

  const issuesWithin1Hour = deployments.filter((d) => {
    const then = d.deploy_date.getTime();
    const now = Date.now();
    return now - then < 60 * 60 * 1000; // Within 1 hour
  });

  const issuesWithin24Hours = deployments.filter((d) => {
    const then = d.deploy_date.getTime();
    const now = Date.now();
    return (
      now - then < 24 * 60 * 60 * 1000 &&
      d.required_rollback === true
    );
  });

  return {
    cfr_1h: issuesWithin1Hour.length / deployments.length,
    cfr_24h: issuesWithin24Hours.length / deployments.length,
  };
}

// Example: Google's CFR
export const googleDeploymentQuality = {
  total_weekly_deployments: 1200,
  deployments_with_issues: 100, // 8.3% CFR
  
  issues: {
    bugs_caught_by_tests: 50,      // Prevented by testing
    performance_issues: 20,
    edge_case_bugs: 20,
    security_issues: 5,
    user_reported: 5,
  },
  
  metrics: {
    recovery_time: "< 10 minutes",
    rollback_automated: true,
  },
};
```

### Improving Change Failure Rate

```typescript
// Strategy 1: Testing Pyramid
export const testingPyramid = {
  // Base: Many fast unit tests
  unitTests: {
    count: 5000,
    speed: "< 1 second total",
    coverage: "90%+ of code",
  },
  
  // Middle: Integration tests
  integrationTests: {
    count: 500,
    speed: "< 10 seconds total",
    coverage: "Key workflows",
  },
  
  // Top: E2E tests (minimal)
  e2eTests: {
    count: 50,
    speed: "< 5 minutes total",
    coverage: "Critical user paths only",
  },
  
  inverted_pyramid_anti_pattern: {
    warning: "Lots of slow E2E tests, few unit tests",
    problem: "Tests run slowly, developers skip running them",
    result: "Bugs catch in production",
  },
};

// Strategy 2: Staged Rollout
export const stagedRollout = {
  step1: "Internal team (0.1% traffic)",
  verify1: "Run for 1 hour, check metrics",
  
  step2: "Early adopters (1% traffic)",
  verify2: "Run for 1 hour, check metrics",
  
  step3: "Half of users (50% traffic)",
  verify3: "Run for 1 hour, check metrics",
  
  step4: "All users (100% traffic)",
  
  benefit: "Catch issues early with minimal user impact",
};

// Strategy 3: Feature Flags & Toggles
export const featureFlagTesting = {
  development: "Flag disabled by default",
  staging: "Flag enabled for testing",
  canary: "Flag enabled for 1% of prod users",
  general: "Flag rolled out to 100%",
  
  advantage: "Easy rollback (just flip a flag)",
  downside: "Need to maintain flag logic",
};

// Implementation
export async function releaseWithFeatureFlag(
  featureName: string,
  percentage: number
) {
  // Deploy code with feature flag OFF
  await deploy(version);

  // Monitor for 30 minutes
  await sleep(30 * 60 * 1000);

  // Gradually roll out
  for (let p of [0.01, 0.05, 0.1, 0.5, 1.0]) {
    await db.featureFlags.update({
      where: { name: featureName },
      data: { rollout_percentage: p * 100 },
    });

    await sleep(10 * 60 * 1000); // 10 minutes between increases
    
    const metrics = await getMetrics();
    if (metrics.error_rate_delta > 0.2) {
      // Error rate increased > 20%
      await db.featureFlags.update({
        where: { name: featureName },
        data: { rollout_percentage: 0 }, // Disable
      });
      return;
    }
  }
}

// Strategy 4: Synthetic Monitoring
export const syntheticMonitoring = {
  purpose: "Catch issues before users do",
  
  tests: [
    { interval: "1 minute", test: "Can API respond?" },
    { interval: "5 minutes", test: "Can user sign up?" },
    { interval: "5 minutes", test: "Can user make payment?" },
    { interval: "10 minutes", test: "Can user export data?" },
  ],
  
  advantage: "Immediate detection of broken features",
};
```

---

## DORA in Practice: Implementation Roadmap

### Month 1: Establish Baseline
```
✓ Measure current deployment frequency
✓ Measure current lead time
✓ Measure current MTTR
✓ Measure current CFR
→ Identify bottlenecks
```

### Month 2-3: Optimize Lead Time
```
✓ Set up automated testing (unit tests first)
✓ Implement CI/CD pipeline
✓ Enable branch-based deployments
✓ Add code review automation (linting, type checking)
→ Target: Lead time < 1 day
```

### Month 4-5: Increase Deployment Frequency
```
✓ Implement feature flags
✓ Set up canary deployments
✓ Automate deployments
✓ Train team on deploy process
→ Target: Deploy weekly → multiple per day
```

### Month 6+: Optimize MTTR & CFR
```
✓ Set up monitoring and alerting
✓ Implement automatic rollback
✓ Create incident playbooks
✓ Improve testing coverage
→ Target: MTTR < 1 hour, CFR < 15%
```

---

## Resources

- [DORA State of DevOps Report](https://www.devops-research.com/)
- [Google Cloud DORA Metrics](https://cloud.google.com/blog/products/devops-sre/dora-metrics)
- [Four Keys](https://github.com/GoogleCloudPlatform/fourkeys) (DORA implementation)
- [Accelerate by Nicole Forsgren](https://nicoleforsgren.com/accelerate/)
- [DevOps Handbook](https://itrevolution.com/product/the-devops-handbook/) (Gene Kim)
