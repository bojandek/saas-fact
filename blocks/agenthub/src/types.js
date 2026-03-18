"use strict";
/**
 * AgentHub Type Definitions
 * Core data structures for multi-agent collaboration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLearningSchema = exports.MergeQueueItemSchema = exports.WorkspaceSchema = exports.ConflictSchema = exports.ProposalSchema = exports.ArtifactSchema = exports.ArtifactStatus = exports.ArtifactTypeSchema = exports.AgentSchema = exports.AgentRoleSchema = void 0;
const zod_1 = require("zod");
// ============ Agent Models ============
exports.AgentRoleSchema = zod_1.z.enum([
    'architect',
    'coder',
    'designer',
    'marketer',
    'security',
    'devops',
    'analytics',
    'product'
]);
exports.AgentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    role: exports.AgentRoleSchema,
    model: zod_1.z.string().default('claude-3-5-sonnet-20241022'),
    systemPrompt: zod_1.z.string().optional(),
    capabilities: zod_1.z.array(zod_1.z.string()),
    trustLevel: zod_1.z.number().min(0).max(1).default(0.5),
});
// ============ Artifact Models (Versioned Outputs) ============
exports.ArtifactTypeSchema = zod_1.z.enum([
    'architecture',
    'code',
    'design',
    'copy',
    'analysis',
    'decision',
    'risk-assessment',
    'optimization',
]);
exports.ArtifactStatus = zod_1.z.enum([
    'draft',
    'proposed',
    'approved',
    'merged',
    'rejected',
    'conflict',
    'archived',
]);
exports.ArtifactSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    type: exports.ArtifactTypeSchema,
    version: zod_1.z.number(),
    agentId: zod_1.z.string(),
    agentRole: exports.AgentRoleSchema,
    content: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    reasoning: zod_1.z.string(), // Why the agent made this decision
    status: exports.ArtifactStatus,
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    parentArtifactId: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    approvedBy: zod_1.z.string().optional(),
    approvedAt: zod_1.z.date().optional(),
});
// ============ Proposal System ============
exports.ProposalSchema = zod_1.z.object({
    id: zod_1.z.string(),
    artifactId: zod_1.z.string(),
    agentId: zod_1.z.string(),
    agentRole: exports.AgentRoleSchema,
    projectId: zod_1.z.string(),
    changeDescription: zod_1.z.string(),
    diff: zod_1.z.string(),
    impact: zod_1.z.string(), // Predicted impact on other systems
    riskLevel: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
    confidenceScore: zod_1.z.number().min(0).max(1),
    reasoning: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'approved', 'merged', 'rejected']),
    createdAt: zod_1.z.date(),
    reviewedAt: zod_1.z.date().optional(),
    reviewedBy: zod_1.z.string().optional(),
});
// ============ Conflict Resolution ============
exports.ConflictSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    artifactId: zod_1.z.string(),
    proposalIds: zod_1.z.array(zod_1.z.string()),
    agentIds: zod_1.z.array(zod_1.z.string()),
    conflictDescription: zod_1.z.string(),
    resolutionStrategy: zod_1.z.enum(['merge', 'voting', 'ai-judge', 'manual']),
    status: zod_1.z.enum(['pending', 'resolved', 'escalated']),
    resolution: zod_1.z.string().optional(),
    selectedProposalId: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    resolvedAt: zod_1.z.date().optional(),
});
// ============ Workspace & Project ============
exports.WorkspaceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    projectId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    agents: zod_1.z.array(exports.AgentSchema),
    artifacts: zod_1.z.array(exports.ArtifactSchema),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ============ Merge Queue ============
exports.MergeQueueItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    artifactId: zod_1.z.string(),
    proposalId: zod_1.z.string().optional(),
    priority: zod_1.z.number().default(0),
    dependencies: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['waiting', 'processing', 'merged', 'failed']),
    error: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
});
// ============ Agent Learn Graph ============
exports.AgentLearningSchema = zod_1.z.object({
    id: zod_1.z.string(),
    agentId: zod_1.z.string(),
    projectId: zod_1.z.string(),
    pattern: zod_1.z.string(), // What worked
    successRate: zod_1.z.number().min(0).max(1),
    applicationContext: zod_1.z.string(),
    collaboratorIds: zod_1.z.array(zod_1.z.string()),
    timestamp: zod_1.z.date(),
});
//# sourceMappingURL=types.js.map