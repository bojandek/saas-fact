/**
 * Legal & Terms Generator
 * Automatically generates GDPR-compliant Terms of Service, Privacy Policy, and other legal documents
 *
 * System prompt: LEGAL_AGENT_PROMPT from './prompts/agent-prompts'
 * Note: This generator uses static template generation (no LLM call).
 * For AI-enhanced documents, use the LEGAL_AGENT_PROMPT as system prompt
 * when calling OpenAI with a custom config as user message.
 */
import { LEGAL_AGENT_PROMPT } from './prompts/agent-prompts';
export { LEGAL_AGENT_PROMPT };
interface LegalDocumentConfig {
    companyName: string;
    companyEmail: string;
    companyAddress: string;
    appName: string;
    appDescription: string;
    dataProcessing: string[];
    thirdPartyServices: string[];
    jurisdiction: 'EU' | 'US' | 'UK' | 'GLOBAL';
}
interface GeneratedLegalDocument {
    type: 'privacy_policy' | 'terms_of_service' | 'data_processing_agreement';
    content: string;
    lastUpdated: Date;
}
export declare class LegalTermsGenerator {
    /**
     * Generate Privacy Policy (GDPR compliant)
     */
    static generatePrivacyPolicy(config: LegalDocumentConfig): GeneratedLegalDocument;
    /**
     * Generate Terms of Service
     */
    static generateTermsOfService(config: LegalDocumentConfig): GeneratedLegalDocument;
    /**
     * Generate Data Processing Agreement (for B2B)
     */
    static generateDataProcessingAgreement(config: LegalDocumentConfig): GeneratedLegalDocument;
    /**
     * Generate all legal documents
     */
    static generateAllDocuments(config: LegalDocumentConfig): GeneratedLegalDocument[];
    /**
     * Helper functions
     */
    private static formatDataType;
    private static formatServiceName;
    private static getServiceDescription;
}
export type { GeneratedLegalDocument, LegalDocumentConfig };
//# sourceMappingURL=legal-terms-generator.d.ts.map