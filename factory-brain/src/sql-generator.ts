import OpenAI from 'openai';
import { ARCHITECT_AGENT_PROMPT } from './prompts/agent-prompts';

export class SqlGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateSqlSchema(description: string): Promise<string> {
    const prompt = `Generate a PostgreSQL table creation SQL schema based on the following description:

Description: ${description}

Provide only the SQL CREATE TABLE statement, without any additional text or explanations.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a capable model for schema generation
      messages: [
        { role: "system", content: ARCHITECT_AGENT_PROMPT + "\n\nYou are a helpful assistant that generates PostgreSQL SQL schemas." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const sql = response.choices[0].message.content?.trim();
    if (!sql) {
      throw new Error("Failed to generate SQL schema.");
    }
    return sql;
  }
}
