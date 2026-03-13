# Supply Chain & Third-Party Risk Management

## Third-Party Risk Assessment

### Categories of Third Parties

```typescript
interface ThirdPartyCategories {
  // Critical: Core business functionality
  critical: {
    examples: ["Cloud provider (AWS)", "Database (PostgreSQL)", "Payment processor (Stripe)"],
    assessment: "Comprehensive (SOC 2, security audit)",
    frequency: "Annual + incident triggered",
  },

  // High: Important but replaceable
  high: {
    examples: ["Email service (SendGrid)", "API monitoring (DataDog)", "CDN (Cloudflare)"],
    assessment: "Standard (questionnaire, public docs)",
    frequency: "Annual",
  },

  // Medium: Supporting services
  medium: {
    examples: ["Analytics (Google Analytics)", "Communication (Slack)", "Design tools (Figma)"],
    assessment: "Lightweight (public security docs)",
    frequency: "On-demand",
  },

  // Low: Non-critical
  low: {
    examples: ["Stock image library", "Font service", "Documentation hosting"],
    assessment: "None required",
    frequency: "N/A",
  },
}
```

### Risk Assessment Framework (CVSS)

```typescript
interface VendorAssessment {
  // Score: 0-10 (0 = no risk, 10 = critical risk)
  
  assessment_areas: {
    security_maturity: {
      factors: [
        "Security certifications (ISO 27001, SOC 2)",
        "Dedicated security team",
        "Incident response process",
        "Penetration testing",
      ],
      weight: 0.3,
    },

    financial_stability: {
      factors: [
        "Company age and revenue",
        "Funding status",
        "Market position",
      ],
      weight: 0.2,
    },

    operational_risk: {
      factors: [
        "Single point of failure (backup vendor?)",
        "Geographic concentration (data residency)",
        "Dependency on other vendors",
      ],
      weight: 0.3,
    },

    contractual_terms: {
      factors: [
        "SLA/uptime guarantee",
        "Liability caps",
        "Audit rights",
        "Data ownership",
      ],
      weight: 0.2,
    },
  },

  // Scoring example
  example_aws: {
    security_maturity: 9,  // Industry leader
    financial_stability: 10, // Amazon backing
    operational_risk: 8,   // Multi-region, but single vendor
    contractual_terms: 7,  // Standard AWS T&Cs
    
    final_score: (9 * 0.3 + 10 * 0.2 + 8 * 0.3 + 7 * 0.2) / 1,
    result: 8.5,
  },
}
```

### Security Questionnaire

```typescript
interface SecurityQuestionnaire {
  // Standard questionnaire sent to vendors
  // Usually based on SIG (Shared Assessments)
  
  questions: [
    // Security Program
    "Do you have an information security policy?",
    "Do you have a dedicated CISO or security officer?",
    "How often are security trainings conducted?",

    // Access Control
    "How do you manage user access?",
    "Do you use MFA for all employees?",
    "How quickly can you revoke access for terminated employees?",

    // Data Protection
    "What encryption do you use (at rest, in transit)?",
    "Where is data stored geographically?",
    "Can you delete data on request?",

    // Incident Response
    "Do you have an incident response plan?",
    "How will you notify us of a breach?",
    "What is your average breach notification time?",

    // Compliance
    "What certifications do you have (ISO 27001, SOC 2)?",
    "Are you subject to data residency laws?",
    "Do you conduct penetration testing?",

    // Subcontractors
    "Do you use subcontractors to process our data?",
    "How do you vet subcontractors?",
    "Can we audit subcontractors?",

    // Business Continuity
    "What is your backup and disaster recovery process?",
    "What is your RTO (Recovery Time Objective)?",
    "What is your RPO (Recovery Point Objective)?",
  ],

  red_flags: [
    "Refuses to answer security questions",
    "No incident response process",
    "Stores data in sketchy locations",
    "Won't sign data processing agreement (DPA)",
  ],
}
```

---

## Vendor Contracts & SLAs

### Service Level Agreement (SLA)

```typescript
interface SLA {
  // Define expected service levels
  
  components: {
    uptime: {
      guarantee: "99.9% uptime",
      meaning: "Service down max 43 minutes/month",
      credit: "If below 99.9%, get 10% discount",
    },

    response_time: {
      target: "< 15 minutes for critical issues",
      meaning: "Vendor must acknowledge issue within 15 min",
    },

    resolution_time: {
      target: "< 4 hours for critical",
      meaning: "Must fix or provide workaround within 4 hours",
    },

    support_availability: {
      target: "24/7 for critical issues",
      meaning: "Support team staffed 24 hours",
    },
  },

  // Example: AWS RDS SLA
  example_rds: `
AWS RDS SLA:
- Uptime: 99.95% per month
- Multi-AZ deployment required for SLA
- If down, 10% monthly bill credit
- Rolling 30-day measurement
  `,

  // Penalties for breach
  remedies: [
    "Service credits (% of monthly bill)",
    "Auto-scaling resources without charge",
    "Extended support",
  ],

  important: "Clearly define what constitutes 'downtime'",
  example: "Scheduled maintenance excluded",
}
```

### Data Processing Agreement (DPA) / Privacy

```typescript
interface DataProcessingAgreement {
  // Required for GDPR/CCPA compliance
  
  required_clauses: {
    data_processing: "Vendor is 'processor', you are 'controller'",
    subprocessors: "Vendor can't use subprocessors without approval",
    data_deletion: "Vendor must delete data on request",
    audit_rights: "You can audit vendor's practices",
    breach_notification: "Vendor must notify within X hours",
    data_residency: "Data must stay in [region]",
    security_measures: "Vendor must maintain [specific controls]",
  },

  // Example clause
  security_measures_example: `
Vendor shall maintain:
- Encryption at rest (AES-256 minimum)
- Encryption in transit (TLS 1.2+)
- Access controls (MFA for prod access)
- Intrusion detection system (IDS)
- Regular penetration testing
- Incident response plan
- Annual SOC 2 Type II audit
  `,

  // Compliance risks
  high_risk_clause: {
    bad: "Vendor can transfer data outside EU without consent",
    solution: "Require SCCs (Standard Contractual Clauses)",
    importance: "GDPR compliance requirement",
  },
}
```

---

## Vendor Management Program

### Ongoing Monitoring

```typescript
interface VendorMonitoring {
  // Track vendor health continuously
  
  metrics_to_track: [
    "Uptime (from status page)",
    "Incident frequency (public incidents)",
    "Response time (from support tickets)",
    "Security updates (patches applied)",
    "Compliance status (certifications expires?)",
  ],

  // Automated monitoring
  implementation: `
export async function monitorVendorHealth() {
  for (const vendor of vendors) {
    // Check status page
    const status = await fetch(vendor.status_page_url);
    const uptime = calculateUptime(status);
    
    // Check for incidents
    const incidents = await getRecentIncidents(vendor.id);
    
    // Update dashboard
    await updateVendorScorecard({
      vendor_id: vendor.id,
      uptime: uptime,
      recent_incidents: incidents.length,
      last_check: new Date(),
    });

    // Alert if degraded
    if (uptime < vendor.sla_target) {
      alertTeam(\`\${vendor.name} below SLA: \${uptime}%\`);
    }
  }
}
  `,

  scorecard: `
Vendor Scorecard (Monthly):
- Uptime: 99.95% (target: 99.9%) ✓
- Incidents: 0 critical, 1 major (target: < 2) ✓
- Response time: avg 8 min (target: < 15) ✓
- Security: No breaches reported ✓
- Compliance: SOC 2 expires in 6 months (renew soon)

Overall health: Good
  `,
}
```

### Incident Communication with Vendors

```typescript
interface VendorIncidentCommunication {
  // When OUR incident involves vendor failure

  example: `
Incident: Payment processing is down
Root cause: Stripe API is returning 503 errors

Communication:

TO EXECUTIVE:
"Stripe (payment processor) experiencing outage.
Our checkout is affected. ETA 30min per their status page.
Revenue impact: ~$500/hour."

TO CUSTOMER SUCCESS:
"Stripe API down. Customers can't complete checkout.
Tell affected customers: 'We're experiencing temporary checkout issues.
Please retry in 15 minutes or contact support for help.'"

TO ENGINEERING:
"Implement retry logic with exponential backoff.
Mark Stripe as degraded until API returns.
Queue transactions for retry when Stripe recovers."

FOLLOW-UP:
"Once resolved: File ticket with Stripe asking:
- Root cause analysis
- Prevention measures
- Whether we qualify for SLA credit"
  `,
}
```

---

## Vendor Dependence & Risk Reduction

### Backup Vendors

```typescript
interface BackupVendorStrategy {
  // Never depend on single vendor
  
  critical_services: {
    example: "Email delivery",
    
    primary: "SendGrid (established, reliable)",
    backup: "AWS SES (different provider, integrated)",
    
    implementation: `
export async function sendEmailWithFailover(recipient: string, email: Email) {
  try {
    // Try primary vendor
    await sendgrid.send({
      to: recipient,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    logger.warn('SendGrid failed, falling back to SES');
    
    // Fall back to secondary vendor
    await ses.sendEmail({
      Source: 'noreply@example.com',
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: email.subject },
        Body: { Html: { Data: email.html } },
      },
    });
  }
}
    `,
    
    benefit: "Email sends even if SendGrid down",
  },

  // Cost of redundancy vs cost of outage
  analysis: `
SendGrid outage once per year (avg):
- Average outage duration: 2 hours
- Emails impacted: 50,000
- Impact: Lost customer communications, reputation

Cost of redundancy (AWS SES):
- Implementation: $5,000
- Ongoing maintenance: $1,000/year
- Cost per outage prevented: $6,000

Benefit: Prevents single outage per year
ROI: 100% positive if prevents one major incident
  `,
}
```

### Data Portability

```typescript
interface DataPortability {
  // Can you export data to a different vendor?
  
  importance: "GDPR right, AND practical risk mitigation",

  for_each_vendor: {
    question1: "Can we export all customer data?",
    question2: "In what format (JSON, CSV, database dump)?",
    question3: "How quickly (< 24 hours)?",
    question4: "Without additional cost?",
  },

  // Test data export annually
  testing: `
// Annual disaster recovery test
export async function testDataExport() {
  const startDate = new Date('2024-01-01');
  
  for (const vendor of critical_vendors) {
    // Request data export
    const exportJob = await vendor.requestDataExport();
    
    // Wait for completion
    const data = await waitForCompletion(exportJob);
    
    // Import to test environment
    await testEnvironment.import(data);
    
    // Verify integrity
    const recordCount = testEnvironment.count();
    console.log(\`Imported \${recordCount} records from \${vendor.name}\`);
    
    // Report results
    await reportDataExportSuccess(vendor.name, data);
  }
}
  `,
}
```

---

## Vendor Offboarding

### Planned Offboarding

```typescript
interface VendorOffboarding {
  timeline: [
    "Month 1: Notify vendor of plan to switch",
    "Month 2: Implement replacement vendor",
    "Month 3: Parallel run (both systems)",
    "Month 4: Cutover to new vendor",
    "Month 5: Decommission old vendor",
  ],

  checklist: [
    "[ ] Data export from old vendor",
    "[ ] Data import to new vendor",
    "[ ] Test new vendor thoroughly",
    "[ ] Train support team on new system",
    "[ ] Notify customers (if relevant)",
    "[ ] Update documentation",
    "[ ] Delete all data from old vendor",
    "[ ] Cancel contracts/subscriptions",
    "[ ] Reconcile final bill",
  ],

  // Example: Switching payment processors
  example: `
Decision: Switch from Stripe to custom payment processor

Month 1:
- Notify Stripe: 60-day transition period
- Stand up new payment processor
- Set up test environment

Month 2:
- Migrate all customer payment methods
- Test both systems with sample transactions

Month 3:
- Production testing: 1% of transactions via new processor

Month 4:
- Increase to 50% of transactions via new processor
- Monitor for issues

Month 5:
- 100% cutover to new processor
- Decommission Stripe integration
- Delete stored payment data from our systems
  `,
}
```

### Emergency Offboarding

```typescript
interface EmergencyOffboarding {
  // Vendor compromised by security breach or failure
  
  scenario: "Vendor has major security breach",
  
  immediate: [
    "[ ] Revoke API keys immediately",
    "[ ] Export all data from vendor (emergency)",
    "[ ] Delete data on vendor's systems",
    "[ ] Notify customers if their data was affected",
    "[ ] File incident report",
    "[ ] Communicate with insurance",
  ],

  // Example: Stripe compromised (hypothetical)
  emergency_plan: `
IF Stripe announces breach:

Immediate (< 1 hour):
1. Revoke all Stripe API keys
2. Block all Stripe webhook traffic
3. Switch to backup payment processor
4. Notify customers: "Temporary checkout maintenance"

Within 4 hours:
1. Analyze impact (which customers affected?)
2. Contact affected customers
3. File insurance claim

Within 24 hours:
1. Complete incident response
2. Review security audit of alternative processor
3. Deploy to production

Result: Service restored < 4 hours with backup vendor
  `,
}
```

---

## Resources

- [SIG Third-Party Risk Management](https://www.sharedassessments.org/)
- [NIST Supply Chain Risk Management](https://csrc.nist.gov/projects/supply-chain-risk-management/)
- [Vendor Risk Assessment Template](https://www.sans.org/)
- [GDPR Data Processing Agreements](https://gdpr-info.eu/art-28-gdpr/)
- [Cloud Security Alliance](https://cloudsecurityalliance.org/)
