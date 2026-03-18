"use strict";
/**
 * Factory Brain AI Agents
 * Orchestrates Claude API for various SaaS tasks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignAgent = exports.CodeReviewAgent = exports.ArchitectAgent = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const rag_1 = require("./rag");
const memory_1 = require("./memory");
const client = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const rag = new rag_1.RAGSystem();
const memory = new memory_1.MemorySystem();
class ArchitectAgent {
    /**
     * Design SaaS architecture based on requirements
     * Enhanced with RAG knowledge and learned patterns
     */
    async designArchitecture(requirements) {
        // Search knowledge base for similar architectures
        const similarDocs = await rag.search(requirements, 3);
        const topPatterns = await memory.getTopPatterns(5);
        const context = `
    Similar architectures from knowledge base:
    ${similarDocs.map(d => `- ${d.title}: ${d.content.substring(0, 200)}`).join('\n')}
    
    Proven patterns:
    ${topPatterns.map(p => `- ${p.name}: ${p.description}`).join('\n')}
    `;
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: `You are a world-class SaaS architect with experience from 50+ successful projects. 
      Provide architecture recommendations based on best practices, clean architecture, and proven patterns.`,
            messages: [
                {
                    role: 'user',
                    content: `Design architecture for: ${requirements}\n\n${context}`,
                },
            ],
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
    /**
     * Generate project scaffolding code
     */
    async generateScaffold(saasType, techStack) {
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: `You are an expert in Next.js, TypeScript, Tailwind CSS, and SaaS patterns.
      Generate production-ready boilerplate code for SaaS applications.`,
            messages: [
                {
                    role: 'user',
                    content: `Generate a ${saasType} SaaS scaffold using: ${techStack.join(', ')}. 
          Include folder structure, key components, and type definitions in TypeScript.`,
                },
            ],
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
}
exports.ArchitectAgent = ArchitectAgent;
class CodeReviewAgent {
    /**
     * Review code for best practices, security, performance
     */
    async review(code, context) {
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: `You are a senior code reviewer with deep expertise in TypeScript, React, and security best practices.
      Provide constructive feedback on code quality, potential issues, and improvements.`,
            messages: [
                {
                    role: 'user',
                    content: `Review this code:\n\n${code}${context ? `\n\nContext: ${context}` : ''}`,
                },
            ],
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
}
exports.CodeReviewAgent = CodeReviewAgent;
class DesignAgent {
    /**
     * Recommend UI/UX design based on Apple HIG and Laws of UX
     */
    async recommendDesign(feature) {
        const designDocs = await rag.search(feature, 5);
        const context = `Design principles from knowledge base:\n${designDocs
            .map(d => `- ${d.title}`)
            .join('\n')}`;
        const response = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: `You are a world-class UX designer inspired by Apple, Linear, and Stripe.
      Apply Laws of UX, Gestalt Principles, and cognitive load theory.`,
            messages: [
                {
                    role: 'user',
                    content: `Design UX for: ${feature}\n\n${context}`,
                },
            ],
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
}
exports.DesignAgent = DesignAgent;
//# sourceMappingURL=agents.js.map