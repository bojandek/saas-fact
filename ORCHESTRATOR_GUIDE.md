# SaaS Factory Orchestrator - Complete Guide

## Overview

The **SaaS Factory Orchestrator** is an intelligent system that automates the entire process of building a production-ready SaaS application from a simple description. It combines three powerful agents:

1. **Nano Banana UI Engine** - Generates beautiful, unique UI themes
2. **Architect Agent** - Creates database schemas and API specifications
3. **The Assembler** - Scaffolds and connects everything into a working application

## The Complete Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Input (SaaS Idea)                       │
│  "A modern CRM for dentists with scheduling and billing"       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│         STEP 1: Nano Banana UI Engine                           │
│  • Analyzes SaaS description                                    │
│  • Generates color palette (primary, secondary, accent)         │
│  • Selects typography and border radius                         │
│  • Creates unique visual identity                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│         STEP 2: Architect Agent                                 │
│  • Generates PostgreSQL schema (tables, relationships)          │
│  • Creates OpenAPI specification (API endpoints)                │
│  • Generates RLS policies (multi-tenant security)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│         STEP 3: The Assembler                                   │
│  • Copies base SaaS template                                    │
│  • Applies generated theme to Tailwind config                   │
│  • Creates database migrations                                  │
│  • Scaffolds basic CRUD pages                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Ready-to-Deploy SaaS Application                   │
│  • Unique design (Nano Banana)                                  │
│  • Complete database (Architect)                                │
│  • Connected code with blocks (Assembler)                       │
│  • Multi-tenant ready                                           │
│  • Stripe integration                                           │
│  • Team management                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Usage

### Step 1: Access the Orchestrator

Navigate to `/orchestrator` in your Factory Dashboard.

### Step 2: Describe Your SaaS

Enter:
- **SaaS Description**: Detailed description of your idea (e.g., "A project management tool with tasks, teams, and real-time collaboration")
- **App Name**: Short name for your application (e.g., "ProjectHub")

### Step 3: Generate Theme (Nano Banana)

Click **"Generate Theme (Nano Banana)"**. The system will:
- Analyze your SaaS description
- Generate a unique color palette
- Select appropriate typography
- Create design tokens for your application

**Output**: A complete theme with primary, secondary, and accent colors, plus font family and border radius.

### Step 4: Generate Blueprint (Architect Agent)

Click **"Generate Architecture (Architect Agent)"**. The system will:
- Create a PostgreSQL schema based on your SaaS description
- Generate an OpenAPI specification for your API
- Create RLS policies for multi-tenant data isolation

**Output**: 
- SQL schema (ready to migrate to Supabase)
- OpenAPI spec (for API documentation and code generation)
- RLS policies (for security)

### Step 5: Assemble Your SaaS (The Assembler)

Click **"Assemble SaaS (The Assembler)"**. The system will:
- Copy the base SaaS template
- Apply your generated theme
- Create database migrations
- Scaffold basic CRUD pages for your entities

**Output**: A new SaaS application in `apps/saas-{appname}` ready for development.

## Component Details

### 1. Nano Banana UI Engine

**Location**: `packages/ui/src/lib/theme-generator.ts`

**How it works**:
- Uses OpenAI to analyze your SaaS description
- Generates a JSON object with theme properties
- Creates harmonious color palettes based on SaaS type

**Output format**:
```json
{
  "primaryColor": "#3B82F6",
  "secondaryColor": "#10B981",
  "accentColor": "#F59E0B",
  "fontFamily": "Inter",
  "borderRadius": "0.5rem"
}
```

### 2. Architect Agent

**Location**: `factory-brain/src/architect-agent.ts`

**How it works**:
- Extends the SQL Generator to create complete schemas
- Generates OpenAPI specifications for your API
- Creates RLS policies for multi-tenant security

**Output format**:
```
SQL Schema:
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  tenant_id UUID REFERENCES tenants(id),
  ...
);

OpenAPI Spec:
paths:
  /api/users:
    get:
      summary: List users
      ...

RLS Policies:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access" ON public.users ...
```

### 3. The Assembler

**Location**: `factory-brain/src/assembler-agent.ts`

**How it works**:
- Copies the base SaaS template (`saas-001-booking`)
- Applies the generated theme to `tailwind.config.ts`
- Creates database migration files
- Scaffolds basic pages and components

**Output**: A new SaaS application in `apps/saas-{appname}` with:
- Pre-configured authentication (from `blocks/auth`)
- Payment integration (from `blocks/payments`)
- Database setup (from `blocks/database`)
- Email templates (from `blocks/emails`)
- Your custom theme and database schema

## API Endpoints

### Generate Theme
```
POST /api/generate-theme
Body: { "description": "Your SaaS idea" }
Response: { "primaryColor": "...", "secondaryColor": "...", ... }
```

### Generate Blueprint
```
POST /api/architect-blueprint
Body: { "description": "Your SaaS idea" }
Response: { "sqlSchema": "...", "apiSpec": "...", "rlsPolicies": "..." }
```

### Assemble SaaS
```
POST /api/assemble-saas
Body: {
  "appName": "MyApp",
  "saasDescription": "...",
  "theme": { ... },
  "blueprint": { ... }
}
Response: { "message": "New SaaS application 'saas-myapp' assembled at ..." }
```

## Architecture

The Orchestrator integrates with your existing SaaS Factory components:

```
┌─────────────────────────────────────────────────────────┐
│              Orchestrator Dashboard                      │
│  (factory-dashboard/app/orchestrator/page.tsx)          │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────────┐
│ Theme  │  │Architect│  │ Assembler  │
│ Gen    │  │ Agent   │  │ Agent      │
└────────┘  └────────┘  └────────────┘
    │            │            │
    └────────────┼────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────┐      ┌──────────────┐
│ Factory Brain│      │ Blocks       │
│ (Agents)     │      │ (Auth, DB,   │
│              │      │  Payments)   │
└──────────────┘      └──────────────┘
    │                         │
    └────────────┬────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ New SaaS App    │
        │ (apps/saas-xxx) │
        └─────────────────┘
```

## Best Practices

### 1. Detailed Descriptions
The better your SaaS description, the better the generated theme and architecture. Include:
- Target users
- Key features
- Industry/domain
- Design preferences (if any)

**Good**: "A modern CRM for dentists with appointment scheduling, patient records, and billing. Clean, professional design with blue and green accents."

**Better**: "A modern CRM for dentists with appointment scheduling, patient records, and billing. Clean, professional design with blue and green accents. Should support multi-location practices."

### 2. Review Generated Artifacts
Always review the generated SQL schema and API spec before deploying. The AI may need refinement for complex requirements.

### 3. Customize After Assembly
The assembled SaaS is a starting point. You can:
- Add custom pages and components
- Extend the database schema
- Implement business logic
- Add integrations

### 4. Version Control
Commit your generated SaaS to Git immediately after assembly:
```bash
cd apps/saas-myapp
git add .
git commit -m "feat: scaffold new SaaS application from Orchestrator"
```

## Troubleshooting

### Theme Generation Fails
- Ensure your SaaS description is detailed enough
- Check that OpenAI API key is configured
- Try a simpler description and iterate

### Blueprint Generation Fails
- Check that the SQL Generator is working
- Verify OpenAI API key and rate limits
- Ensure your description includes entity names (e.g., "users", "tasks")

### Assembly Fails
- Ensure the base SaaS template exists at `apps/saas-001-booking`
- Check that you have write permissions to the `apps/` directory
- Verify that all required blocks are available

## Next Steps

After assembling your SaaS:

1. **Apply Theme**: Update `tailwind.config.ts` with generated colors
2. **Run Migrations**: Execute generated SQL schema in Supabase
3. **Deploy RLS**: Apply generated RLS policies to your database
4. **Customize**: Add business logic and custom features
5. **Test**: Run tests and verify multi-tenant isolation
6. **Deploy**: Push to production using your CI/CD pipeline

## Advanced Usage

### Custom Theme Modifications
Edit `apps/saas-{appname}/tailwind.config.ts` to further customize:
```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        // Add more custom colors
      },
    },
  },
}
```

### Extending the Database Schema
Add new tables to `apps/saas-{appname}/migrations/` and run:
```bash
supabase db diff migration --schema-file migrations/your-migration.sql
```

### Adding Custom API Routes
Create new API routes in `apps/saas-{appname}/app/api/` following the existing patterns.

## References

- [Nano Banana UI Engine](packages/ui/src/lib/theme-generator.ts)
- [Architect Agent](factory-brain/src/architect-agent.ts)
- [The Assembler](factory-brain/src/assembler-agent.ts)
- [Factory Brain Documentation](factory-brain/README.md)
- [SaaS Factory Blocks](blocks/README.md)
