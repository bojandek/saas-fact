import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import { KnowledgeExtractorAgent } from './knowledge-extractor-agent';
import { QaAgent } from './qa-agent';

interface AssemblerInput {
  appName: string;
  saasDescription: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  blueprint: {
    sqlSchema: string;
    apiSpec: string;
    rlsPolicies: string;
  };
}

export class AssemblerAgent {
  private baseAppPath: string;
  private appsDir: string;
  private knowledgeExtractorAgent: KnowledgeExtractorAgent;

  constructor() {
    this.baseAppPath = path.join(process.cwd(), 'apps', 'saas-001-booking'); // Base template for new micro-frontends
    this.appsDir = path.join(process.cwd(), 'apps');
    this.knowledgeExtractorAgent = new KnowledgeExtractorAgent();
  }

  private async copyBaseApp(newAppName: string): Promise<string> {
    const targetAppPath = path.join(this.appsDir, newAppName);
    await fs.mkdir(targetAppPath, { recursive: true });
    // Copy base app as a micro-frontend
    await execa('cp', ['-r', this.baseAppPath + '/.', targetAppPath]);
    // Modify package.json for micro-frontend setup (e.g., unique name, specific build script)
    const packageJsonPath = path.join(targetAppPath, 'package.json');
    let packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    packageJsonContent = packageJsonContent.replace(/"name": ".*?"/, `"name": "@saas-factory/${newAppName}"`);
    await fs.writeFile(packageJsonPath, packageJsonContent);
    console.log(`Copied base app as micro-frontend to ${targetAppPath}`);
    return targetAppPath;
  }

  private async applyTheme(appPath: string, theme: AssemblerInput['theme']) {
    const tailwindConfigPath = path.join(appPath, 'tailwind.config.ts');
    let tailwindConfigContent = await fs.readFile(tailwindConfigPath, 'utf-8');

    // Simple replacement for demonstration. A more robust solution would parse/modify AST.
    tailwindConfigContent = tailwindConfigContent.replace(
      /primary: {\s*DEFAULT: ".*?",\s*foreground: ".*?"\s*}/,
      `primary: { DEFAULT: "${theme.primaryColor}", foreground: "${theme.secondaryColor}" }`
    );
    // Add more sophisticated theme application here (e.g., extend colors, fonts)

    await fs.writeFile(tailwindConfigPath, tailwindConfigContent);
    console.log(`Applied theme to ${appPath}/tailwind.config.ts`);
  }

  private async applySqlSchema(sqlSchema: string) {
    // In a real scenario, this would execute SQL against Supabase or generate a migration file.
    // For now, we'll just log it or save it to a file within the new app.
    const dbMigrationPath = path.join(this.appsDir, 'new-app-migrations', 'generated-schema.sql');
    await fs.mkdir(path.dirname(dbMigrationPath), { recursive: true });
    await fs.writeFile(dbMigrationPath, sqlSchema);
    console.log(`Generated SQL schema saved to ${dbMigrationPath}`);
    // Here you would typically run a command to apply this schema to Supabase
    // e.g., `supabase db diff migration --schema-file ${dbMigrationPath}`
  }

  private async applyRlsPolicies(rlsPolicies: string) {
    const rlsPolicyPath = path.join(this.appsDir, 'new-app-migrations', 'generated-rls-policies.sql');
    await fs.mkdir(path.dirname(rlsPolicyPath), { recursive: true });
    await fs.writeFile(rlsPolicyPath, rlsPolicies);
    console.log(`Generated RLS policies saved to ${rlsPolicyPath}`);
    // Similar to SQL schema, these would be applied to Supabase
  }

  async assemble(input: AssemblerInput): Promise<string> {
    const newAppName = `saas-${input.appName.toLowerCase().replace(/\s/g, '-')}`;
    const targetAppPath = await this.copyBaseApp(newAppName);

    await this.applyTheme(targetAppPath, input.theme);
    await this.applySqlSchema(input.blueprint.sqlSchema);
    await this.applyRlsPolicies(input.blueprint.rlsPolicies);

    // Further steps: generate API routes based on apiSpec, generate basic UI components/pages

    // Automatically extract and store knowledge after assembly
    // Automatically extract and store knowledge after assembly
    await this.knowledgeExtractorAgent.extractAndStoreKnowledge(
      input.appName,
      input.saasDescription,
      input.theme,
      input.blueprint,
      null, // Landing page content is not directly available here, but can be passed if needed
      null  // Growth plan is not directly available here, but can be passed if needed
    );

    // Placeholder for generating Playwright tests
        // Call the QaAgent to generate tests
    const qaAgent = new QaAgent();
    const { tests: generatedTests, messages: qaMessages, context: qaContext } = await qaAgent.generateTests({
      saasDescription: input.saasDescription,
      appName: newAppName,
      generatedTheme: input.theme,
      generatedBlueprint: input.blueprint,
      generatedLandingPage: null, // This would ideally come from a previous step
      generatedGrowthPlan: null, // This would ideally come from a previous step
      context: null, // Pass the current context if available
    });
    console.log(`Generated QA Tests for ${newAppName}: ${generatedTests.testSummary}`);
    // Save the generated tests to the new app directory
    const testFilePath = path.join(targetAppPath, 'e2e', 'saas.spec.ts');
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, generatedTests.playwrightTests);
    console.log(`Playwright tests saved to ${testFilePath}`);


    return `New SaaS application '${newAppName}' assembled at ${targetAppPath}`;
  }
}
