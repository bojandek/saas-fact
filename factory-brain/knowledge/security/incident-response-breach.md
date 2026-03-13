# Incident Response & Breach Management: Crisis Playbook

## Incident Response Fundamentals

### Response Phases

```typescript
interface IncidentResponsePhases {
  // Phase 1: Preparation (Before incident)
  preparation: {
    what: "Build incident response capability before needed",
    build: [
      "IR team (security, engineering, legal, communications)",
      "Playbooks (procedures for common incidents)",
      "Tools (logging, monitoring, forensics)",
      "Communications plan (who to notify)",
    ],
    timeline: "Months",
  },

  // Phase 2: Detection & Analysis
  detection: {
    what: "Find and verify the incident",
    how: [
      "Automated alerts (IDS/IPS)",
      "User reports",
      "Security scanning",
      "Manual discovery",
    ],
    goal: "Confirm: Are we actually under attack?",
    timeline: "Minutes to hours",
  },

  // Phase 3: Containment
  containment: {
    what: "Limit damage and prevent spread",
    short_term: [
      "Isolate affected systems",
      "Block attacker access",
      "Stop ongoing exploitation",
    ],
    long_term: [
      "Patch vulnerabilities",
      "Fix configurations",
      "Harden systems",
    ],
    timeline: "Hours to days",
  },

  // Phase 4: Eradication
  eradication: {
    what: "Remove attacker from systems",
    activities: [
      "Remove malware/backdoors",
      "Patch vulnerabilities",
      "Reset compromised credentials",
      "Restore from clean backups",
    ],
    timeline: "Days to weeks",
  },

  // Phase 5: Recovery
  recovery: {
    what: "Restore systems to normal operation",
    activities: [
      "Rebuild systems from scratch (if needed)",
      "Restore from backups",
      "Verify systems working correctly",
      "Monitor for re-infection",
    ],
    timeline: "Days to weeks",
  },

  // Phase 6: Post-Incident Review
  postIncident: {
    what: "Learn from incident",
    activities: [
      "Root cause analysis: Why did this happen?",
      "Timeline reconstruction: Exactly what happened?",
      "Lessons learned: What can we improve?",
      "Preventive measures: How do we prevent recurrence?",
    ],
    timeline: "1-2 weeks after containment",
  },
}
```

---

## Data Breach Response Plan

### Incident Severity Classification

```typescript
interface BreachSeverity {
  // Severity 1: CRITICAL (Customer data compromised)
  critical: {
    examples: [
      "Credit card data exposed",
      "Personal identification info leaked",
      "Large number of users affected",
    ],
    response_time: "< 1 hour",
    actions: [
      "Immediate containment",
      "Notify law enforcement within 24 hours (may vary by jurisdiction)",
      "Notify affected customers",
      "Public statement",
      "Press releases",
    ],
  },

  // Severity 2: HIGH (Potential data exposure)
  high: {
    examples: [
      "Unauthorized access detected",
      "Suspected data theft",
      "Employee credentials compromised",
    ],
    response_time: "< 4 hours",
    actions: [
      "Investigate scope",
      "Contain affected systems",
      "Internal notifications",
    ],
  },

  // Severity 3: MEDIUM (Security finding)
  medium: {
    examples: [
      "Vulnerability discovered",
      "Failed intruder detection attempt",
      "Configuration drift",
    ],
    response_time: "< 24 hours",
    actions: [
      "Investigate",
      "Plan remediation",
    ],
  },

  // Severity 4: LOW (Informational)
  low: {
    examples: [
      "Log anomalies",
      "Routine security scanning",
    ],
    response_time: "Within sprint",
  },
}
```

### Breach Notification Requirements (US - Varies by State)

```typescript
interface BreachNotificationLaws {
  // US State Laws
  state_laws: {
    california: {
      law: "California Consumer Privacy Act (CCPA)",
      notification_timeline: "Without unreasonable delay (typically 30 days)",
      notify_who: [
        "Affected California residents",
        "California Attorney General (if many records)",
      ],
    },
    new_york: {
      law: "New York SHIELD Act",
      notification_timeline: "Without unreasonable delay",
      notify_who: [
        "Affected New York residents",
        "New York Attorney General",
      ],
    },
  },

  // EU GDPR
  eu_gdpr: {
    notification_timeline: "Without unreasonable delay, max 72 hours",
    notify_who: [
      "Data Protection Authority (DPA)",
      "Affected individuals (only if high risk)",
    ],
    breach_report: `
Must include:
- Nature of data breach
- Likely consequences
- Measures taken to mitigate
- DPA contact
- Data Protection Officer contact
    `,
  },

  // Canada
  canada_pipeda: {
    notification_timeline: "Without unreasonable delay, as soon as practical",
    notify_who: [
      "Affected individuals",
      "Office of the Privacy Commissioner (if systemic issue)",
    ],
  },
}
```

---

## Creating an Incident Response Playbook

### Essential Playbook Elements

```typescript
interface PlaybookTemplate {
  incident_type: "Data Breach - Customer PII",

  // 1. Executive Summary
  summary: {
    definition: "One paragraph describing incident",
    example: "Unauthorized access to customer database via SQL injection",
  },

  // 2. Incident Commander
  commander: {
    role: "Single person directing response",
    responsibilities: [
      "Coordinate all response activities",
      "Make decisions (escalate if needed)",
      "Communicate to stakeholders",
      "Track timeline",
    ],
    selection: "Highest ranking person available",
  },

  // 3. Response Team Structure
  team: {
    incident_commander: "Director-level person",
    security_lead: "Head of Security/CISO",
    engineering_lead: "VP Engineering (system knowledge)",
    communications: "PR/Communications lead",
    legal: "General Counsel (breach notification laws)",
    database_admin: "Access to database systems",
    sre_on_call: "Infrastructure/deployment authority",
  },

  // 4. Detection & Verification
  detection: {
    action: "Confirm this is actually a breach",
    verification: [
      "Review monitoring alerts",
      "Check access logs",
      "Verify anomalies",
      "Interview affected users (if applicable)",
    ],
  },

  // 5. Immediate Actions (First Hour)
  immediate: [
    "[ ] Activate IR team (pages if after hours)",
    "[ ] Create war room (Slack + Zoom)",
    "[ ] Start incident timeline document",
    "[ ] Assign incident commander",
    "[ ] Notify CEO/Board (severity-dependent)",
  ],

  // 6. Investigation Steps
  investigation: [
    "[ ] Determine: What data was accessed?",
    "[ ] Determine: How did attacker get in?",
    "[ ] Determine: How long was access present?",
    "[ ] Determine: Did attacker exfiltrate data?",
    "[ ] Preserve evidence (logs, system snapshots)",
    "[ ] Interview employees (who? when? unusual activity?)",
  ],

  // 7. Containment Steps
  containment: [
    "[ ] Isolate affected systems (disconnect if needed)",
    "[ ] Block attacker's IP/access methods",
    "[ ] Reset compromised credentials",
    "[ ] Review access logs (find other compromises)",
    "[ ] Patch vulnerability (prevent re-entry)",
  ],

  // 8. Customer Notification
  notification: {
    template: `
Subject: Important Security Notice

We're writing to inform you about a security incident affecting your account.

What happened:
[Brief, clear explanation]

What data was affected:
[Specific data types: names, emails, but NOT "social security numbers"
 to avoid alarming unnecessarily]

What we're doing:
- Investigated the incident
- Contained the attack
- Patched the vulnerability
- Enhanced monitoring

What you should do:
- Change your password
- Monitor your account for suspicious activity
- Consider identity theft protection

We take security seriously. Questions? security@company.com
    `,
    timing: "As soon as notification is legally required",
    channels: [
      "Email (personalized)",
      "In-app notification",
      "Phone call (for high-risk cases)",
      "Press statement (if major incident)",
    ],
  },

  // 9. Communication to Stakeholders
  stakeholder_comms: {
    ceo_board: "Complete transparency, CEO decides disclosures",
    customers: "Supportive, clear, actionable guidance",
    press: "Coordinated statement, avoid speculation",
    regulators: "Compliant with notification laws",
    insurance: "Usually insurer must be notified immediately",
  },

  // 10. Post-Incident Actions
  follow_up: [
    "[ ] Cancel insurance claim (if applicable)",
    "[ ] Document all findings in incident report",
    "[ ] Plan post-mortem meeting (1 week out)",
    "[ ] Identify preventive measures",
    "[ ] Update playbooks based on lessons learned",
  ],
}
```

### Example: SQL Injection Breach Detected

```typescript
interface SQLInjectionBreachResponse {
  incident: "SQL Injection - Customer PII Access",
  timestamp: "2024-05-15T14:30:00Z",

  detection: {
    time: "14:32 (2 min after attack began)",
    how: "Web Application Firewall (WAF) blocked suspicious query",
    alert: "Unusual database queries from app server",
  },

  investigation_findings: {
    attack_vector: "Exploited unsanitized search input",
    time_active: "15 minutes (14:15 - 14:30)",
    data_affected: "10,000 user records (names, emails, phone numbers)",
    data_exfiltrated: "Suspected (SQL SELECT, no UPDATE/DELETE attempted)",
    other_compromises: "None found (attacker didn't have persistence)",
  },

  immediate_response: {
    "14:32": "WAF blocked attack, IR team paged",
    "14:35": "War room established, incident commander assigned",
    "14:45": "Determined scope (10k users, 15 min window)",
    "15:00": "Patched vulnerable code, deployed to production",
    "15:15": "Verified attack ended, monitored for re-attempts",
  },

  customer_communication: {
    sent: "2024-05-15T18:00:00Z (3.5 hours after detection)",
    template: `
We're writing about a security incident on our platform.

On May 15, 2024 at 2:15 PM UTC, we detected and stopped a targeted
attack on our system involving SQL injection.

What was affected:
- Customer names and emails
- Phone numbers (14,500 of 10M customers)

What we did:
- Detected attack within 2 minutes
- Patched vulnerability within 45 minutes
- No ongoing access possible

What you should do:
- Change your password
- Monitor for phishing emails
- Consider 2FA if not enabled

Questions: security@us.company.com
    `,
  },

  regulatory_reporting: {
    notify_authorities: "No state AG notification required (info only, not SSN)",
    notify_insurance: "Filed claim within 24 hours",
  },

  lessons_learned: {
    root_cause: "Input validation missing on search field",
    prevention: "Require parameterized queries for all DB access",
    detection: "WAF is working well (caught immediately)",
    improvement: "Add rate limiting to API endpoints",
  },
}
```

---

## Crisis Communications

### Internal Communications

```typescript
interface InternalCrisis {
  // Immediate: All-hands internal communication
  employees: {
    message: `
We're experiencing a security incident. 

The IR team is activated and responding. We'll update you every hour.

For now, focus on your normal work. Don't speculate publicly/on social media.

This is confidential until official statement released.

Questions: #incident-response Slack channel
    `,
    timing: "Immediately (before customers find out)",
  },

  // Executives: Detailed briefing
  executives: {
    agenda: [
      "Incident summary (what, when, how)",
      "Scope (how many customers affected?)",
      "Timeline (how long did it take to contain?)",
      "Financial impact (estimated cost)",
      "Public relations impact (media coverage likely?)",
      "Regulatory impact (lawsuits? fines?)",
      "Response steps (what are we doing?)",
      "Prevention (how do we prevent recurrence?)",
    ],
    frequency: "Every 4 hours until resolved",
  },

  // Board notification (if severe)
  board: {
    timing: "Within 24 hours of decision to notify customers",
    items: [
      "What happened",
      "Financial impact (insurance, legal, remediation)",
      "Regulatory exposure",
      "Customer retention risk",
      "Management recommendations",
    ],
  },
}
```

### External Communications

```typescript
interface ExternalCrisis {
  // Customer email template
  customer_template: `
[Clear subject line without fear-mongering]
Subject: Important Security Update [Date]

[Lead with empathy]
We're writing to inform you of a security incident affecting your account.

[Be specific and clear]
On [date], we identified unauthorized access to a portion of our
customer database. We immediately took action to secure systems
and prevent further access.

[What data]
We believe the following information may have been accessed:
- Account email address
- First and last name

The following information was NOT accessed:
- Passwords (encrypted)
- Credit card information (not stored)
- Social security numbers

[What we did]
- Closed the access point immediately
- Patched the vulnerability
- Enhanced our security monitoring

[Customer action]
- Change your password
- Monitor your account for unusual activity

[Support]
Questions? Email us at security@us.company.com
Our team will prioritize your inquiry.

[Sign-off]
[CEO Signature]
[Date]
  `,

  // Press statement
  press_statement: `
[Company Name] Addresses Security Incident

[Date] – [Company Name] identified and contained a security
incident affecting approximately [X] customers.

Upon discovery, our security team immediately:
- Secured the affected system
- Launched a comprehensive investigation
- Implemented additional security measures

"We take the security of customer data seriously. While we were
able to quickly identify and contain this incident, we apologize
for any concern this may cause." - [CEO Name], CEO

Affected customers are being notified directly with specific
information and recommended actions.

For more information: www.company.com/security-update
  `,

  // Social media (brief, direct to info page)
  twitter: `
We're addressing a security incident. We've contained it and are
notifying affected customers. Full details: [link]

Questions? security@us.company.com
  `,
}
```

---

## Insurance & Legal Considerations

```typescript
interface BreachInsurance {
  cyber_insurance: {
    covers: [
      "Legal fees",
      "Notification costs (mailing, credit monitoring)",
      "Public relations",
      "Business interruption",
      "Regulatory fines (depending on policy)",
    ],

    claim_process: [
      "Notify insurer IMMEDIATELY (policy requirement)",
      "Provide incident details",
      "Cooperate with insurer investigation",
      "File claim within policy timeframe",
    ],

    timing: "Don't wait to include in annual planning",
  },

  legal_obligations: {
    notification: "Must follow state/federal/international laws",
    documentation: "Keep detailed incident records for regulators",
    remediation: "Document all remediation efforts",
    liability: "Limit admissions of fault in communications",
  },
}
```

---

## Prevention & Hardening

### Pre-Breach Measures

```typescript
interface PreBreachPrevention {
  // Technical controls
  technical: [
    "Patch management (monthly/critical immediately)",
    "Access controls (least privilege)",
    "Encryption (data at rest & in transit)",
    "WAF (block known attacks)",
    "IDS/IPS (detect intrusions)",
    "EDR (endpoint detection & response)",
  ],

  // Process controls
  process: [
    "Security training (all employees)",
    "Incident response drills (quarterly)",
    "Vulnerability management (regular scanning)",
    "Backup testing (monthly)",
    "Change management (documented, approved)",
  ],

  // Monitoring & Detection
  monitoring: [
    "Centralized logging (send all logs to SIEM)",
    "Alert thresholds (configured for attack patterns)",
    "24/7 monitoring (at least external interfaces)",
    "Regular log review (not just alerts)",
  ],
}
```

---

## Resources

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework/)
- [SANS Incident Response](https://www.sans.org/reading-room/)
- [Atlassian Incident Response](https://www.atlassian.com/incident-management/)
- [State Breach Notification Laws](https://www.ncsl.org/research/telecommunications-and-information-technology/security-breach-notification-laws.aspx)
- [GDPR Data Breach Notification](https://gdpr-info.eu/art-33-gdpr/)
