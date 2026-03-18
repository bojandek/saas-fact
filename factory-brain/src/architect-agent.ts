import OpenAI from 'openai'
import { SqlGenerator } from './sql-generator'
import { RAGSystem } from './rag'
import { WarRoomOrchestrator, AgentContext } from './war-room-orchestrator'
import { costTracker, extractOpenAIUsage } from './cost-tracker'
import { withRetry } from './utils/retry'
import { logger } from './utils/logger'
import { ARCHITECT_AGENT_PROMPT } from './prompts/agent-prompts'

interface ArchitectBlueprint {
  sqlSchema: string
  apiSpec: string
  rlsPolicies: string
}

export class ArchitectAgent {
  private openai: OpenAI
  private sqlGenerator: SqlGenerator
  private ragSystem: RAGSystem
  private orchestrator?: WarRoomOrchestrator
  private log = logger.child({ agent: 'ArchitectAgent' })

  constructor(orchestrator?: WarRoomOrchestrator) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.sqlGenerator = new SqlGenerator()
    this.ragSystem = new RAGSystem()
    this.orchestrator = orchestrator
  }

  async generateBlueprint(
    saasDescription: string,
    currentContext?: AgentContext
  ): Promise<ArchitectBlueprint> {
    this.log.info({ saasDescription }, 'Starting blueprint generation')

    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'Architect Agent',
        recipient: 'Orchestrator',
        type: 'info',
        content: `Starting blueprint generation for: ${saasDescription}`,
      })
    }

    const refinedDescription = currentContext?.saasDescription ?? saasDescription

    // Retrieve relevant knowledge from RAG system
    const [architecturePrinciples, engineeringPrinciples, securityPrinciples] =
      await Promise.all([
        this.ragSystem.search('Clean Architecture and Multi-Tenant RLS Best Practices', undefined, 2),
        this.ragSystem.search('SaaS Engineering Excellence Best Practices', undefined, 2),
        this.ragSystem.search('SaaS Security & Compliance Best Practices', undefined, 2),
      ])

    const combinedContext = [...architecturePrinciples, ...engineeringPrinciples, ...securityPrinciples]
      .map((doc) => doc.content)
      .join('\n\n')

    // 1. Generate SQL Schema
    const sqlSchema = await this.sqlGenerator.generateSqlSchema(
      `${refinedDescription}\n\nArchitectural Context:\n${combinedContext}`
    )

    // 2. Generate API Specification (OpenAPI) — with retry
    const apiSpecResponse = await withRetry(
      () =>
        this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: ARCHITECT_AGENT_PROMPT + '\n\nYou are an API architect AI that generates OpenAPI specifications.',
            },
            {
              role: 'user',
              content: `Based on the following SaaS description, generated PostgreSQL schema, and architectural best practices, create an OpenAPI 3.0 specification (YAML format) for the core API endpoints. Focus on CRUD operations for the main entities described. Include paths, methods, request/response bodies, and appropriate status codes.

SaaS Description: ${refinedDescription}

PostgreSQL Schema:
${sqlSchema}

Architectural Context:
${combinedContext}

Provide only the YAML content, no additional text.`,
            },
          ],
          temperature: 0.6,
          max_tokens: 1500,
        }),
      {
        maxAttempts: 4,
        onRetry: (attempt, error, delayMs) => {
          this.log.warn({ attempt, error, delayMs }, 'Retrying API spec generation')
        },
      }
    )

    costTracker.record({
      agentName: 'ArchitectAgent:apiSpec',
      model: 'gpt-4o-mini',
      usage: extractOpenAIUsage(apiSpecResponse),
    })

    const apiSpec = apiSpecResponse.choices[0].message.content?.trim()
    if (!apiSpec) {
      this.log.error('Failed to generate API specification')
      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'Architect Agent',
          recipient: 'Orchestrator',
          type: 'critical',
          content: 'Failed to generate API specification.',
        })
      }
      throw new Error('Failed to generate API specification.')
    }

    // 3. Generate RLS Policies — with retry
    const rlsPoliciesResponse = await withRetry(
      () =>
        this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                ARCHITECT_AGENT_PROMPT + '\n\nYou are a security architect AI that generates PostgreSQL Row Level Security policies for multi-tenant applications.',
            },
            {
              role: 'user',
              content: `Based on the following PostgreSQL schema for a multi-tenant SaaS application and RLS best practices, generate Row Level Security (RLS) policies for each table. Assume a 'tenant_id' column exists in relevant tables and a 'get_current_tenant_id()' function is available. Also, assume 'users' table has 'id', 'tenant_id', and 'role' (owner, admin, user) columns, and 'get_current_user_id()' function is available. Provide only the SQL statements for RLS policies, no additional text or explanations.

PostgreSQL Schema:
${sqlSchema}

Architectural Context:
${combinedContext}

Provide only the SQL statements for RLS policies, no additional text or explanations.`,
            },
          ],
          temperature: 0.6,
          max_tokens: 1000,
        }),
      {
        maxAttempts: 4,
        onRetry: (attempt, error, delayMs) => {
          this.log.warn({ attempt, error, delayMs }, 'Retrying RLS policies generation')
        },
      }
    )

    costTracker.record({
      agentName: 'ArchitectAgent:rlsPolicies',
      model: 'gpt-4o-mini',
      usage: extractOpenAIUsage(rlsPoliciesResponse),
    })

    const rlsPolicies = rlsPoliciesResponse.choices[0].message.content?.trim()
    if (!rlsPolicies) {
      this.log.error('Failed to generate RLS policies')
      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'Architect Agent',
          recipient: 'Orchestrator',
          type: 'critical',
          content: 'Failed to generate RLS policies.',
        })
      }
      throw new Error('Failed to generate RLS policies.')
    }

    const blueprint = { sqlSchema, apiSpec, rlsPolicies }

    this.log.info('Blueprint generated successfully')

    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'Architect Agent',
        recipient: 'Orchestrator',
        type: 'response',
        content: 'Blueprint generated successfully.',
        payload: blueprint,
      })
      this.orchestrator.updateContext({ blueprint })
    }

    return blueprint
  }
}
