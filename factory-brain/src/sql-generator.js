"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlGenerator = void 0;
const client_1 = require("./llm/client");
const agent_prompts_1 = require("./prompts/agent-prompts");
class SqlGenerator {
    constructor() {
        this.llm = (0, client_1.getLLMClient)();
    }
    async generateSqlSchema(description) {
        const prompt = `Generate a PostgreSQL table creation SQL schema based on the following description:

Description: ${description}

Provide only the SQL CREATE TABLE statement, without any additional text or explanations.`;
        const response = await this.llm.chat({
            model: client_1.CLAUDE_MODELS.HAIKU,
            system: agent_prompts_1.ARCHITECT_AGENT_PROMPT + '\n\nYou are a helpful assistant that generates PostgreSQL SQL schemas.',
            messages: [
                { role: 'user', content: prompt },
            ],
            maxTokens: 500,
        });
        const sql = response.content?.trim();
        if (!sql) {
            throw new Error('Failed to generate SQL schema.');
        }
        return sql;
    }
}
exports.SqlGenerator = SqlGenerator;
//# sourceMappingURL=sql-generator.js.map