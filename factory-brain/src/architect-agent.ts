import OpenAI from 'openai';
import { SqlGenerator } from './sql-generator';

interface ArchitectBlueprint {
  sqlSchema: string;
  apiSpec: string; // OpenAPI/Swagger JSON string
  rlsPolicies: string; // SQL for RLS policies
}

export class ArchitectAgent {
  private openai: OpenAI;
  private sqlGenerator: SqlGenerator;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.sqlGenerator = new SqlGenerator();
  }

  async generateBlueprint(saasDescription: string): Promise<ArchitectBlueprint> {
    // 1. Generate SQL Schema
    const sqlSchema = await this.sqlGenerator.generateSqlSchema(saasDescription);

    // 2. Generate API Specification (OpenAPI)
    const apiSpecPrompt = `Based on the following SaaS description and generated PostgreSQL schema, create an OpenAPI 3.0 specification (YAML format) for the core API endpoints. Focus on CRUD operations for the main entities described. Include paths, methods, request/response bodies, and appropriate status codes.

SaaS Description: ${saasDescription}

PostgreSQL Schema:
${sqlSchema}

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

    // 3. Generate RLS Policies
    const rlsPoliciesPrompt = `Based on the following PostgreSQL schema for a multi-tenant SaaS application, generate Row Level Security (RLS) policies for each table. Assume a 'tenant_id' column exists in relevant tables and a 'get_current_tenant_id()' function is available. Also, assume 'users' table has 'id', 'tenant_id', and 'role' (owner, admin, user) columns, and 'get_current_user_id()' function is available. Provide only the SQL statements for RLS policies, no additional text or explanations.

PostgreSQL Schema:
${sqlSchema}

Example RLS policy for a table 'products' with 'tenant_id':
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_access_by_tenant" ON public.products
  FOR ALL
  USING (tenant_id = get_current_tenant_id());
`;

    const rlsPoliciesResponse = await this.openai.chat.completions.create({
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
