/**
 * Legal & Terms Generator
 * Automatically generates GDPR-compliant Terms of Service, Privacy Policy, and other legal documents
 */

interface LegalDocumentConfig {
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  appName: string;
  appDescription: string;
  dataProcessing: string[]; // e.g., ['user_emails', 'payment_info', 'usage_analytics']
  thirdPartyServices: string[]; // e.g., ['stripe', 'sendgrid', 'google_analytics']
  jurisdiction: 'EU' | 'US' | 'UK' | 'GLOBAL';
}

interface GeneratedLegalDocument {
  type: 'privacy_policy' | 'terms_of_service' | 'data_processing_agreement';
  content: string;
  lastUpdated: Date;
}

export class LegalTermsGenerator {
  /**
   * Generate Privacy Policy (GDPR compliant)
   */
  static generatePrivacyPolicy(config: LegalDocumentConfig): GeneratedLegalDocument {
    const content = `
# Privacy Policy

**Last Updated:** ${new Date().toLocaleDateString()}

## 1. Introduction

${config.companyName} ("we", "us", "our", or "Company") operates the ${config.appName} application ("the Application"). This Privacy Policy explains our practices regarding the collection, use, and protection of your personal data.

## 2. Data We Collect

We collect the following types of personal data:

${config.dataProcessing.map(dp => `- **${this.formatDataType(dp)}**: Information related to ${dp}`).join('\n')}

## 3. Legal Basis for Processing

Under the GDPR, we process your data based on:
- Your explicit consent
- Necessity for contract performance
- Compliance with legal obligations
- Legitimate interests of the Company

## 4. Your Rights

Under GDPR, you have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion ("Right to be forgotten")
- Restrict processing
- Data portability
- Object to processing
- Lodge a complaint with supervisory authorities

## 5. Data Retention

We retain your personal data only as long as necessary for the purposes stated in this Privacy Policy, typically:
- Account data: Duration of your account + 30 days after deletion
- Transaction data: 7 years (for tax and legal compliance)
- Analytics data: 12 months

## 6. Third-Party Services

We use the following third-party services that may process your data:

${config.thirdPartyServices.map(service => `- **${this.formatServiceName(service)}**: ${this.getServiceDescription(service)}`).join('\n')}

Each third party has their own privacy policy. We recommend reviewing them.

## 7. Data Security

We implement industry-standard security measures including:
- End-to-end encryption
- Regular security audits
- Role-based access control
- Secure data transmission (HTTPS/TLS)

## 8. International Data Transfers

If you are located in the EU/EEA, any data transfer outside these regions is protected by:
- Standard Contractual Clauses (SCCs)
- Adequacy decisions
- Your explicit consent

## 9. Contact Us

For privacy-related inquiries, contact us at:
- Email: ${config.companyEmail}
- Address: ${config.companyAddress}

---

**Jurisdiction:** ${config.jurisdiction}
    `;

    return {
      type: 'privacy_policy',
      content: content.trim(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate Terms of Service
   */
  static generateTermsOfService(config: LegalDocumentConfig): GeneratedLegalDocument {
    const content = `
# Terms of Service

**Last Updated:** ${new Date().toLocaleDateString()}

## 1. Acceptance of Terms

By accessing and using ${config.appName}, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License

Permission is granted to temporarily download one copy of the materials (information or software) on ${config.appName} for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:

- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to decompile or reverse engineer any software contained on the Application
- Remove any copyright or other proprietary notations from the materials
- Transfer the materials to another person or "mirror" the materials on any other server

## 3. Disclaimer

The materials on ${config.appName} are provided on an 'as is' basis. ${config.companyName} makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

## 4. Limitations

In no event shall ${config.companyName} or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Application.

## 5. Accuracy of Materials

The materials appearing on ${config.appName} could include technical, typographical, or photographic errors. ${config.companyName} does not warrant that any of the materials on its Application are accurate, complete, or current.

## 6. Links

${config.companyName} has not reviewed all of the sites linked to its Application and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by ${config.companyName} of the site. Use of any such linked website is at the user's own risk.

## 7. Modifications

${config.companyName} may revise these terms of service for its Application at any time without notice. By using this Application, you are agreeing to be bound by the then current version of these terms of service.

## 8. Governing Law

These terms and conditions are governed by and construed in accordance with the laws of ${config.jurisdiction}, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.

## 9. Contact

If you have any questions about these Terms of Service, please contact us at ${config.companyEmail}.

---

**Jurisdiction:** ${config.jurisdiction}
    `;

    return {
      type: 'terms_of_service',
      content: content.trim(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate Data Processing Agreement (for B2B)
   */
  static generateDataProcessingAgreement(config: LegalDocumentConfig): GeneratedLegalDocument {
    const content = `
# Data Processing Agreement (DPA)

**Last Updated:** ${new Date().toLocaleDateString()}

## 1. Parties

- **Data Controller:** The Customer
- **Data Processor:** ${config.companyName}

## 2. Subject Matter

This DPA governs the processing of personal data by ${config.companyName} on behalf of the Customer in connection with the provision of ${config.appName}.

## 3. Processing Details

### 3.1 Categories of Personal Data
${config.dataProcessing.map(dp => `- ${this.formatDataType(dp)}`).join('\n')}

### 3.2 Purpose of Processing
Processing is conducted solely for the purpose of providing the ${config.appName} service and as instructed by the Customer.

## 4. Processor Obligations

${config.companyName} shall:
- Process personal data only on documented instructions from the Customer
- Ensure that persons authorized to process personal data are committed to confidentiality
- Implement appropriate technical and organizational security measures
- Assist the Customer in fulfilling data subject rights
- Delete or return personal data after the end of the provision of services
- Make available to the Customer all information necessary to demonstrate compliance

## 5. Sub-processors

${config.companyName} uses the following sub-processors:
${config.thirdPartyServices.map(service => `- ${this.formatServiceName(service)}`).join('\n')}

The Customer is notified of any changes to sub-processors with at least 30 days' notice.

## 6. Data Subject Rights

The Customer shall be responsible for responding to data subject requests. ${config.companyName} shall provide reasonable assistance.

## 7. Data Security

${config.companyName} implements appropriate technical and organizational security measures including encryption, access controls, and regular security assessments.

## 8. International Transfers

Any transfer of personal data outside the EEA is protected by Standard Contractual Clauses.

## 9. Audit Rights

The Customer has the right to audit ${config.companyName}'s compliance with this DPA upon reasonable notice.

## 10. Termination

Upon termination of the service agreement, ${config.companyName} shall delete or return all personal data as instructed by the Customer.

---

**Effective Date:** ${new Date().toLocaleDateString()}
    `;

    return {
      type: 'data_processing_agreement',
      content: content.trim(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate all legal documents
   */
  static generateAllDocuments(config: LegalDocumentConfig): GeneratedLegalDocument[] {
    return [
      this.generatePrivacyPolicy(config),
      this.generateTermsOfService(config),
      this.generateDataProcessingAgreement(config),
    ];
  }

  /**
   * Helper functions
   */
  private static formatDataType(dataType: string): string {
    return dataType.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private static formatServiceName(service: string): string {
    const serviceNames: Record<string, string> = {
      stripe: 'Stripe (Payment Processing)',
      sendgrid: 'SendGrid (Email Service)',
      google_analytics: 'Google Analytics (Analytics)',
      aws: 'Amazon Web Services (Cloud Infrastructure)',
      supabase: 'Supabase (Database & Auth)',
      cloudflare: 'Cloudflare (CDN & Security)',
    };
    return serviceNames[service] || this.formatDataType(service);
  }

  private static getServiceDescription(service: string): string {
    const descriptions: Record<string, string> = {
      stripe: 'Processes payment information securely',
      sendgrid: 'Sends transactional and marketing emails',
      google_analytics: 'Tracks user behavior and application performance',
      aws: 'Hosts our application and stores data',
      supabase: 'Manages user authentication and database',
      cloudflare: 'Provides DDoS protection and content delivery',
    };
    return descriptions[service] || 'Processes data as part of service delivery';
  }
}

export type { GeneratedLegalDocument, LegalDocumentConfig };
