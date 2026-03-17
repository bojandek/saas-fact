import OpenAI from 'openai';
import { SqlGenerator } from './sql-generator';
import { RAGSystem } from './rag';

interface ArchitectBlueprint {
  sqlSchema: string;
  apiSpec: string; // OpenAPI/Swagger JSON string
  rlsPolicies: string; // SQL for RLS policies
}

export class ArchitectAgent {
  private openai: OpenAI;
  private sqlGenerator: SqlGenerator;
  private ragSystem: RAGSystem;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.sqlGenerator = new SqlGenerator();
    this.ragSystem = new RAGSystem();
  }

  async generateBlueprint(saasDescription: string): Promise<ArchitectBlueprint> {
    // Retrieve relevant architectural, RLS, engineering excellence, and security/compliance best practices from the knowledge base
    const architecturePrinciples = await this.ragSystem.search(
      "Clean Architecture and Multi-Tenant RLS Best Practices",
      2
    );
    const engineeringPrinciples = await this.ragSystem.search(
      "SaaS Engineering Excellence Best Practices",
      2
    );
    const securityPrinciples = await this.ragSystem.search(
      "SaaS Security & Compliance Best Practices",
      2
    );

    const combinedContext = [
      ...architecturePrinciples,
      ...engineeringPrinciples,
      ...securityPrinciples,
    ]
      .map((doc) => doc.content)
      .join("\n\n");

    // 1. Generate SQL Schema
    const sqlSchema = await this.sqlGenerator.generateSqlSchema(saasDescription + "\n\nArchitectural Context:\n" + combinedContext);

    // 2. Generate API Specification (OpenAPI)
    const apiSpecPrompt = `Based on the following SaaS description, generated PostgreSQL schema, and architectural best practices, create an OpenAPI 3.0 specification (YAML format) for the core API endpoints. Focus on CRUD operations for the main entities described. Include paths, methods, request/response bodies, and appropriate status codes.

SaaS Description: ${saasDescription}

PostgreSQL Schema:
${sqlSchema}

Architectural Context:\n${combinedContext}\n
Provide only the YAML content, no additional text.`;

    const apiSpecResponse = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // Use a suitable model
      messages: [
        { role: "system", content: "You are an API architect AI that generates OpenAPI specifications." },
        { role: "user", content: apiSpecPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    const apiSpec = apiSpecResponse.choices[0].message.content?.trim();
    if (!apiSpec) {
      throw new Error("Failed to generate API specification.");
    }

    // 3. Generate RLS Pol    const rlsPoliciesPrompt = `Based on the following PostgreSQL schema for a multi-tenant SaaS application and RLS best practices, generate Row Level Security (RLS) policies for each table. Assume a \'tenant_id\' column exists in relevant tables and a \'get_current_tenant_id()\' function is available. Also, assume \'users\' table has \'id\', \'tenant_id\', and \'role\' (owner, admin, user) columns, and \'get_current_user_id()\' function is available. Provide only the SQL statements for RLS policies, no additional text or explanations.

PostgreSQL Schema:
${sqlSchema}

Architectural Context:\n${combinedContext}\n
Provide only the SQL statements for RLS policies, no additional text or explanations.`;nst rlsPoliciesResponse = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // Use a suitable model
      messages: [
        { role: "system", content: "You are a security architect AI that generates PostgreSQL Row Level Security policies for multi-tenant applications." },
        { role: "user", content: rlsPoliciesPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1000,
    });

    const rlsPolicies = rlsPoliciesResponse.choices[0].message.content?.trim();
    if (!rlsPolicies) {
      throw new Error("Failed to generate RLS policies.");
    }

    return {
      sqlSchema,
      apiSpec,
      rlsPolicies,
    };
  }
}
