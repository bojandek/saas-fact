/**
 * AgentHub Type Definitions
 * Core data structures for multi-agent collaboration
 */
import { z } from 'zod';
export declare const AgentRoleSchema: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const AgentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
    model: z.ZodDefault<z.ZodString>;
    systemPrompt: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodArray<z.ZodString, "many">;
    trustLevel: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    model?: string;
    systemPrompt?: string;
    capabilities?: string[];
    trustLevel?: number;
}, {
    id?: string;
    name?: string;
    role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    model?: string;
    systemPrompt?: string;
    capabilities?: string[];
    trustLevel?: number;
}>;
export type Agent = z.infer<typeof AgentSchema>;
export declare const ArtifactTypeSchema: z.ZodEnum<["architecture", "code", "design", "copy", "analysis", "decision", "risk-assessment", "optimization"]>;
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export declare const ArtifactStatus: z.ZodEnum<["draft", "proposed", "approved", "merged", "rejected", "conflict", "archived"]>;
export type ArtifactStatus = z.infer<typeof ArtifactStatus>;
export declare const ArtifactSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    type: z.ZodEnum<["architecture", "code", "design", "copy", "analysis", "decision", "risk-assessment", "optimization"]>;
    version: z.ZodNumber;
    agentId: z.ZodString;
    agentRole: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
    content: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    reasoning: z.ZodString;
    status: z.ZodEnum<["draft", "proposed", "approved", "merged", "rejected", "conflict", "archived"]>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    parentArtifactId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    approvedBy: z.ZodOptional<z.ZodString>;
    approvedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
    status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
    id?: string;
    projectId?: string;
    version?: number;
    agentId?: string;
    agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    content?: string;
    title?: string;
    description?: string;
    reasoning?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    parentArtifactId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
}, {
    type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
    status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
    id?: string;
    projectId?: string;
    version?: number;
    agentId?: string;
    agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    content?: string;
    title?: string;
    description?: string;
    reasoning?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    parentArtifactId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
}>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export declare const ProposalSchema: z.ZodObject<{
    id: z.ZodString;
    artifactId: z.ZodString;
    agentId: z.ZodString;
    agentRole: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
    projectId: z.ZodString;
    changeDescription: z.ZodString;
    diff: z.ZodString;
    impact: z.ZodString;
    riskLevel: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    confidenceScore: z.ZodNumber;
    reasoning: z.ZodString;
    status: z.ZodEnum<["pending", "approved", "merged", "rejected"]>;
    createdAt: z.ZodDate;
    reviewedAt: z.ZodOptional<z.ZodDate>;
    reviewedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "approved" | "merged" | "rejected" | "pending";
    id?: string;
    projectId?: string;
    agentId?: string;
    agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    reasoning?: string;
    createdAt?: Date;
    artifactId?: string;
    changeDescription?: string;
    diff?: string;
    impact?: string;
    riskLevel?: "low" | "medium" | "high";
    confidenceScore?: number;
    reviewedAt?: Date;
    reviewedBy?: string;
}, {
    status?: "approved" | "merged" | "rejected" | "pending";
    id?: string;
    projectId?: string;
    agentId?: string;
    agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
    reasoning?: string;
    createdAt?: Date;
    artifactId?: string;
    changeDescription?: string;
    diff?: string;
    impact?: string;
    riskLevel?: "low" | "medium" | "high";
    confidenceScore?: number;
    reviewedAt?: Date;
    reviewedBy?: string;
}>;
export type Proposal = z.infer<typeof ProposalSchema>;
export declare const ConflictSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    artifactId: z.ZodString;
    proposalIds: z.ZodArray<z.ZodString, "many">;
    agentIds: z.ZodArray<z.ZodString, "many">;
    conflictDescription: z.ZodString;
    resolutionStrategy: z.ZodEnum<["merge", "voting", "ai-judge", "manual"]>;
    status: z.ZodEnum<["pending", "resolved", "escalated"]>;
    resolution: z.ZodOptional<z.ZodString>;
    selectedProposalId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    resolvedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "resolved" | "escalated";
    id?: string;
    projectId?: string;
    createdAt?: Date;
    artifactId?: string;
    proposalIds?: string[];
    agentIds?: string[];
    conflictDescription?: string;
    resolutionStrategy?: "merge" | "voting" | "ai-judge" | "manual";
    resolution?: string;
    selectedProposalId?: string;
    resolvedAt?: Date;
}, {
    status?: "pending" | "resolved" | "escalated";
    id?: string;
    projectId?: string;
    createdAt?: Date;
    artifactId?: string;
    proposalIds?: string[];
    agentIds?: string[];
    conflictDescription?: string;
    resolutionStrategy?: "merge" | "voting" | "ai-judge" | "manual";
    resolution?: string;
    selectedProposalId?: string;
    resolvedAt?: Date;
}>;
export type Conflict = z.infer<typeof ConflictSchema>;
export declare const WorkspaceSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    agents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
        model: z.ZodDefault<z.ZodString>;
        systemPrompt: z.ZodOptional<z.ZodString>;
        capabilities: z.ZodArray<z.ZodString, "many">;
        trustLevel: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        model?: string;
        systemPrompt?: string;
        capabilities?: string[];
        trustLevel?: number;
    }, {
        id?: string;
        name?: string;
        role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        model?: string;
        systemPrompt?: string;
        capabilities?: string[];
        trustLevel?: number;
    }>, "many">;
    artifacts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        projectId: z.ZodString;
        type: z.ZodEnum<["architecture", "code", "design", "copy", "analysis", "decision", "risk-assessment", "optimization"]>;
        version: z.ZodNumber;
        agentId: z.ZodString;
        agentRole: z.ZodEnum<["architect", "coder", "designer", "marketer", "security", "devops", "analytics", "product"]>;
        content: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        reasoning: z.ZodString;
        status: z.ZodEnum<["draft", "proposed", "approved", "merged", "rejected", "conflict", "archived"]>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        parentArtifactId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        approvedBy: z.ZodOptional<z.ZodString>;
        approvedAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
        status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
        id?: string;
        projectId?: string;
        version?: number;
        agentId?: string;
        agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        content?: string;
        title?: string;
        description?: string;
        reasoning?: string;
        tags?: string[];
        metadata?: Record<string, any>;
        parentArtifactId?: string;
        createdAt?: Date;
        updatedAt?: Date;
        approvedBy?: string;
        approvedAt?: Date;
    }, {
        type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
        status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
        id?: string;
        projectId?: string;
        version?: number;
        agentId?: string;
        agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        content?: string;
        title?: string;
        description?: string;
        reasoning?: string;
        tags?: string[];
        metadata?: Record<string, any>;
        parentArtifactId?: string;
        createdAt?: Date;
        updatedAt?: Date;
        approvedBy?: string;
        approvedAt?: Date;
    }>, "many">;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    projectId?: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    agents?: {
        id?: string;
        name?: string;
        role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        model?: string;
        systemPrompt?: string;
        capabilities?: string[];
        trustLevel?: number;
    }[];
    artifacts?: {
        type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
        status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
        id?: string;
        projectId?: string;
        version?: number;
        agentId?: string;
        agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        content?: string;
        title?: string;
        description?: string;
        reasoning?: string;
        tags?: string[];
        metadata?: Record<string, any>;
        parentArtifactId?: string;
        createdAt?: Date;
        updatedAt?: Date;
        approvedBy?: string;
        approvedAt?: Date;
    }[];
}, {
    id?: string;
    name?: string;
    projectId?: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    agents?: {
        id?: string;
        name?: string;
        role?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        model?: string;
        systemPrompt?: string;
        capabilities?: string[];
        trustLevel?: number;
    }[];
    artifacts?: {
        type?: "code" | "architecture" | "design" | "copy" | "analysis" | "decision" | "risk-assessment" | "optimization";
        status?: "draft" | "proposed" | "approved" | "merged" | "rejected" | "conflict" | "archived";
        id?: string;
        projectId?: string;
        version?: number;
        agentId?: string;
        agentRole?: "architect" | "coder" | "designer" | "marketer" | "security" | "devops" | "analytics" | "product";
        content?: string;
        title?: string;
        description?: string;
        reasoning?: string;
        tags?: string[];
        metadata?: Record<string, any>;
        parentArtifactId?: string;
        createdAt?: Date;
        updatedAt?: Date;
        approvedBy?: string;
        approvedAt?: Date;
    }[];
}>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export declare const MergeQueueItemSchema: z.ZodObject<{
    id: z.ZodString;
    artifactId: z.ZodString;
    proposalId: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodNumber>;
    dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["waiting", "processing", "merged", "failed"]>;
    error: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status?: "merged" | "waiting" | "processing" | "failed";
    id?: string;
    createdAt?: Date;
    artifactId?: string;
    proposalId?: string;
    priority?: number;
    dependencies?: string[];
    error?: string;
}, {
    status?: "merged" | "waiting" | "processing" | "failed";
    id?: string;
    createdAt?: Date;
    artifactId?: string;
    proposalId?: string;
    priority?: number;
    dependencies?: string[];
    error?: string;
}>;
export type MergeQueueItem = z.infer<typeof MergeQueueItemSchema>;
export declare const AgentLearningSchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodString;
    projectId: z.ZodString;
    pattern: z.ZodString;
    successRate: z.ZodNumber;
    applicationContext: z.ZodString;
    collaboratorIds: z.ZodArray<z.ZodString, "many">;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    projectId?: string;
    agentId?: string;
    pattern?: string;
    successRate?: number;
    applicationContext?: string;
    collaboratorIds?: string[];
    timestamp?: Date;
}, {
    id?: string;
    projectId?: string;
    agentId?: string;
    pattern?: string;
    successRate?: number;
    applicationContext?: string;
    collaboratorIds?: string[];
    timestamp?: Date;
}>;
export type AgentLearning = z.infer<typeof AgentLearningSchema>;
export interface InitWorkspaceRequest {
    projectId: string;
    team: AgentRole[];
    name?: string;
}
export interface ProposeRequest {
    agentId: string;
    artifactType: ArtifactType;
    content: string;
    reasoning: string;
    title: string;
    description?: string;
    riskLevel?: 'low' | 'medium' | 'high';
}
export interface MergeRequest {
    artifactId: string;
    proposalId?: string;
    strategy?: 'auto' | 'manual' | 'vote';
}
//# sourceMappingURL=types.d.ts.map