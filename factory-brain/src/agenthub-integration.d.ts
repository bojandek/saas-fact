/**
 * AgentHub Integration for Factory Brain
 * Connects existing agents (ArchitectAgent, CodeReviewAgent, etc.) to AgentHub collaborative system
 * Enables artifact versioning, proposal-based collaboration, and conflict resolution
 */
import { Artifact } from '../../blocks/agenthub/src/core';
export interface AgentHubIntegrationConfig {
    supabaseUrl: string;
    supabaseKey: string;
    anthropicKey: string;
    projectId: string;
}
/**
 * Factory Brain with AgentHub Collaboration
 */
export declare class FactoryBrainWithAgentHub {
    private agenthub;
    private architectAgent;
    private codeReviewAgent;
    private designAgent;
    private contentAgent;
    private dataAgent;
    private memory;
    private rag;
    private workspaceId;
    constructor(config: AgentHubIntegrationConfig);
    /**
     * Initialize collaboration workspace for a SaaS project
     */
    initializeWorkspace(projectId: string): Promise<string>;
    /**
     * Design SaaS architecture with AgentHub collaboration
     */
    designArchitectureCollaboratively(requirements: string): Promise<{
        architecture: string;
        artifacts: Artifact[];
    }>;
    /**
     * Generate full project scaffold with team collaboration
     */
    generateScaffoldCollaboratively(saasType: string, techStack: string[]): Promise<{
        scaffold: string;
        artifacts: Artifact[];
    }>;
    /**
     * Generate marketing copy with design collaboration
     */
    generateMarketingCollaboratively(productName: string, targetAudience: string, tone: string): Promise<{
        copy: string;
        design: string;
        artifacts: Artifact[];
    }>;
    /**
     * Analyze project data with SQL generation
     */
    analyzeDataCollaboratively(tableName: string, filters: string[], metrics: string[]): Promise<{
        query: string;
        analysis: string;
        artifacts: Artifact[];
    }>;
    /**
     * Get workspace history and learned patterns
     */
    getWorkspaceHistory(): Promise<{
        totalArtifacts: number;
        artifactsByType: Record<string, number>;
        learnedPatterns: any[];
        agentStats: any[];
    }>;
    /**
     * Run complete project generation with agent collaboration
     */
    runFullProjectGeneration(projectSpec: {
        projectId: string;
        name: string;
        description: string;
        techStack: string[];
        targetAudience: string;
    }): Promise<void>;
}
/**
 * Example usage function
 */
export declare function exampleUsage(): Promise<void>;
//# sourceMappingURL=agenthub-integration.d.ts.map