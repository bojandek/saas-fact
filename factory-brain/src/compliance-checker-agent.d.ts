interface ComplianceCheckResult {
    category: string;
    status: 'compliant' | 'suggestion' | 'warning' | 'critical';
    message: string;
    recommendations?: string[];
}
export declare class ComplianceCheckerAgent {
    private llm;
    private ragSystem;
    constructor();
    checkCompliance(saasDescription: string, generatedTheme: any, generatedBlueprint: any, generatedLandingPage: any, generatedGrowthPlan: any): Promise<ComplianceCheckResult[]>;
}
export {};
//# sourceMappingURL=compliance-checker-agent.d.ts.map