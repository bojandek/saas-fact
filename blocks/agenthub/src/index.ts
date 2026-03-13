/**
 * AgentHub - GitHub for AI Agents
 * Multi-agent collaboration, versioning, and autonomous team coordination
 */

export { AgentHubCore } from './core'

export type {
  Agent,
  AgentRole,
  Artifact,
  ArtifactType,
  Conflict,
  Proposal,
  Workspace,
  MergeQueueItem,
  AgentLearning,
} from './types'

export {
  AgentRoleSchema,
  ArtifactTypeSchema,
  ArtifactStatus,
  AgentSchema,
  ArtifactSchema,
  ProposalSchema,
  ConflictSchema,
  WorkspaceSchema,
} from './types'
