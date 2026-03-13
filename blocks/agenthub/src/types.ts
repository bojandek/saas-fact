/**
 * AgentHub Type Definitions
 * Core data structures for multi-agent collaboration
 */

import { z } from 'zod'

// ============ Agent Models ============
export const AgentRoleSchema = z.enum([
  'architect',
  'coder',
  'designer',
  'marketer',
  'security',
  'devops',
  'analytics',
  'product'
])
export type AgentRole = z.infer<typeof AgentRoleSchema>

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AgentRoleSchema,
  model: z.string().default('claude-3-5-sonnet-20241022'),
  systemPrompt: z.string().optional(),
  capabilities: z.array(z.string()),
  trustLevel: z.number().min(0).max(1).default(0.5),
})
export type Agent = z.infer<typeof AgentSchema>

// ============ Artifact Models (Versioned Outputs) ============
export const ArtifactTypeSchema = z.enum([
  'architecture',
  'code',
  'design',
  'copy',
  'analysis',
  'decision',
  'risk-assessment',
  'optimization',
])
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

export const ArtifactStatus = z.enum([
  'draft',
  'proposed',
  'approved',
  'merged',
  'rejected',
  'conflict',
  'archived',
])
export type ArtifactStatus = z.infer<typeof ArtifactStatus>

export const ArtifactSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: ArtifactTypeSchema,
  version: z.number(),
  agentId: z.string(),
  agentRole: AgentRoleSchema,
  content: z.string(),
  title: z.string(),
  description: z.string().optional(),
  reasoning: z.string(), // Why the agent made this decision
  status: ArtifactStatus,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  parentArtifactId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
})
export type Artifact = z.infer<typeof ArtifactSchema>

// ============ Proposal System ============
export const ProposalSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  agentId: z.string(),
  agentRole: AgentRoleSchema,
  projectId: z.string(),
  changeDescription: z.string(),
  diff: z.string(),
  impact: z.string(), // Predicted impact on other systems
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
  status: z.enum(['pending', 'approved', 'merged', 'rejected']),
  createdAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
})
export type Proposal = z.infer<typeof ProposalSchema>

// ============ Conflict Resolution ============
export const ConflictSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  artifactId: z.string(),
  proposalIds: z.array(z.string()),
  agentIds: z.array(z.string()),
  conflictDescription: z.string(),
  resolutionStrategy: z.enum(['merge', 'voting', 'ai-judge', 'manual']),
  status: z.enum(['pending', 'resolved', 'escalated']),
  resolution: z.string().optional(),
  selectedProposalId: z.string().optional(),
  createdAt: z.date(),
  resolvedAt: z.date().optional(),
})
export type Conflict = z.infer<typeof ConflictSchema>

// ============ Workspace & Project ============
export const WorkspaceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  agents: z.array(AgentSchema),
  artifacts: z.array(ArtifactSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

// ============ Merge Queue ============
export const MergeQueueItemSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  proposalId: z.string().optional(),
  priority: z.number().default(0),
  dependencies: z.array(z.string()).optional(),
  status: z.enum(['waiting', 'processing', 'merged', 'failed']),
  error: z.string().optional(),
  createdAt: z.date(),
})
export type MergeQueueItem = z.infer<typeof MergeQueueItemSchema>

// ============ Agent Learn Graph ============
export const AgentLearningSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  projectId: z.string(),
  pattern: z.string(), // What worked
  successRate: z.number().min(0).max(1),
  applicationContext: z.string(),
  collaboratorIds: z.array(z.string()),
  timestamp: z.date(),
})
export type AgentLearning = z.infer<typeof AgentLearningSchema>

// ============ Network Request/Response ============
export interface InitWorkspaceRequest {
  projectId: string
  team: AgentRole[]
  name?: string
}

export interface ProposeRequest {
  agentId: string
  artifactType: ArtifactType
  content: string
  reasoning: string
  title: string
  description?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface MergeRequest {
  artifactId: string
  proposalId?: string
  strategy?: 'auto' | 'manual' | 'vote'
}
