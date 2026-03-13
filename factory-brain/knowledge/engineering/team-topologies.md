# Team Topologies: Matthew Skelton's Framework for Organizational Efficiency

## Core Concept: Conway's Law

### Conway's Law
```
"Any organization that designs a system (defined broadly)
will produce a design whose structure is a copy of the
organization's communication structure."
- Mel Conway, 1968

Implication for SaaS:
If your organization has 3 teams, your architecture will have 3 main components.
If your organization is siloed, your code will be siloed.
If your organization communicates poorly, your systems will have poor interfaces.

Therefore: Organize teams to shape system architecture correctly!
```

### The Four Team Types (Skelton & Pais)

```typescript
interface FourTeamTypes {
  // Type 1: Stream-Aligned Teams
  streamAligned: {
    definition: "Team organized around feature stream or business capability",
    focus: "End-to-end delivery of features/value",
    examples: [
      "Payments Team (handles all payment features)",
      "Analytics Team (handles all analytics features)",
      "Mobile Team (handles all mobile features)",
    ],

    structure: {
      size: "5-9 people (Amazon 2-pizza team)",
      composition: [
        "Frontend engineer",
        "Backend engineer",
        "QA/Test engineer",
        "Product manager",
        "Designer",
      ],
    },

    advantage: [
      "End-to-end ownership (faster delivery)",
      "Reduced dependencies (fewer handoffs)",
      "Clear responsibility (team knows what they own)",
    ],

    challenge: [
      "Duplicated skills across teams",
      "Code duplication possible",
      "Needs shared platforms/services",
    ],
  },

  // Type 2: Enabling Teams
  enablingTeam: {
    definition: "Team that helps other teams adopt practices/technologies",
    examples: [
      "DevOps Team (help teams deploy faster)",
      "Security Team (help teams follow security practices)",
      "Platform Team (provide shared infrastructure)",
      "Developer Experience Team (improve tooling/CI/CD)",
    ],

    structure: {
      size: "3-8 people",
      composition: [
        "Infrastructure specialist",
        "Security specialist",
        "Developer advocate",
      ],
    },

    mandate: [
      "Help teams become self-sufficient",
      "NOT: Be the bottleneck (every deployment goes through DX team)",
      "Goal: Enable independence",
    ],

    example: `
DevOps/Platform Team enables:
- Payments Team: "Here's Terraform modules for infrastructure"
- Analytics Team: "Here's monitoring/alerting setup"
- Mobile Team: "Here's CI/CD pipeline templates"

Then Payments Team owns their own deployment (not waiting for DevOps)
    `,
  },

  // Type 3: Complicated Subsystem Teams
  complicatedSubsystem: {
    definition: "Team that owns technically complex subsystem",
    examples: [
      "ML/AI Team (building recommendation engine)",
      "Search Team (building search infrastructure)",
      "Payment Processing Team (handling payment logic)",
      "Video Processing Team (video encoding/streaming)",
    ],

    structure: {
      size: "4-10 people",
      composition: [
        "Specialists in the complex domain",
        "May need experts",
      ],
    },

    mandate: [
      "Own the complexity (so other teams don't have to)",
      "Provide clean interface to other teams",
      "Hide complexity behind API",
    ],

    example: `
Payment Processing Team owns:
- Stripe webhook handling
- PCI compliance
- Fraud detection
- Reconciliation logic

Other teams just call: paymentService.chargeCard(...)
(They don't need to understand the complexity)
    `,
  },

  // Type 4: Platform Teams
  platform: {
    definition: "Team that provides internal platform for other teams",
    examples: [
      "Infrastructure & Kubernetes Team",
      "Data Platform Team",
      "API Gateway Team",
      "Authentication/Authorization Team",
    ],

    structure: {
      size: "5-15 people",
      composition: [
        "Infrastructure engineers",
        "Backend engineers",
        "Platform specialists",
      ],
    },

    customerBase: {
      description: "Other internal teams (not external customers)",
      focus: "Maximize developer experience",
      goal: "Reduce cognitive load on stream-aligned teams",
    },

    services: [
      "Infrastructure (compute, storage, networks)",
      "CI/CD pipelines",
      "API gateway",
      "Authentication",
      "Monitoring/logging",
      "Data pipeline",
    ],

    example: `
Data Platform Team provides:
- Data warehouse (Snowflake setup)
- ELT pipelines (dbt templates)
- Data modeling best practices
- Analytics infrastructure

Other teams use: "Just drop your data in S3, we'll ETL it"
    `,
  },
}
```

---

## Team Interaction Modes

### Three Interaction Patterns

```typescript
interface TeamInteractionModes {
  // Mode 1: Collaboration Mode
  collaboration: {
    description: "Two teams working together intensively on shared goal",
    when: "Needed during transitions or new features",
    duration: "Weeks to months",
    example: `
Platform Team + Payments Team:
- Platform Team: "Help us build payment webhook infrastructure"
- Payments Team: "We need realtime payment processing"
- Result: Shared webhook system that both teams own
    `,

    structure: {
      frequency: "Daily standups, regular sync",
      decision_making: "Collaborative",
      ownership: "Shared (until transition complete)",
    },
  },

  // Mode 2: X-as-a-Service Mode
  xAsService: {
    description: "Team A uses Team B's service via API (no interaction)",
    when: "Steady state operation",
    example: `
Payments Team uses Platform Team's infrastructure:
- Platform Team: "Here's the Kubernetes API"
- Payments Team: "We'll use it without talking to you daily"
- Interaction: None (async via tickets/Slack)
    `,

    structure: {
      frequency: "Minimal (only when issues arise)",
      decision_making: "Independent",
      ownership: "Platform Team owns the service",
    },

    benefits: [
      "Reduced dependencies",
      "Faster delivery (don't wait for other team)",
      "Less communication overhead",
    ],
  },

  // Mode 3: Facilitating Mode
  facilitating: {
    description: "Enabling Team helps Stream-Aligned Team adopt practice",
    when: "During capability adoption",
    duration: "Weeks",
    example: `
Platform Team helps Payments Team adopt monitoring:
- Week 1: Platform Team teaches monitoring best practices
- Week 2: Payments Team applies to their service
- Week 3: Payments Team autonomous on monitoring
- Result: Payments Team can now monitor independently
    `,

    structure: {
      frequency: "Regular touchpoints (weekly)",
      teaching: "Active (not just tickets)",
      goal: "Self-sufficiency",
    },
  },

  // Mode 4: None (No Interaction Needed)
  none: {
    description: "Teams work independently (no communication)",
    when: "Well-defined boundaries",
    example: `
Payments Team and Analytics Team:
- Different domains
- Different priorities
- Minimal shared dependencies
- Result: Nearly zero interaction
    `,
  },
}
```

### Interaction Mapping Exercise

```typescript
// Map your organization's team interactions
interface TeamInteractionMap {
  teams: [
    "Stream-Payments",
    "Stream-Analytics",
    "Platform-Infrastructure",
    "Enabling-DevOps",
  ],

  // Matrix: How should teams interact?
  interactions: {
    "Stream-Payments ↔ Platform-Infrastructure": "X-as-a-Service",
    "Stream-Payments ↔ Enabling-DevOps": "Facilitating (initially)",
    "Stream-Analytics ↔ Platform-Infrastructure": "X-as-a-Service",
    "Stream-Payments ↔ Stream-Analytics": "None (independent)",
  },

  // Check: Is this matched to your communication structure?
  question: "Do team communication patterns match interaction modes?",
}

// Example implementation
export function setupTeamInteractions() {
  // Platform-Infrastructure provides formal API
  // Payments Team receives documentation + training
  // DevOps Team facilitates initial setup
  // Then Payments Team operates independently

  return {
    communication: {
      Platform: "Provides API docs, Slack support, office hours",
      Payments: "Self-service, Slack questions, incident handling",
    },
    success: "Payments Team doesn't depend on Platform Team for deployment",
  };
}
```

---

## Organizational Design Patterns for SaaS

### Small SaaS (< 10 people)
```
Everyone: Cross-functional team
├─ Backend engineer
├─ Frontend engineer
├─ DevOps engineer
├─ Product manager
├─ Designer
└─→ All own end-to-end delivery

Communication: Daily standup, Slack
Architecture: Monolith (everything in one app)
```

### Growing SaaS (10-50 people)
```
Stream-Aligned Teams emerge:
├─ Core Product Team (features)
│  ├─ 2-3 backend engineers
│  ├─ 2-3 frontend engineers
│  └─ Product manager
├─ Mobile Team (if applicable)
│  ├─ 2-3 mobile engineers
│  └─ Designer
└─ Platform/Infrastructure Team (enabling)
   ├─ 2-3 DevOps engineers
   └─ 1 backend engineer

Communication: Team standups, cross-team sync 2x/week
Architecture: Modular monolith or light microservices
Interaction: Mostly X-as-a-Service (Platform serves other teams)
```

### Mature SaaS (50+ people)
```
Multiple Stream-Aligned Teams:
├─ Payments Stream Team (5-8 people)
│  ├─ Full stack engineers
│  └─ Product manager
├─ Analytics Stream Team (5-8 people)
├─ Platform/Monitoring Team (enabling, 5-8 people)
├─ Security/Compliance Team (enabling, 3-5 people)
├─ DevOps/Infrastructure Team (platform, 5-8 people)
└─ Developer Experience Team (enabling, 3-5 people)

Communication: Clear API boundaries, asynchronous where possible
Architecture: Microservices or strongly bounded monolith
Interaction: Well-defined via formal interfaces
```

---

## Anti-Patterns to Avoid

```typescript
interface AntiPatterns {
  // Anti-pattern 1: Matrix Organization
  matrixOrg: {
    problem: `
Engineer reports to:
- Tech Lead (technically)
- Product Manager (functionally)

Result: Conflicting priorities, unclear accountability
    `,
    solution: "Clear ownership (engineer reports to one person)",
  },

  // Anti-pattern 2: Siloed Expertise
  siloedExpertise: {
    problem: `
Only one person knows how to deploy
Only one person knows the database schema
Result: Bottleneck, single point of failure
    `,
    solution: "Pair programming, documentation, shared ownership",
  },

  // Anti-pattern 3: All-Knowing Tech Lead
  allKnowingLead: {
    problem: `
Tech lead is bottleneck for all decisions/reviews
Result: Lead overwhelmed, team can't move fast
    `,
    solution: "Distributed decision making (trust team members)",
  },

  // Anti-pattern 4: Permanent Dependencies
  permanentDeps: {
    problem: `
Payments Team always waits for Platform Team
Platform Team always waits for Security Team
Result: Slow delivery, lots of meetings
    `,
    solution: "Make dependencies temporary (X-as-a-Service mode)",
  },

  // Anti-pattern 5: Collaboration Forever
  collaborationForever: {
    problem: `
Three teams collaborate on every feature
Result: Slow, lots of meetings, little progress
    `,
    solution: "Collaboration + Facilitating → X-as-a-Service (end goal)",
  },
}
```

---

## Practical Implementation: SaaS Migration to Team Topologies

### Current State: Waterfall-ish (Anti-pattern)
```
All 15 engineers:
├─ 5 Frontend engineers
├─ 5 Backend engineers
└─ 5 DevOps engineers

Result:
- Frontend: Can't push any feature without Backend approval
- Backend: Waiting on DevOps for every deployment
- DevOps: Bottleneck for infrastructure
- Delivery: Slow (weeks for simple features)
```

### Target State: Team Topologies

```
Stream-Aligned Teams:
├─ Product Team (payments + onboarding)
│  ├─ 2 senior backend engineers
│  ├─ 2 frontend engineers
│  ├─ 1 QA engineer
│  ├─ 1 product manager
│  └─ Delivery goal: Bi-weekly releases
├─ Analytics Team (dashboards + reporting)
│  ├─ 2 backend engineers
│  ├─ 1 frontend engineer
│  └─ Delivery goal: Weekly releases
└─ Growth Team (acquisition + upsell)
   ├─ 1 backend engineer
   ├─ 1 frontend engineer
   └─ Delivery goal: Weekly releases

Platform Teams:
├─ Infrastructure (Kubernetes, databases)
│  ├─ 2 senior DevOps engineers
│  └─ Mandate: "All stream teams self-serve deployments"
└─ Platform/Banking Integrations (complex subsystem)
   ├─ 2 backend engineers
   ├─ 1 security engineer
   └─ Mandate: "Product Team uses API, doesn't manage Stripe"
```

### Migration Steps

```typescript
interface MigrationPlan {
  phase1_Months_1_2: {
    goal: "Form first Stream-Aligned Team",
    actions: [
      "Pick one cross-functional team (payments)",
      "Give them clear ownership (API surface, deployment)",
      "Reduce dependencies (Platform enables, not blocks)",
      "Remove approval gates (team can deploy without permission)",
    ],
    success_metric: "Team deploys weekly without waiting for others",
  },

  phase2_Months_3_4: {
    goal: "Expand Platform Team capabilities",
    actions: [
      "Platform Team provides self-serve deployment",
      "Stream Team doesn't need DevOps approval",
      "Enabling Team (DevOps) shifts from gatekeeper to enabler",
    ],
    success_metric: "Stream Team infrastructure fully self-serve",
  },

  phase3_Months_5_6: {
    goal: "Form second Stream-Aligned Team",
    actions: [
      "Organize Analytics Team same way (cross-functional)",
      "Define clear API boundary between Products/Analytics",
      "Minimize interaction (X-as-a-Service mode)",
    ],
    success_metric: "Two teams deploying independently",
  },

  final_state: {
    deployment_frequency: "All teams deploying weekly",
    time_to_market: "2-4 weeks for new features (vs 2-3 months before)",
    team_ownership: "Each team owns end-to-end delivery",
  },
}
```

---

## Communication Patterns

### Synchronous (Full Presence) vs Asynchronous

```typescript
interface CommunicationPatterns {
  synchronousMeetings: {
    good_for: [
      "Quick decisions (5-10 min)",
      "Brainstorming",
      "Resolving blocking issues",
      "Building relationships",
    ],
    bad_for: [
      "One-way information sharing (use docs instead)",
      "Decisions that need deliberation",
      "Meetings for the sake of meetings",
    ],

    best_practice: "Max 30 min standup, 1 hr planning, everything else async",
  },

  asynchronousFirst: {
    good_for: [
      "Sharing knowledge (Slack threads, docs)",
      "Decision making (can think before responding)",
      "Cross-timezone teams",
      "Recording history (for future reference)",
    ],
    examples: [
      "Design reviews: Post design, wait for feedback (24 hours)",
      "Incident postmortems: Document async, discuss later",
      "Feature requests: Document problem, gather feedback",
    ],

    implementation: `
// Default asynchronous
// Slack message about deployment

// Get response format:
// - Approvals: Emoji react (within 2 hours)
// - Concerns: Reply in thread (within 4 hours)
// - If someone objects: Schedule sync meeting tomorrow

// Result: Async moves forward 80% of cases
    `,
  },

  hybrid: {
    daily: "15 min standup (sync)",
    weekly: "1 hr planning (sync)",
    design_reviews: "Posted async, discuss if issues",
    decisions: "Decided async, escalate if disagreement",
    debugging: "Ad-hoc sync when stuck",
  },
}
```

---

## Resources

- ["Team Topologies" - Matthew Skelton & Manuel Pais](https://teamtopologies.com/)
- [Team Topologies Official Website](https://teamtopologies.com/book)
- [Conway's Law](https://en.wikipedia.org/wiki/Conway%27s_law)
- [Inverse Conway Maneuver](https://www.usenix.org/system/files/dostojevskij2020_sre-summit20.pdf)
- [Spotify Engineering Culture](https://engineering.atspotify.com/) (famous example of squads/tribes)
- [Amazon's 2-Pizza Teams](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/two-pizza-teams.html)
