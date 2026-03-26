/**
 * Anthropic Knowledge Work Plugins Integration
 * Extracted from https://github.com/anthropics/knowledge-work-plugins
 * These plugins enhance the capabilities of SaaS Factory agents with structured workflows.
 */

export const ENGINEERING_ARCHITECTURE_PLUGIN = `
<anthropic_plugin name="architecture">
Create an Architecture Decision Record (ADR) or evaluate a system design.
Output Format:
# ADR-[number]: [Title]
**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** [Date]
**Deciders:** [Who needs to sign off]
## Context
[What is the situation? What forces are at play?]
## Decision
[What is the change we're proposing?]
## Options Considered
### Option A: [Name]
| Dimension | Assessment |
|-----------|------------|
| Complexity | [Low/Med/High] |
| Cost | [Assessment] |
| Scalability | [Assessment] |
| Team familiarity | [Assessment] |
**Pros:** [List]
**Cons:** [List]
## Trade-off Analysis
[Key trade-offs between options with clear reasoning]
## Consequences
- [What becomes easier]
- [What becomes harder]
- [What we'll need to revisit]
</anthropic_plugin>
`;

export const ENGINEERING_CODE_REVIEW_PLUGIN = `
<anthropic_plugin name="code-review">
Review code changes with a structured lens on security, performance, correctness, and maintainability.
Review Dimensions:
- Security: SQL injection, XSS, CSRF, Auth flaws, Secrets in code
- Performance: N+1 queries, Memory allocations, Algorithmic complexity
- Correctness: Edge cases, Race conditions, Error handling
- Maintainability: Naming clarity, Single responsibility, Duplication
Output Format:
## Code Review
### Summary
[1-2 sentence overview]
### Critical Issues
| # | File | Line | Issue | Severity |
### Suggestions
| # | File | Line | Suggestion | Category |
### What Looks Good
- [Positive observations]
</anthropic_plugin>
`;

export const ENGINEERING_TESTING_STRATEGY_PLUGIN = `
<anthropic_plugin name="testing-strategy">
Design effective testing strategies balancing coverage, speed, and maintenance.
Strategy by Component Type:
- API endpoints: Unit tests for business logic, integration tests for HTTP layer
- Data pipelines: Input validation, transformation correctness
- Frontend: Component tests, interaction tests, visual regression, accessibility
- Infrastructure: Smoke tests, load tests
Output: Produce a test plan with what to test, test type for each area, coverage targets, and example test cases.
</anthropic_plugin>
`;

export const PRODUCT_SPRINT_PLANNING_PLUGIN = `
<anthropic_plugin name="sprint-planning">
Plan a sprint by scoping work, estimating capacity, and setting clear goals.
Output Format:
## Sprint Plan: [Sprint Name]
**Sprint Goal:** [One clear sentence about what success looks like]
### Sprint Backlog
| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | [Must ship] | [X] pts | [Person] | [None / Blocked by X] |
### Definition of Done
- [ ] Code reviewed and merged
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Product sign-off
</anthropic_plugin>
`;

export const LEGAL_COMPLIANCE_CHECK_PLUGIN = `
<anthropic_plugin name="compliance-check">
Review plans, features, or campaigns for regulatory and compliance risks.
Check against:
- GDPR/CCPA (Data privacy, consent, right to deletion)
- SOC2/ISO27001 (Security controls, access management)
- Industry specific (HIPAA, PCI-DSS)
Output Format:
## Compliance Review
### Executive Summary
[Bottom line: Proceed, Proceed with changes, or Blocked]
### Findings
| Severity | Issue | Regulation | Recommendation |
|----------|-------|------------|----------------|
| 🔴 High | [Issue] | [e.g. GDPR] | [How to fix] |
</anthropic_plugin>
`;

export const MARKETING_SEO_AUDIT_PLUGIN = `
<anthropic_plugin name="seo-audit">
Audit a website's SEO health, research keyword opportunities, identify content gaps.
Process:
1. Keyword Research: Primary/secondary keywords, search volume signals, intent classification.
2. On-Page SEO Audit: Title tags, Meta descriptions, H1 tags, Keyword usage, Internal linking.
3. Content Gap Analysis: Competitor topic coverage, Content freshness.
Output: Prioritized action plan split into quick wins and strategic investments.
</anthropic_plugin>
`;

export const SALES_COMPETITIVE_INTELLIGENCE_PLUGIN = `
<anthropic_plugin name="competitive-intelligence">
Generate a competitive battlecard to help sales win against specific competitors.
Data Structure Per Competitor:
- Profile: target market, pricing model, market position
- What they sell & Their positioning
- Where they win & Where you win
- Pricing: model, entry price, hidden costs
- Talk tracks: early mention, displacement, late addition
- Objections & Landmines (Questions that expose their weakness)
</anthropic_plugin>
`;
