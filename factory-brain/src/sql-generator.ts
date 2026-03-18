import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { ARCHITECT_AGENT_PROMPT } from './prompts/agent-prompts'

export class SqlGenerator {
  private llm = getLLMClient()

  async generateSqlSchema(description: string): Promise<string> {
    const prompt = `Generate a PostgreSQL table creation SQL schema based on the following description:

Description: ${description}

Provide only the SQL CREATE TABLE statement, without any additional text or explanations.`

    const response = await this.llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      system: ARCHITECT_AGENT_PROMPT + '\n\nYou are a helpful assistant that generates PostgreSQL SQL schemas.',
      messages: [
        { role: 'user', content: prompt },
      ],
      maxTokens: 500,
    })

    const sql = response.content?.trim()
    if (!sql) {
      throw new Error('Failed to generate SQL schema.')
    }
    return sql
  }
}
