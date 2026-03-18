"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectAgent = void 0;
const sql_generator_1 = require("./sql-generator");
const rag_1 = require("./rag");
const cost_tracker_1 = require("./cost-tracker");
const retry_1 = require("./utils/retry");
const logger_1 = require("./utils/logger");
const agent_prompts_1 = require("./prompts/agent-prompts");
const client_1 = require("./llm/client");
class ArchitectAgent {
    constructor(orchestrator) {
        this.llm = (0, client_1.getLLMClient)();
        this.log = logger_1.logger.child({ agent: 'ArchitectAgent' });
        this.sqlGenerator = new sql_generator_1.SqlGenerator();
        this.ragSystem = new rag_1.RAGSystem();
        this.orchestrator = orchestrator;
    }
    async generateBlueprint(saasDescription, currentContext) {
        this.log.info({ saasDescription }, 'Starting blueprint generation');
        if (this.orchestrator) {
            await this.orchestrator.sendMessage({
                sender: 'Architect Agent',
                recipient: 'Orchestrator',
                type: 'info',
                content: `Starting blueprint generation for: ${saasDescription}`,
            });
        }
        const refinedDescription = currentContext?.saasDescription ?? saasDescription;
        // Retrieve relevant knowledge from RAG system
        const [architecturePrinciples, engineeringPrinciples, securityPrinciples] = await Promise.all([
            this.ragSystem.search('Clean Architecture and Multi-Tenant RLS Best Practices', undefined, 2),
            this.ragSystem.search('SaaS Engineering Excellence Best Practices', undefined, 2),
            this.ragSystem.search('SaaS Security & Compliance Best Practices', undefined, 2),
        ]);
        const combinedContext = [...architecturePrinciples, ...engineeringPrinciples, ...securityPrinciples]
            .map((doc) => doc.content)
            .join('\n\n');
        // 1. Generate SQL Schema
        const sqlSchema = await this.sqlGenerator.generateSqlSchema(`${refinedDescription}\n\nArchitectural Context:\n${combinedContext}`);
        // 2. Generate API Specification (OpenAPI) — with retry
        const apiSpec = await (0, retry_1.withRetry)(async () => {
            const response = await this.llm.chat({
                system: agent_prompts_1.ARCHITECT_AGENT_PROMPT + '\n\nYou are an API architect AI that generates OpenAPI specifications.',
                messages: [
                    {
                        role: 'user',
                        content: `Based on the following SaaS description, generated PostgreSQL schema, and architectural best practices, create an OpenAPI 3.0 specification (YAML format) for the core API endpoints. Focus on CRUD operations for the main entities described. Include paths, methods, request/response bodies, and appropriate status codes.\n\nSaaS Description: ${refinedDescription}\n\nPostgreSQL Schema:\n${sqlSchema}\n\nArchitectural Context:\n${combinedContext}\n\nProvide only the YAML content, no additional text.`,
                    },
                ],
                model: client_1.CLAUDE_MODELS.SONNET,
                maxTokens: 2000,
            });
            cost_tracker_1.costTracker.record({
                agentName: 'ArchitectAgent:apiSpec',
                model: response.model,
                usage: { promptTokens: response.usage.inputTokens, completionTokens: response.usage.outputTokens, totalTokens: response.usage.totalTokens },
            });
            return response.content.trim();
        }, {
            maxAttempts: 4,
            onRetry: (attempt, error, delayMs) => {
                this.log.warn({ attempt, error, delayMs }, 'Retrying API spec generation');
            },
        });
        if (!apiSpec) {
            this.log.error('Failed to generate API specification');
            if (this.orchestrator) {
                await this.orchestrator.sendMessage({
                    sender: 'Architect Agent',
                    recipient: 'Orchestrator',
                    type: 'critical',
                    content: 'Failed to generate API specification.',
                });
            }
            throw new Error('Failed to generate API specification.');
        }
        // 3. Generate RLS Policies — with retry
        const rlsPolicies = await (0, retry_1.withRetry)(async () => {
            const response = await this.llm.chat({
                system: agent_prompts_1.ARCHITECT_AGENT_PROMPT + '\n\nYou are a security architect AI that generates PostgreSQL Row Level Security policies for multi-tenant applications.',
                messages: [
                    {
                        role: 'user',
                        content: `Based on the following PostgreSQL schema for a multi-tenant SaaS application and RLS best practices, generate Row Level Security (RLS) policies for each table. Assume a 'tenant_id' column exists in relevant tables and a 'get_current_tenant_id()' function is available. Also, assume 'users' table has 'id', 'tenant_id', and 'role' (owner, admin, user) columns, and 'get_current_user_id()' function is available. Provide only the SQL statements for RLS policies, no additional text or explanations.\n\nPostgreSQL Schema:\n${sqlSchema}\n\nArchitectural Context:\n${combinedContext}\n\nProvide only the SQL statements for RLS policies, no additional text or explanations.`,
                    },
                ],
                model: client_1.CLAUDE_MODELS.SONNET,
                maxTokens: 1500,
            });
            cost_tracker_1.costTracker.record({
                agentName: 'ArchitectAgent:rlsPolicies',
                model: response.model,
                usage: { promptTokens: response.usage.inputTokens, completionTokens: response.usage.outputTokens, totalTokens: response.usage.totalTokens },
            });
            return response.content.trim();
        }, {
            maxAttempts: 4,
            onRetry: (attempt, error, delayMs) => {
                this.log.warn({ attempt, error, delayMs }, 'Retrying RLS policies generation');
            },
        });
        if (!rlsPolicies) {
            this.log.error('Failed to generate RLS policies');
            if (this.orchestrator) {
                await this.orchestrator.sendMessage({
                    sender: 'Architect Agent',
                    recipient: 'Orchestrator',
                    type: 'critical',
                    content: 'Failed to generate RLS policies.',
                });
            }
            throw new Error('Failed to generate RLS policies.');
        }
        const blueprint = { sqlSchema, apiSpec, rlsPolicies };
        this.log.info('Blueprint generated successfully');
        if (this.orchestrator) {
            await this.orchestrator.sendMessage({
                sender: 'Architect Agent',
                recipient: 'Orchestrator',
                type: 'response',
                content: 'Blueprint generated successfully.',
                payload: blueprint,
            });
            this.orchestrator.updateContext({ blueprint });
        }
        return blueprint;
    }
}
exports.ArchitectAgent = ArchitectAgent;
//# sourceMappingURL=architect-agent.js.map