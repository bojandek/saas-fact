/**
 * Expert System Enhancements
 * Advanced features to transform memory engine into world-class expert system
 * that learns from mistakes, predicts errors, and continuously optimizes
 */
interface ErrorPattern {
    id: string;
    error_type: 'implementation' | 'design' | 'performance' | 'security' | 'ux';
    description: string;
    context: Record<string, any>;
    solution: string;
    occurrences: number;
    prevention_rules: string[];
    success_rate: number;
    last_caught: string;
}
interface DecisionAudit {
    id: string;
    timestamp: string;
    recommendation: string;
    confidence: number;
    context: Record<string, any>;
    implementation_result: 'success' | 'failed' | 'partial';
    lessons_learned: string;
    error_caught?: ErrorPattern;
    metrics: {
        time_to_implement: number;
        complexity: number;
        team_effort: number;
    };
}
interface DomainSpecialization {
    domain: string;
    base_expertise: number;
    success_count: number;
    failure_count: number;
    patterns: string[];
    anti_patterns: string[];
    best_practices: string[];
}
interface PredictiveAlert {
    id: string;
    alert_type: 'error_risk' | 'performance_risk' | 'security_risk';
    confidence: number;
    description: string;
    prevention_steps: string[];
    resources: string[];
}
/**
 * Expert System Enhancements
 * Transforms basic memory into world-class expert that learns from mistakes
 */
export declare class ExpertSystemEnhancements {
    private sessionId;
    private supabase;
    private errorPatterns;
    private auditTrail;
    private domainSpecializations;
    private preventiveMeasures;
    constructor(sessionId: string);
    /**
     * 1. ERROR PATTERN RECOGNITION
     * Automatically identifies, learns, and prevents recurring errors
     */
    recordError(errorType: string, context: Record<string, any>, solution: string, preventionRules: string[]): Promise<ErrorPattern>;
    /**
     * Predict and prevent errors BEFORE they happen
     */
    predictErrors(context: Record<string, any>): Promise<PredictiveAlert[]>;
    /**
     * 2. DECISION AUDIT TRAIL
     * Complete history of decisions for analysis and learning
     */
    recordDecisionAudit(recommendation: string, confidence: number, context: Record<string, any>, implementationResult: 'success' | 'failed' | 'partial', lessonsLearned: string, metrics: any): Promise<DecisionAudit>;
    /**
     * 3. DOMAIN SPECIALIZATION
     * Expert becomes specialized in your specific domain over time
     */
    specializeDomain(domain: string, successCount: number, failureCount: number, patterns: string[], antiPatterns: string[], bestPractices: string[]): Promise<DomainSpecialization>;
    /**
     * 4. COST-ACCURACY OPTIMIZER
     * Balances between solution complexity and accuracy/reliability
     */
    optimizeForCostAccuracy(context: Record<string, any>, complexity_budget: 'low' | 'medium' | 'high'): Promise<{
        recommendation: string;
        expected_success_rate: number;
        implementation_cost: number;
        maintenance_cost: number;
    }>;
    /**
     * 5. COMPARATIVE ANALYSIS
     * "When I did something similar before, here's what happened..."
     */
    findComparableSituations(currentContext: Record<string, any>, similarity_threshold?: number): Promise<Array<{
        audit: DecisionAudit;
        similarity: number;
        recommendation: string;
        outcome: string;
    }>>;
    /**
     * 6. ACTIVE LEARNING
     * System actively asks questions to improve expertise
     */
    generateLearningQuestions(domain: string): Promise<string[]>;
    /**
     * 7. PEER LEARNING (Anonymized)
     * Learn from similar users in same domain
     */
    shareLearnings(domain: string, isAnonymous?: boolean): Promise<void>;
    /**
     * 8. CORRECTION LOOP
     * System recognizes when it made a mistake and corrects itself
     */
    recordCorrection(originalRecommendation: string, correctedRecommendation: string, reason: string): Promise<void>;
    /**
     * 9. RISK ASSESSMENT
     * Evaluate risk of recommendation before implementing
     */
    assessRisk(recommendation: string, context: Record<string, any>): Promise<{
        risk_level: 'low' | 'medium' | 'high';
        risk_score: number;
        identified_risks: string[];
        mitigation_strategies: string[];
    }>;
    /**
     * 10. EXPERTISE REPORT
     * Show how expert the system has become
     */
    getExpertiseReport(): Promise<{
        overall_expertise: number;
        domains: DomainSpecialization[];
        error_prevention_rate: number;
        success_rate: number;
        total_decisions: number;
        learning_trajectory: string;
        recommendations: string[];
    }>;
    /**
     * Helper: Calculate context similarity
     */
    private matchesContext;
    /**
     * Helper: Generate recommendations for improvement
     */
    private generateRecommendations;
}
export type { ErrorPattern, DecisionAudit, DomainSpecialization, PredictiveAlert };
//# sourceMappingURL=expert-system-enhancements.d.ts.map