import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { AgentContext, AgentMessage } from './war-room-orchestrator';
import { QA_AGENT_PROMPT } from './prompts/agent-prompts';

interface GeneratedTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
}

interface ArchitectBlueprint {
  sqlSchema: string;
  apiSpec: string;
  rlsPolicies: string;
}

interface LandingPageContent {
  hero: {
    headline: string;
    subheadline: string;
    callToAction: string;
  };
  features: Array<{
    title: string;
    description: string;
  }>;
  pricing: Array<{
    planName: string;
    price: string;
    features: string[];
    callToAction: string;
  }>;
  testimonials: Array<{
    quote: string;
    author: string;
    company: string;
  }>;
}

interface GrowthPlan {
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  socialMediaPosts: Array<{
    platform: string;
    content: string;
    hashtags: string[];
  }>;
  emailCampaign: Array<{
    subject: string;
    body: string;
  }>;
}

interface QaAgentInput {
  saasDescription: string;
  appName: string;
  generatedTheme: GeneratedTheme;
  generatedBlueprint: ArchitectBlueprint;
  generatedLandingPage: LandingPageContent;
  generatedGrowthPlan: GrowthPlan;
  context: AgentContext | null;
}

interface GeneratedTests {
  playwrightTests: string;
  testSummary: string;
}

export class QaAgent {
  private llm = getLLMClient();
  private warRoomMessages: AgentMessage[] = [];
  private currentContext: AgentContext;

  constructor(context: AgentContext | null = null) {
    this.llm = getLLMClient()
    this.currentContext = context || { history: [] };
  }

  private addMessage(sender: string, recipient: string, type: 'info' | 'request' | 'response', content: string) {
    this.warRoomMessages.push({ sender, recipient, type, content });
    this.currentContext.history.push({ sender, recipient, type, content });
  }

  public async generateTests({
    saasDescription,
    appName,
    generatedTheme,
    generatedBlueprint,
    generatedLandingPage,
    generatedGrowthPlan,
    context,
  }: QaAgentInput): Promise<{ tests: GeneratedTests; messages: AgentMessage[]; context: AgentContext }> {
    this.addMessage('QaAgent', 'Orchestrator', 'info', 'Starting to generate Playwright tests...');

    const prompt = `
      You are an expert QA Engineer. Your task is to generate comprehensive Playwright tests for a SaaS application.
      The tests should cover critical user flows such as:
      1. User registration and login.
      2. Basic CRUD operations (if applicable based on blueprint).
      3. Navigation to key pages (e.g., dashboard, settings).
      4. Interaction with the landing page elements.
      5. Basic form submissions.

      Focus on end-to-end (E2E) tests. Use TypeScript for Playwright tests.

      Here is the context of the SaaS application:
      SaaS Description: ${saasDescription}
      App Name: ${appName}
      Theme: ${JSON.stringify(generatedTheme, null, 2)}
      Blueprint (SQL Schema, API Spec, RLS Policies): ${JSON.stringify(generatedBlueprint, null, 2)}
      Landing Page Content: ${JSON.stringify(generatedLandingPage, null, 2)}
      Growth Plan (SEO, Social Media, Email Campaigns): ${JSON.stringify(generatedGrowthPlan, null, 2)}

      Generate the Playwright test code (TypeScript) and a summary of what the tests cover.
      Return a JSON object with two fields: 'playwrightTests' (string) and 'testSummary' (string).
    `;

    try {
      const response = await this.llm.chat({
        model: CLAUDE_MODELS.HAIKU, // Using a capable model for code generation
        messages: [
          { role: 'system', content: QA_AGENT_PROMPT + '\n\nYou are an expert QA Engineer generating Playwright tests.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawOutput = response.choices[0].message?.content;
      if (!rawOutput) {
        throw new Error('No output from OpenAI API for QA Agent.');
      }

      const parsedOutput: GeneratedTests = JSON.parse(rawOutput);
      this.addMessage('QaAgent', 'Orchestrator', 'response', 'Successfully generated Playwright tests.');

      return { tests: parsedOutput, messages: this.warRoomMessages, context: this.currentContext };
    } catch (error) {
      this.addMessage('QaAgent', 'Orchestrator', 'error', `Failed to generate tests: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
