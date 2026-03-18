/**
 * Expert System Integration
 * Connect expert enhancements to memory session for seamless usage
 */
import { ExpertSystemEnhancements } from './expert-system-enhancements';
/**
 * Initialize expert system for session
 */
export declare function initializeExpertSystem(sessionId: string): ExpertSystemEnhancements;
/**
 * Get expert system instance
 */
export declare function getExpertSystem(): ExpertSystemEnhancements;
/**
 * FEATURE 1: Error Prevention
 * Record when something goes wrong and prevent it next time
 */
export declare function recordAndLearnFromError(errorType: 'implementation' | 'design' | 'performance' | 'security' | 'ux', context: Record<string, any>, whatWentWrong: string, howToFixIt: string, preventionSteps: string[]): Promise<void>;
/**
 * FEATURE 2: Predictive Error Prevention
 * Before implementing, check if similar errors happened before
 */
export declare function checkForKnownRisks(context: Record<string, any>): Promise<{
    has_risks: boolean;
    alerts: any[];
    message: string;
}>;
/**
 * FEATURE 3: Complete Decision Audit
 * Track every decision with full context and outcome
 */
export declare function auditDecision(recommendation: string, confidence: number, context: Record<string, any>, result: 'success' | 'failed' | 'partial', whatYouLearned: string, implementationTime: number, teamEffort: number): Promise<void>;
/**
 * FEATURE 4: Domain Specialization
 * Become expert in specific domains (microservices, mobile, etc)
 */
export declare function buildDomainExpertise(domain: string, successfulPatterns: string[], failedPatterns: string[], bestPractices: string[]): Promise<void>;
/**
 * FEATURE 5: Find Similar Past Situations
 * "Hey, I solved something similar before. Here's what happened..."
 */
export declare function findPastExamples(currentSituation: Record<string, any>, similarity_percentage?: number): Promise<{
    found: number;
    examples: any[];
    recommendation: string;
}>;
/**
 * FEATURE 6: Active Learning Questions
 * System asks questions to improve its expertise
 */
export declare function askLearningQuestions(domain: string): Promise<string[]>;
/**
 * FEATURE 7: Risk Assessment
 * Before implementing, evaluate potential risks
 */
export declare function assessImplementationRisk(recommendation: string, context: Record<string, any>): Promise<{
    risk_level: string;
    confidence: number;
    identified_risks: string[];
    mitigations: string[];
}>;
/**
 * FEATURE 8: Self-Correction
 * When you realize the recommendation was wrong, teach the brain
 */
export declare function correctMistake(whatYouAskedFor: string, whatItRecommended: string, whatYouShouldHaveDone: string, whyItWasMistaken: string): Promise<void>;
/**
 * FEATURE 9: Expert Status Report
 * See how expert the system has become
 */
export declare function getSystemExpertiseLevel(): Promise<{
    overall_expertise_percent: number;
    success_rate_percent: number;
    error_prevention_rate_percent: number;
    total_decisions_analyzed: number;
    domains_specialized: string[];
    learning_trajectory: string;
    next_steps: string[];
}>;
/**
 * FEATURE 10: Share Expertise (Anonymized)
 * Contribute to global expert network without revealing identity
 */
export declare function shareYourExpertise(domain: string): Promise<void>;
/**
 * FEATURE 11: Cost-Accuracy Trade-off
 * Choose between cheap/simple or expensive/complex solutions
 */
export declare function recommendSolutionComplexity(context: Record<string, any>, budget: 'low' | 'medium' | 'high'): Promise<{
    recommendation: string;
    expected_success: number;
    implementation_cost: number;
    maintenance_cost: number;
    recommendation_text: string;
}>;
/**
 * FEATURE 12: Quick Health Check
 * Get a quick summary of system health and recommendations
 */
export declare function getSystemHealthCheck(): Promise<{
    status: 'healthy' | 'improving' | 'needs-attention';
    message: string;
    metrics: {
        expertise: number;
        success_rate: number;
        error_prevention: number;
    };
    recommendations: string[];
}>;
export type {};
//# sourceMappingURL=expert-system-integration.d.ts.map