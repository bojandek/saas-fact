/**
 * AgentHub Core Engine
 * 
 * The heart of multi-agent collaboration system
 * Handles versioning, proposals, merging, and conflict resolution
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import Anthropic from '@anthropic-ai/sdk'
import {
  Agent,
  Artifact,
  ArtifactStatus,
  ArtifactType,
  Conflict,
  InitWorkspaceRequest,
  MergeRequest,
  Proposal,
  ProposeRequest,
  Workspace,
  AgentRole,
  MergeQueueItem,
  AgentLearning,
} from './types'

export class AgentHubCore {
  private supabase: SupabaseClient
  private anthropic: Anthropic
  private workspaces: Map<string, Workspace> = new Map()

  constructor(supabaseUrl: string, supabaseKey: string, anthropicKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.anthropic = new Anthropic({ apiKey: anthropicKey })
  }

  // ============ Workspace Management ============

  /**
   * Initialize a new workspace with team of agents
   */
  async initWorkspace(request: InitWorkspaceRequest): Promise<Workspace> {
    const workspaceId = nanoid()

    const agents: Agent[] = request.team.map((role) => ({
      id: nanoid(),
      name: this.agentNameFromRole(role),
      role,
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: this.getSystemPromptForRole(role),
      capabilities: this.getCapabilitiesForRole(role),
      trustLevel: 0.7,
    }))

    const workspace: Workspace = {
      id: workspaceId,
      projectId: request.projectId,
      name: request.name || `Workspace for ${request.projectId}`,
      agents,
      artifacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.workspaces.set(workspaceId, workspace)

    // Persist to Supabase
    await this.supabase.from('agenthub_workspaces').insert({
      id: workspaceId,
      project_id: request.projectId,
      name: workspace.name,
      agents: agents,
      created_at: workspace.createdAt,
      updated_at: workspace.updatedAt,
    })

    return workspace
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    if (this.workspaces.has(workspaceId)) {
      return this.workspaces.get(workspaceId)!
    }

    const { data } = await this.supabase
      .from('agenthub_workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (!data) return null
    const workspace = data as Workspace
    this.workspaces.set(workspaceId, workspace)
    return workspace
  }

  // ============ Proposal System ============

  /**
   * Agent proposes a change/artifact
   */
  async propose(
    workspaceId: string,
    request: ProposeRequest
  ): Promise<Artifact> {
    const workspace = await this.getWorkspace(workspaceId)
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`)

    const agent = workspace.agents.find((a: Agent) => a.id === request.agentId)
    if (!agent) throw new Error(`Agent ${request.agentId} not found`)

    const artifact: Artifact = {
      id: nanoid(),
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
    }

    // Check for conflicts with existing artifacts of same type
    const conflicts = await this.detectConflicts(workspace, artifact)
    if (conflicts.length > 0) {
      artifact.status = 'conflict'
      // Initiate conflict resolution
      for (const conflictingArtifact of conflicts) {
        await this.createConflict(workspace, artifact, conflictingArtifact)
      }
    }

    workspace.artifacts.push(artifact)
    await this.persistArtifact(artifact)

    return artifact
  }

  /**
   * Detect conflicts with existing artifacts
   */
  private async detectConflicts(
    workspace: Workspace,
    newArtifact: Artifact
  ): Promise<Artifact[]> {
    return workspace.artifacts.filter(
      (art: Artifact) =>
        art.type === newArtifact.type &&
        art.status === 'approved' &&
        art.agentRole !== newArtifact.agentRole // Different agent same type
    )
  }

  /**
   * Create conflict record
   */
  private async createConflict(
    workspace: Workspace,
    artifact1: Artifact,
    artifact2: Artifact
  ): Promise<Conflict> {
    const conflictId = nanoid()
    const conflict: Conflict = {
      id: conflictId,
      projectId: workspace.projectId,
      artifactId: artifact1.id,
      proposalIds: [],
      agentIds: [artifact1.agentId, artifact2.agentId],
      conflictDescription: `${artifact1.agentRole} proposes vs ${artifact2.agentRole} approved`,
      resolutionStrategy: 'ai-judge',
      status: 'pending',
      createdAt: new Date(),
    }

    await this.supabase
      .from('agenthub_conflicts')
      .insert({
        ...conflict,
        created_at: conflict.createdAt,
      })

    return conflict
  }

  // ============ Merge System ============

  /**
   * Merge artifact with auto-resolution
   */
  async merge(workspaceId: string, mergeRequest: MergeRequest): Promise<Artifact> {
    const workspace = await this.getWorkspace(workspaceId)
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`)

    const artifact = workspace.artifacts.find((a: Artifact) => a.id === mergeRequest.artifactId)
    if (!artifact) throw new Error(`Artifact ${mergeRequest.artifactId} not found`)

    // Check if there are conflicts
    if (artifact.status === 'conflict') {
      const resolved = await this.resolveConflict(workspace, artifact)
      artifact.status = resolved ? 'merged' : 'conflict'
    } else {
      artifact.status = 'merged'
      artifact.approvedAt = new Date()
      artifact.approvedBy = 'system-auto-merge'
    }

    artifact.updatedAt = new Date()
    await this.persistArtifact(artifact)

    // Record learning
    await this.recordAgentLearning(workspace, artifact)

    return artifact
  }

  /**
   * AI-powered conflict resolution
   */
  private async resolveConflict(workspace: Workspace, artifact: Artifact): Promise<boolean> {
    const conflictingArtifacts = workspace.artifacts.filter(
      (a: Artifact) => a.type === artifact.type && a.status === 'approved' && a.id !== artifact.id
    )

    if (conflictingArtifacts.length === 0) return true

    const proposals = conflictingArtifacts.concat(artifact)

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
            .map(
              (p: Artifact) => `
          Agent: ${p.agentRole}
          Title: ${p.title}
          Content: ${p.content.substring(0, 500)}...
          Reasoning: ${p.reasoning}
          Risk: ${p.metadata?.riskLevel || 'unknown'}
          `
            )
            .join('\n---\n')}
          
          Which proposal should be selected?`,
        },
      ],
    })

    if (response.content[0].type !== 'text') return false

    try {
      const resolution = JSON.parse(response.content[0].text)
      artifact.status = 'merged'
      artifact.approvedBy = resolution.selectedId
      artifact.approvedAt = new Date()
      return true
    } catch {
      return false
    }
  }

  // ============ Learning System ============

  /**
   * Record successful agent decision for future learning
   */
  private async recordAgentLearning(
    workspace: Workspace,
    artifact: Artifact
  ): Promise<AgentLearning> {
    const learning: AgentLearning = {
      id: nanoid(),
      agentId: artifact.agentId,
      projectId: workspace.projectId,
      pattern: `${artifact.type}:${artifact.agentRole}:success`,
      successRate: 0.8,
      applicationContext: artifact.title,
      collaboratorIds: workspace.agents
        .filter((a: Agent) => a.id !== artifact.agentId)
        .map((a: Agent) => a.id),
      timestamp: new Date(),
    }

    await this.supabase.from('agenthub_learning').insert({
      id: learning.id,
      agent_id: learning.agentId,
      project_id: learning.projectId,
      pattern: learning.pattern,
      success_rate: learning.successRate,
      application_context: learning.applicationContext,
      collaborator_ids: learning.collaboratorIds,
      timestamp: learning.timestamp,
    })

    return learning
  }

  // ============ Database Persistence ============

  private async persistArtifact(artifact: Artifact): Promise<void> {
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
    })
  }

  // ============ Helper Methods ============

  private agentNameFromRole(role: AgentRole): string {
    const names: Record<AgentRole, string> = {
      architect: 'Dr. Blueprint',
      coder: 'Alex Code',
      designer: 'Elena Design',
      marketer: 'Marcus Growth',
      security: 'Cipher Security',
      devops: 'Cloud Deploy',
      analytics: 'Data Sage',
      product: 'Priya Product',
    }
    return names[role]
  }

  private getSystemPromptForRole(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
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
    }
    return prompts[role]
  }

  private getCapabilitiesForRole(role: AgentRole): string[] {
    const capabilities: Record<AgentRole, string[]> = {
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
    }
    return capabilities[role]
  }
}
