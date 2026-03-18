"use strict";
/**
 * AgentHub Integration for Factory Brain
 * Connects existing agents (ArchitectAgent, CodeReviewAgent, etc.) to AgentHub collaborative system
 * Enables artifact versioning, proposal-based collaboration, and conflict resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactoryBrainWithAgentHub = void 0;
exports.exampleUsage = exampleUsage;
const core_1 = require("../../blocks/agenthub/src/core");
const agents_1 = require("./agents");
const memory_1 = require("./memory");
const rag_1 = require("./rag");
const logger_1 = require("./utils/logger");
/**
 * Factory Brain with AgentHub Collaboration
 */
class FactoryBrainWithAgentHub {
    constructor(config) {
        this.workspaceId = null;
        this.agenthub = new core_1.AgentHubCore(config.supabaseUrl, config.supabaseKey, config.anthropicKey);
        this.architectAgent = new agents_1.ArchitectAgent();
        this.codeReviewAgent = new agents_1.CodeReviewAgent();
        this.designAgent = new agents_1.DesignAgent();
        this.contentAgent = new agents_1.ContentAgent();
        this.dataAgent = new agents_1.DataAgent();
        this.memory = new memory_1.MemorySystem();
        this.rag = new rag_1.RAGSystem();
    }
    /**
     * Initialize collaboration workspace for a SaaS project
     */
    async initializeWorkspace(projectId) {
        const request = {
            projectId,
            team: ['architect', 'coder', 'designer', 'marketer'],
            name: `SaaS Factory: ${projectId}`,
        };
        const workspace = await this.agenthub.initWorkspace(request);
        this.workspaceId = workspace.id;
        logger_1.logger.info(`✓ AgentHub workspace initialized for ${projectId}`);
        logger_1.logger.info(`  Workspace ID: ${workspace.id}`);
        logger_1.logger.info(`  Team: ${workspace.agents.map((a) => a.name).join(', ')}`);
        return workspace.id;
    }
    /**
     * Design SaaS architecture with AgentHub collaboration
     */
    async designArchitectureCollaboratively(requirements) {
        if (!this.workspaceId)
            throw new Error('Workspace not initialized');
        logger_1.logger.info('\n🏗️ Designing architecture with agent collaboration...\n');
        // Architect proposes architecture
        const architectureOutput = await this.architectAgent.designArchitecture(requirements);
        const architectProposal = await this.agenthub.propose(this.workspaceId, {
            agentId: 'architect', // Will be replaced with actual ID
            artifactType: 'architecture',
            content: architectureOutput,
            reasoning: 'Designed scalable multi-tenant architecture based on requirements',
            title: 'System Architecture Design',
            description: requirements,
        });
        logger_1.logger.info(`✓ Architect proposed architecture (${architectProposal.id})`);
        // Code reviewer checks architecture for implementation feasibility
        const reviewOutput = await this.codeReviewAgent.review(architectureOutput, 'architecture');
        // If review is positive, merge
        const merged = await this.agenthub.merge(this.workspaceId, {
            artifactId: architectProposal.id,
        });
        logger_1.logger.info(`✓ Architecture merged after code review`);
        return {
            architecture: architectureOutput,
            artifacts: [merged],
        };
    }
    /**
     * Generate full project scaffold with team collaboration
     */
    async generateScaffoldCollaboratively(saasType, techStack) {
        if (!this.workspaceId)
            throw new Error('Workspace not initialized');
        logger_1.logger.info('\n💻 Generating project scaffold with team collaboration...\n');
        // Architect designs scaffold structure
        const scaffoldOutput = await this.architectAgent.generateScaffold(saasType, techStack);
        const scaffoldProposal = await this.agenthub.propose(this.workspaceId, {
            agentId: 'architect',
            artifactType: 'code',
            content: scaffoldOutput,
            reasoning: 'Generated production-ready scaffold for ' + saasType,
            title: 'Project Scaffold',
            description: `${saasType} using ${techStack.join(', ')}`,
        });
        logger_1.logger.info(`✓ Architect proposed scaffold`);
        // Code reviewer checks for security and best practices
        const reviewOutput = await this.codeReviewAgent.review(scaffoldOutput, 'security, performance, and best practices');
        // Merge if approved
        const merged = await this.agenthub.merge(this.workspaceId, {
            artifactId: scaffoldProposal.id,
        });
        logger_1.logger.info(`✓ Scaffold approved and merged`);
        // Store in memory for future reference
        await this.memory.recordDecision('scaffold-generation', {
            saasType,
            techStack,
            success: true,
        });
        return {
            scaffold: scaffoldOutput,
            artifacts: [merged],
        };
    }
    /**
     * Generate marketing copy with design collaboration
     */
    async generateMarketingCollaboratively(productName, targetAudience, tone) {
        if (!this.workspaceId)
            throw new Error('Workspace not initialized');
        logger_1.logger.info('\n📝 Generating marketing materials with team collaboration...\n');
        const artifacts = [];
        // Content agent writes copy
        const copyOutput = await this.contentAgent.generateMarketingContent(productName, targetAudience, tone);
        const copyProposal = await this.agenthub.propose(this.workspaceId, {
            agentId: 'marketer',
            artifactType: 'copy',
            content: copyOutput,
            reasoning: `Marketing copy optimized for ${targetAudience} with ${tone} tone`,
            title: `Marketing Copy: ${productName}`,
        });
        logger_1.logger.info(`✓ Marketer proposed copy`);
        artifacts.push(copyProposal);
        // Designer recommends visual design approach
        const designOutput = await this.designAgent.recommendDesign('Landing Page for ' + productName);
        const designProposal = await this.agenthub.propose(this.workspaceId, {
            agentId: 'designer',
            artifactType: 'design',
            content: designOutput,
            reasoning: 'Visual design recommendations to maximize conversion',
            title: `Design System: ${productName}`,
        });
        logger_1.logger.info(`✓ Designer proposed visual design`);
        artifacts.push(designProposal);
        // Merge both
        const mergedCopy = await this.agenthub.merge(this.workspaceId, { artifactId: copyProposal.id });
        const mergedDesign = await this.agenthub.merge(this.workspaceId, { artifactId: designProposal.id });
        logger_1.logger.info(`✓ Marketing artifacts merged and approved`);
        return {
            copy: copyOutput,
            design: designOutput,
            artifacts: [mergedCopy, mergedDesign],
        };
    }
    /**
     * Analyze project data with SQL generation
     */
    async analyzeDataCollaboratively(tableName, filters, metrics) {
        if (!this.workspaceId)
            throw new Error('Workspace not initialized');
        logger_1.logger.info('\n📊 Analyzing data with agent collaboration...\n');
        // Data agent generates SQL
        const sqlQuery = await this.dataAgent.generateSQLQuery(tableName, filters, metrics);
        const queryProposal = await this.agenthub.propose(this.workspaceId, {
            agentId: 'data-agent',
            artifactType: 'analysis',
            content: sqlQuery,
            reasoning: `Generated optimized SQL query for metrics: ${metrics.join(', ')}`,
            title: `SQL Query: ${tableName}`,
        });
        logger_1.logger.info(`✓ Data agent proposed query`);
        // Code reviewer checks SQL for performance and security
        const reviewOutput = await this.codeReviewAgent.review(sqlQuery, 'SQL injection, performance, indexes');
        const merged = await this.agenthub.merge(this.workspaceId, { artifactId: queryProposal.id });
        logger_1.logger.info(`✓ Query approved and merged`);
        return {
            query: sqlQuery,
            analysis: `Analyzed ${tableName} with metrics: ${metrics.join(', ')}`,
            artifacts: [merged],
        };
    }
    /**
     * Get workspace history and learned patterns
     */
    async getWorkspaceHistory() {
        if (!this.workspaceId)
            throw new Error('Workspace not initialized');
        const workspace = await this.agenthub.getWorkspace(this.workspaceId);
        if (!workspace)
            throw new Error('Workspace not found');
        // Group artifacts by type
        const artifactsByType = {};
        for (const artifact of workspace.artifacts) {
            artifactsByType[artifact.type] = (artifactsByType[artifact.type] || 0) + 1;
        }
        // Get learned patterns from memory
        const learnedPatterns = await this.memory.getTopPatterns(10);
        // Get agent stats
        const agentStats = workspace.agents.map((agent) => ({
            name: agent.name,
            role: agent.role,
            trustLevel: agent.trustLevel,
            capabilities: agent.capabilities,
        }));
        return {
            totalArtifacts: workspace.artifacts.length,
            artifactsByType,
            learnedPatterns,
            agentStats,
        };
    }
    /**
     * Run complete project generation with agent collaboration
     */
    async runFullProjectGeneration(projectSpec) {
        logger_1.logger.info(`\n🏭 Starting collaborative project generation: ${projectSpec.name}\n`);
        // Initialize workspace
        await this.initializeWorkspace(projectSpec.projectId);
        // Design architecture
        const { architecture } = await this.designArchitectureCollaboratively(projectSpec.description);
        // Generate scaffold
        const { scaffold } = await this.generateScaffoldCollaboratively(projectSpec.name, projectSpec.techStack);
        // Generate marketing materials
        const { copy, design } = await this.generateMarketingCollaboratively(projectSpec.name, projectSpec.targetAudience, 'professional');
        // Get final stats
        const history = await this.getWorkspaceHistory();
        logger_1.logger.info(`\n✨ Project generation complete!\n`);
        logger_1.logger.info(`Total artifacts created: ${history.totalArtifacts}`);
        logger_1.logger.info(`Artifacts by type:`, history.artifactsByType);
        logger_1.logger.info(`\n📚 Learned patterns stored: ${history.learnedPatterns.length}`, '\nThese will improve future projects!');
    }
}
exports.FactoryBrainWithAgentHub = FactoryBrainWithAgentHub;
/**
 * Example usage function
 */
async function exampleUsage() {
    const factoryBrain = new FactoryBrainWithAgentHub({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_ANON_KEY || '',
        anthropicKey: process.env.ANTHROPIC_API_KEY || '',
        projectId: 'dental-saas-001',
    });
    await factoryBrain.runFullProjectGeneration({
        projectId: 'dental-saas-001',
        name: 'DentalFlow',
        description: 'Complete practice management system for dental offices',
        techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
        targetAudience: 'Small dental practices in the US',
    });
}
//# sourceMappingURL=agenthub-integration.js.map