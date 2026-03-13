# 🤖 AgentHub - GitHub for AI Agents

AgentHub enables your SaaS Factory to work like a real development team where multiple AI agents (ArchitectAgent, CodeReviewAgent, DesignAgent, MarketingAgent, SecurityAgent) collaborate asynchronously, version their work, and resolve conflicts autonomously.

## Features

- **Agent Versioning**: Track every decision, artifact, and iteration
- **Asynchronous Collaboration**: Agents work on tasks independently with automatic merge
- **Conflict Resolution**: AI-powered resolution when agents disagree
- **Knowledge Sharing**: Agents learn from each other's past decisions
- **Audit Trail**: Full history of who suggested what and why
- **Skill Library**: 152k+ prompts accessible to all agents

## Quick Start

```typescript
import { AgentHub, Agent } from '@saas-factory/agenthub'

const hub = new AgentHub({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
})

// Initialize workspace
const workspace = await hub.initWorkspace({
  projectId: 'dental-saas-001',
  team: ['architect', 'designer', 'coder', 'marketer']
})

// Agent proposes changes
const architectProposal = await workspace.propose({
  agentId: 'architect',
  artifactType: 'architecture',
  content: '... architecture design ...',
  reasoning: '... why this approach ...'
})

// Merge with conflict resolution
const merged = await workspace.merge(architectProposal)
```

## Architecture

- **Artifacts**: Versioned outputs from agents (code, designs, copy, etc.)
- **Proposal System**: Agents create proposals instead of direct changes
- **Merge Queue**: Automatic async merging with human review option
- **Conflict Resolution**: AI judges when agents disagree
- **Memory Integration**: Learns which agent combinations work best

## Cost: $0 - Uses free tier services
