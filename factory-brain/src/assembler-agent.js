"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssemblerAgent = void 0;
const execa_1 = require("execa");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const knowledge_extractor_agent_1 = require("./knowledge-extractor-agent");
const qa_agent_1 = require("./qa-agent");
const component_generator_1 = require("../../packages/ui/src/lib/component-generator");
const logger_1 = require("./utils/logger");
class AssemblerAgent {
    constructor() {
        this.baseAppPath = path_1.default.join(process.cwd(), 'apps', 'saas-001-booking'); // Base template for new micro-frontends
        this.appsDir = path_1.default.join(process.cwd(), 'apps');
        this.knowledgeExtractorAgent = new knowledge_extractor_agent_1.KnowledgeExtractorAgent();
    }
    async copyBaseApp(newAppName) {
        const targetAppPath = path_1.default.join(this.appsDir, newAppName);
        await promises_1.default.mkdir(targetAppPath, { recursive: true });
        // Copy base app as a micro-frontend
        await (0, execa_1.execa)('cp', ['-r', this.baseAppPath + '/.', targetAppPath]);
        // Modify package.json for micro-frontend setup (e.g., unique name, specific build script)
        const packageJsonPath = path_1.default.join(targetAppPath, 'package.json');
        let packageJsonContent = await promises_1.default.readFile(packageJsonPath, 'utf-8');
        packageJsonContent = packageJsonContent.replace(/"name": ".*?"/, `"name": "@saas-factory/${newAppName}"`);
        await promises_1.default.writeFile(packageJsonPath, packageJsonContent);
        logger_1.logger.info(`Copied base app as micro-frontend to ${targetAppPath}`);
        return targetAppPath;
    }
    async applyTheme(appPath, theme) {
        const tailwindConfigPath = path_1.default.join(appPath, 'tailwind.config.ts');
        let tailwindConfigContent = await promises_1.default.readFile(tailwindConfigPath, 'utf-8');
        // Simple replacement for demonstration. A more robust solution would parse/modify AST.
        tailwindConfigContent = tailwindConfigContent.replace(/primary: {\s*DEFAULT: ".*?",\s*foreground: ".*?"\s*}/, `primary: { DEFAULT: "${theme.primaryColor}", foreground: "${theme.secondaryColor}" }`);
        // Add more sophisticated theme application here (e.g., extend colors, fonts)
        await promises_1.default.writeFile(tailwindConfigPath, tailwindConfigContent);
        logger_1.logger.info(`Applied theme to ${appPath}/tailwind.config.ts`);
    }
    async applySqlSchema(sqlSchema) {
        // In a real scenario, this would execute SQL against Supabase or generate a migration file.
        // For now, we'll just log it or save it to a file within the new app.
        const dbMigrationPath = path_1.default.join(this.appsDir, 'new-app-migrations', 'generated-schema.sql');
        await promises_1.default.mkdir(path_1.default.dirname(dbMigrationPath), { recursive: true });
        await promises_1.default.writeFile(dbMigrationPath, sqlSchema);
        logger_1.logger.info(`Generated SQL schema saved to ${dbMigrationPath}`);
        // Here you would typically run a command to apply this schema to Supabase
        // e.g., `supabase db diff migration --schema-file ${dbMigrationPath}`
    }
    async applyRlsPolicies(rlsPolicies) {
        const rlsPolicyPath = path_1.default.join(this.appsDir, 'new-app-migrations', 'generated-rls-policies.sql');
        await promises_1.default.mkdir(path_1.default.dirname(rlsPolicyPath), { recursive: true });
        await promises_1.default.writeFile(rlsPolicyPath, rlsPolicies);
        logger_1.logger.info(`Generated RLS policies saved to ${rlsPolicyPath}`);
        // Similar to SQL schema, these would be applied to Supabase
    }
    async generateAndSaveComponents(appPath, theme, saasDescription) {
        const componentGenerator = new component_generator_1.NanoBananaComponentGenerator();
        // Example components to generate based on a generic SaaS. This can be made smarter.
        const componentsToGenerate = [
            { name: 'PrimaryButton', type: 'button' },
            { name: 'AuthForm', type: 'form', properties: { fields: [{ name: 'email', label: 'Email', type: 'email' }, { name: 'password', label: 'Password', type: 'password' }] } },
            { name: 'DashboardCard', type: 'card' },
        ];
        const generatedComponents = [];
        for (const compDef of componentsToGenerate) {
            const config = { componentName: compDef.name, componentType: compDef.type, theme, properties: compDef.properties };
            let generatedComp;
            switch (compDef.type) {
                case 'form':
                    generatedComp = component_generator_1.NanoBananaComponentGenerator.generateFormComponent(config);
                    break;
                case 'card':
                    generatedComp = component_generator_1.NanoBananaComponentGenerator.generateCardComponent(config);
                    break;
                case 'button':
                    generatedComp = component_generator_1.NanoBananaComponentGenerator.generateButtonComponent(config);
                    break;
                default:
                    generatedComp = component_generator_1.NanoBananaComponentGenerator.generateCardComponent(config);
            }
            generatedComponents.push(generatedComp);
        }
        const componentsDir = path_1.default.join(appPath, 'src', 'components', 'generated');
        await promises_1.default.mkdir(componentsDir, { recursive: true });
        for (const comp of generatedComponents) {
            const filePath = path_1.default.join(componentsDir, `${comp.name}.tsx`);
            await promises_1.default.writeFile(filePath, comp.code);
            logger_1.logger.info(`Generated component ${comp.name} saved to ${filePath}`);
        }
        logger_1.logger.info(`Generated ${generatedComponents.length} UI components for ${appPath}`);
    }
    async assemble(input) {
        const newAppName = `saas-${input.appName.toLowerCase().replace(/\s/g, '-')}`;
        const targetAppPath = await this.copyBaseApp(newAppName);
        await this.applyTheme(targetAppPath, input.theme);
        await this.applySqlSchema(input.blueprint.sqlSchema);
        await this.applyRlsPolicies(input.blueprint.rlsPolicies);
        // Generate and save UI components based on theme and description
        await this.generateAndSaveComponents(targetAppPath, input.theme, input.saasDescription);
        // Further steps: generate API routes based on apiSpec, generate basic UI components/pages
        // Automatically extract and store knowledge after assembly
        await this.knowledgeExtractorAgent.extractAndStoreKnowledge(input.appName, input.saasDescription, input.theme, input.blueprint, null, // Landing page content is not directly available here, but can be passed if needed
        null // Growth plan is not directly available here, but can be passed if needed
        );
        // Placeholder for generating Playwright tests
        // Call the QaAgent to generate tests
        const qaAgent = new qa_agent_1.QaAgent();
        const { tests: generatedTests, messages: qaMessages, context: qaContext } = await qaAgent.generateTests({
            saasDescription: input.saasDescription,
            appName: newAppName,
            generatedTheme: input.theme,
            generatedBlueprint: input.blueprint,
            generatedLandingPage: null, // This would ideally come from a previous step
            generatedGrowthPlan: null, // This would ideally come from a previous step
            context: null, // Pass the current context if available
        });
        logger_1.logger.info(`Generated QA Tests for ${newAppName}: ${generatedTests.testSummary}`);
        // Save the generated tests to the new app directory
        const testFilePath = path_1.default.join(targetAppPath, 'e2e', 'saas.spec.ts');
        await promises_1.default.mkdir(path_1.default.dirname(testFilePath), { recursive: true });
        await promises_1.default.writeFile(testFilePath, generatedTests.playwrightTests);
        logger_1.logger.info(`Playwright tests saved to ${testFilePath}`);
        return `New SaaS application '${newAppName}' assembled at ${targetAppPath}`;
    }
}
exports.AssemblerAgent = AssemblerAgent;
//# sourceMappingURL=assembler-agent.js.map