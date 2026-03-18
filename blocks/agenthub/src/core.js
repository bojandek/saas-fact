"use strict";
/**
 * AgentHub Core Engine
 *
 * The heart of multi-agent collaboration system
 * Handles versioning, proposals, merging, and conflict resolution
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentHubCore = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const nanoid_1 = require("nanoid");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class AgentHubCore {
    constructor(supabaseUrl, supabaseKey, anthropicKey) {
        this.workspaces = new Map();
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.anthropic = new sdk_1.default({ apiKey: anthropicKey });
    }
    // ============ Workspace Management ============
    /**
     * Initialize a new workspace with team of agents
     */
    async initWorkspace(request) {
        const workspaceId = (0, nanoid_1.nanoid)();
        const agents = request.team.map((role) => ({
            id: (0, nanoid_1.nanoid)(),
            name: this.agentNameFromRole(role),
            role,
            model: 'claude-3-5-sonnet-20241022',
            systemPrompt: this.getSystemPromptForRole(role),
            capabilities: this.getCapabilitiesForRole(role),
            trustLevel: 0.7,
        }));
        const workspace = {
            id: workspaceId,
            projectId: request.projectId,
            name: request.name || `Workspace for ${request.projectId}`,
            agents,
            artifacts: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.workspaces.set(workspaceId, workspace);
        // Persist to Supabase
        await this.supabase.from('agenthub_workspaces').insert({
            id: workspaceId,
            project_id: request.projectId,
            name: workspace.name,
            agents: agents,
            created_at: workspace.createdAt,
            updated_at: workspace.updatedAt,
        });
        return workspace;
    }
    /**
     * Get workspace by ID
     */
    async getWorkspace(workspaceId) {
        if (this.workspaces.has(workspaceId)) {
            return this.workspaces.get(workspaceId);
        }
        const { data } = await this.supabase
            .from('agenthub_workspaces')
            .select('*')
            .eq('id', workspaceId)
            .single();
        if (!data)
            return null;
        const workspace = data;
        this.workspaces.set(workspaceId, workspace);
        return workspace;
    }
    // ============ Proposal System ============
    /**
     * Agent proposes a change/artifact
     */
    async propose(workspaceId, request) {
        const workspace = await this.getWorkspace(workspaceId);
        if (!workspace)
            throw new Error(`Workspace ${workspaceId} not found`);
        const agent = workspace.agents.find((a) => a.id === request.agentId);
        if (!agent)
            throw new Error(`Agent ${request.agentId} not found`);
        const artifact = {
            id: (0, nanoid_1.nanoid)(),
            projectId: workspace.projectId,
            type: request.artifactType,
            version: 1,
            agentId: agent.id,
            agentRole: agent.role,
            content: request.content,
            title: request.title,
            description: request.description,
            reasoning: request.reasoning,
            status: 'proposed',
            tags: [agent.role],
            metadata: {
                riskLevel: request.riskLevel || 'medium',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Check for conflicts with existing artifacts of same type
        const conflicts = await this.detectConflicts(workspace, artifact);
        if (conflicts.length > 0) {
            artifact.status = 'conflict';
            // Initiate conflict resolution
            for (const conflictingArtifact of conflicts) {
                await this.createConflict(workspace, artifact, conflictingArtifact);
            }
        }
        workspace.artifacts.push(artifact);
        await this.persistArtifact(artifact);
        return artifact;
    }
    /**
     * Detect conflicts with existing artifacts
     */
    async detectConflicts(workspace, newArtifact) {
        return workspace.artifacts.filter((art) => art.type === newArtifact.type &&
            art.status === 'approved' &&
            art.agentRole !== newArtifact.agentRole // Different agent same type
        );
    }
    /**
     * Create conflict record
     */
    async createConflict(workspace, artifact1, artifact2) {
        const conflictId = (0, nanoid_1.nanoid)();
        const conflict = {
            id: conflictId,
            projectId: workspace.projectId,
            artifactId: artifact1.id,
            proposalIds: [],
            agentIds: [artifact1.agentId, artifact2.agentId],
            conflictDescription: `${artifact1.agentRole} proposes vs ${artifact2.agentRole} approved`,
            resolutionStrategy: 'ai-judge',
            status: 'pending',
            createdAt: new Date(),
        };
        await this.supabase
            .from('agenthub_conflicts')
            .insert({
            ...conflict,
            created_at: conflict.createdAt,
        });
        return conflict;
    }
    // ============ Merge System ============
    /**
     * Merge artifact with auto-resolution
     */
    async merge(workspaceId, mergeRequest) {
        const workspace = await this.getWorkspace(workspaceId);
        if (!workspace)
            throw new Error(`Workspace ${workspaceId} not found`);
        const artifact = workspace.artifacts.find((a) => a.id === mergeRequest.artifactId);
        if (!artifact)
            throw new Error(`Artifact ${mergeRequest.artifactId} not found`);
        // Check if there are conflicts
        if (artifact.status === 'conflict') {
            const resolved = await this.resolveConflict(workspace, artifact);
            artifact.status = resolved ? 'merged' : 'conflict';
        }
        else {
            artifact.status = 'merged';
            artifact.approvedAt = new Date();
            artifact.approvedBy = 'system-auto-merge';
        }
        artifact.updatedAt = new Date();
        await this.persistArtifact(artifact);
        // Record learning
        await this.recordAgentLearning(workspace, artifact);
        return artifact;
    }
    /**
     * AI-powered conflict resolution
     */
    async resolveConflict(workspace, artifact) {
        const conflictingArtifacts = workspace.artifacts.filter((a) => a.type === artifact.type && a.status === 'approved' && a.id !== artifact.id);
        if (conflictingArtifacts.length === 0)
            return true;
        const proposals = conflictingArtifacts.concat(artifact);
        const response = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: `You are a conflict resolution expert for AI agent teams. 
      Analyze conflicting proposals and determine the best one based on:
      1. Technical soundness
      2. Alignment with project goals
      3. Risk assessment
      4. Integration feasibility
      
      Return ONLY a JSON object with { selectedId: "artifact_id", reasoning: "..." }`,
            messages: [
                {
                    role: 'user',
                    content: `Conflict Resolution Request:
          
          ${proposals
                        .map((p) => `
          Agent: ${p.agentRole}
          Title: ${p.title}
          Content: ${p.content.substring(0, 500)}...
          Reasoning: ${p.reasoning}
          Risk: ${p.metadata?.riskLevel || 'unknown'}
          `)
                        .join('\n---\n')}
          
          Which proposal should be selected?`,
                },
            ],
        });
        if (response.content[0].type !== 'text')
            return false;
        try {
            const resolution = JSON.parse(response.content[0].text);
            artifact.status = 'merged';
            artifact.approvedBy = resolution.selectedId;
            artifact.approvedAt = new Date();
            return true;
        }
        catch {
            return false;
        }
    }
    // ============ Learning System ============
    /**
     * Record successful agent decision for future learning
     */
    async recordAgentLearning(workspace, artifact) {
        const learning = {
            id: (0, nanoid_1.nanoid)(),
            agentId: artifact.agentId,
            projectId: workspace.projectId,
            pattern: `${artifact.type}:${artifact.agentRole}:success`,
            successRate: 0.8,
            applicationContext: artifact.title,
            collaboratorIds: workspace.agents
                .filter((a) => a.id !== artifact.agentId)
                .map((a) => a.id),
            timestamp: new Date(),
        };
        await this.supabase.from('agenthub_learning').insert({
            id: learning.id,
            agent_id: learning.agentId,
            project_id: learning.projectId,
            pattern: learning.pattern,
            success_rate: learning.successRate,
            application_context: learning.applicationContext,
            collaborator_ids: learning.collaboratorIds,
            timestamp: learning.timestamp,
        });
        return learning;
    }
    // ============ Database Persistence ============
    async persistArtifact(artifact) {
        await this.supabase.from('agenthub_artifacts').upsert({
            id: artifact.id,
            project_id: artifact.projectId,
            type: artifact.type,
            version: artifact.version,
            agent_id: artifact.agentId,
            agent_role: artifact.agentRole,
            content: artifact.content,
            title: artifact.title,
            description: artifact.description,
            reasoning: artifact.reasoning,
            status: artifact.status,
            tags: artifact.tags,
            metadata: artifact.metadata,
            created_at: artifact.createdAt,
            updated_at: artifact.updatedAt,
        });
    }
    // ============ Helper Methods ============
    agentNameFromRole(role) {
        const names = {
            architect: 'Dr. Blueprint',
            coder: 'Alex Code',
            designer: 'Elena Design',
            marketer: 'Marcus Growth',
            security: 'Cipher Security',
            devops: 'Cloud Deploy',
            analytics: 'Data Sage',
            product: 'Priya Product',
        };
        return names[role];
    }
    getSystemPromptForRole(role) {
        const prompts = {
            architect: `You are a world-class software architect specializing in scalable SaaS systems.
      Your role is to design robust, maintainable architectures.
      Always consider multi-tenancy, scalability, and security.`,
            coder: `You are an expert full-stack engineer specializing in TypeScript/Next.js.
      Write production-ready code with comprehensive error handling.
      Always follow SOLID principles and design patterns.`,
            designer: `You are a world-class product designer focused on user experience and conversion.
      Design beautiful, intuitive interfaces that delight users.
      Consider accessibility and mobile-first design.`,
            marketer: `You are a growth marketing expert specializing in B2B SaaS.
      Create data-driven marketing strategies and compelling copy.
      Focus on acquisition, retention, and revenue growth.`,
            security: `You are a security architect specializing in SaaS threat modeling.
      Review all systems for vulnerabilities and compliance.
      Ensure data protection, authentication, and authorization.`,
            devops: `You are a DevOps expert specializing in cloud infrastructure.
      Design resilient, highly available systems on AWS/GCP.
      Optimize for cost, performance, and reliability.`,
            analytics: `You are a data scientist and analytics expert.
      Design data warehouses and create actionable insights.
      Focus on metrics that drive business decisions.`,
            product: `You are a product manager specializing in B2B SaaS.
      Define product strategy, roadmaps, and feature prioritization.
      Focus on market fit, retention, and revenue.`,
        };
        return prompts[role];
    }
    getCapabilitiesForRole(role) {
        const capabilities = {
            architect: [
                'system-design',
                'technology-selection',
                'pattern-definition',
                'scalability-analysis',
            ],
            coder: [
                'code-generation',
                'bug-fixing',
                'refactoring',
                'testing',
                'optimization',
            ],
            designer: [
                'ui-design',
                'ux-research',
                'prototyping',
                'design-systems',
                'animation',
            ],
            marketer: [
                'messaging',
                'copywriting',
                'campaign-planning',
                'market-research',
            ],
            security: [
                'threat-modeling',
                'vulnerability-assessment',
                'compliance-audit',
                'security-review',
            ],
            devops: [
                'infrastructure-design',
                'deployment-automation',
                'monitoring-setup',
                'disaster-recovery',
            ],
            analytics: ['data-modeling', 'metric-definition', 'reporting', 'ml-models'],
            product: [
                'roadmap-planning',
                'feature-definition',
                'user-research',
                'metrics-tracking',
            ],
        };
        return capabilities[role];
    }
}
exports.AgentHubCore = AgentHubCore;
//# sourceMappingURL=core.js.map