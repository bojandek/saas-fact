/**
 * War Room Orchestrator
 *
 * Coordinates all AI agents in the SaaS Factory pipeline.
 *
 * Key improvement: Independent agents now run in PARALLEL using Promise.all(),
 * reducing total pipeline time by 40-60% compared to sequential execution.
 *
 * Dependency graph:
 *
 *   [description] → [theme] → [blueprint] → [landing-page]
 *                                         ↘
 *                                           [growth + compliance + qa + legal] (PARALLEL)
 *                                         ↗
 *                                           → [deploy]
 */
export interface AgentMessage {
    sender: string;
    recipient: string;
    type: 'request' | 'response' | 'info' | 'decision' | 'critical';
    content: string;
    payload?: unknown;
    timestamp?: string;
}
export interface AgentContext {
    saasDescription: string;
    appName: string;
    theme?: unknown;
    blueprint?: unknown;
    landingPage?: unknown;
    growthPlan?: unknown;
    complianceChecks?: unknown;
    qaResults?: unknown;
    legalDocs?: unknown;
    deploymentResult?: unknown;
}
export interface AgentTask<T> {
    name: string;
    run: () => Promise<T>;
}
export interface ParallelResult<T> {
    name: string;
    status: 'fulfilled' | 'rejected';
    value?: T;
    error?: Error;
}
export declare class WarRoomOrchestrator {
    private llm;
    private messageLog;
    private context;
    private log;
    constructor(initialContext: AgentContext);
    sendMessage(message: AgentMessage): Promise<void>;
    getMessageLog(): AgentMessage[];
    updateContext(newContext: Partial<AgentContext>): void;
    getContext(): AgentContext;
    /**
     * Run agents sequentially (for dependent steps).
     * Each agent must complete before the next begins.
     */
    orchestrateSequential(agents: AgentTask<unknown>[]): Promise<void>;
    /**
     * Run independent agents in PARALLEL using Promise.allSettled().
     *
     * Unlike Promise.all(), allSettled() waits for all agents to complete
     * even if some fail, allowing partial results and better error reporting.
     *
     * @returns Array of results with status for each agent
     */
    orchestrateParallel<T>(agents: AgentTask<T>[]): Promise<ParallelResult<T>[]>;
    /**
     * Run the full SaaS generation pipeline with optimal parallelism.
     *
     * Pipeline stages:
     *   Stage 1 (sequential): theme → blueprint → landing-page
     *   Stage 2 (parallel):   growth-plan + compliance + qa-tests + legal-docs
     *   Stage 3 (sequential): deploy
     */
    runFullPipeline(pipelineAgents: {
        theme: AgentTask<unknown>;
        blueprint: AgentTask<unknown>;
        landingPage: AgentTask<unknown>;
        growthPlan: AgentTask<unknown>;
        compliance: AgentTask<unknown>;
        qaTests: AgentTask<unknown>;
        legalDocs: AgentTask<unknown>;
        deploy: AgentTask<unknown>;
    }): Promise<void>;
    /** @deprecated Use orchestrateSequential() or orchestrateParallel() instead */
    orchestrateRound(agents: Array<{
        name: string;
    }>): Promise<void>;
}
export type { AgentContext as AgentContextType };
//# sourceMappingURL=war-room-orchestrator.d.ts.map