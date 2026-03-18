/**
 * Factory Brain AI Agents
 * Orchestrates Claude API for various SaaS tasks
 */
export declare class ArchitectAgent {
    /**
     * Design SaaS architecture based on requirements
     * Enhanced with RAG knowledge and learned patterns
     */
    designArchitecture(requirements: string): Promise<string>;
    /**
     * Generate project scaffolding code
     */
    generateScaffold(saasType: string, techStack: string[]): Promise<string>;
}
export declare class CodeReviewAgent {
    /**
     * Review code for best practices, security, performance
     */
    review(code: string, context?: string): Promise<string>;
}
export declare class DesignAgent {
    /**
     * Recommend UI/UX design based on Apple HIG and Laws of UX
     */
    recommendDesign(feature: string): Promise<string>;
}
export { ArchitectAgent, CodeReviewAgent, DesignAgent };
//# sourceMappingURL=agents.d.ts.map