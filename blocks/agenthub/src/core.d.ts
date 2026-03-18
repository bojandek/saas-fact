/**
 * AgentHub Core Engine
 *
 * The heart of multi-agent collaboration system
 * Handles versioning, proposals, merging, and conflict resolution
 */
import { Artifact, InitWorkspaceRequest, MergeRequest, ProposeRequest, Workspace } from './types';
export declare class AgentHubCore {
    private supabase;
    private anthropic;
    private workspaces;
    constructor(supabaseUrl: string, supabaseKey: string, anthropicKey: string);
    /**
     * Initialize a new workspace with team of agents
     */
    initWorkspace(request: InitWorkspaceRequest): Promise<Workspace>;
    /**
     * Get workspace by ID
     */
    getWorkspace(workspaceId: string): Promise<Workspace | null>;
    /**
     * Agent proposes a change/artifact
     */
    propose(workspaceId: string, request: ProposeRequest): Promise<Artifact>;
    /**
     * Detect conflicts with existing artifacts
     */
    private detectConflicts;
    /**
     * Create conflict record
     */
    private createConflict;
    /**
     * Merge artifact with auto-resolution
     */
    merge(workspaceId: string, mergeRequest: MergeRequest): Promise<Artifact>;
    /**
     * AI-powered conflict resolution
     */
    private resolveConflict;
    /**
     * Record successful agent decision for future learning
     */
    private recordAgentLearning;
    private persistArtifact;
    private agentNameFromRole;
    private getSystemPromptForRole;
    private getCapabilitiesForRole;
}
//# sourceMappingURL=core.d.ts.map