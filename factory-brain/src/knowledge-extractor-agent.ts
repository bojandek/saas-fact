// @ts-nocheck
import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { RAGSystem } from './rag';
import { logger } from './utils/logger'

interface ExtractedKnowledge {
  title: string;
  content: string;
  category: string;
}

export class KnowledgeExtractorAgent {
  private llm = getLLMClient();
  private ragSystem: RAGSystem;

  constructor() {
    this.llm = getLLMClient();
    this.ragSystem = new RAGSystem();
  }

  async extractAndStoreKnowledge(
    appName: string,
    saasDescription: string,
    generatedTheme: any,
    generatedBlueprint: any,
    generatedLandingPage: any,
    generatedGrowthPlan: any
  ): Promise<void> {
    const knowledgeContent = `
    **SaaS Application: ${appName}**
    **Description:** ${saasDescription}

    **Generated Theme (Nano Banana UI Engine):**
    Primary Color: ${generatedTheme?.primaryColor}
    Secondary Color: ${generatedTheme?.secondaryColor}
    Accent Color: ${generatedTheme?.accentColor}
    Font Family: ${generatedTheme?.fontFamily}
    Border Radius: ${generatedTheme?.borderRadius}

    **Generated Blueprint (Architect Agent):**
    SQL Schema Summary: ${generatedBlueprint?.sqlSchema?.substring(0, 200)}...
    API Spec Summary: ${generatedBlueprint?.apiSpec?.substring(0, 200)}...
    RLS Policies Summary: ${generatedBlueprint?.rlsPolicies?.substring(0, 200)}...

    **Generated Landing Page (Nano Banana Landing Page Generator):**
    Hero Headline: ${generatedLandingPage?.hero?.headline}
    Number of Features: ${generatedLandingPage?.features?.length}
    Number of Pricing Plans: ${generatedLandingPage?.pricing?.length}
    Number of Testimonials: ${generatedLandingPage?.testimonials?.length}

    **Generated Growth Plan (AI Growth Hacker Agent):**
    SEO Meta Title: ${generatedGrowthPlan?.seo?.metaTitle}
    Social Media Posts Count: ${generatedGrowthPlan?.socialMediaPosts?.length}
    Email Campaign Count: ${generatedGrowthPlan?.emailCampaign?.length}

    This knowledge was extracted from the automatically generated SaaS application '${appName}'.
    `;

    const title = `Learned Best Practices for ${appName}`;
    const category = 'learned-best-practices';

    // Use OpenAI to summarize and refine the knowledge before storing
    const summaryPrompt = `Summarize the following extracted knowledge from a generated SaaS application. Focus on key design, architectural, and marketing patterns that could be reused or improved in future SaaS generations. The summary should be concise and highlight actionable insights.

    Extracted Knowledge:
    ${knowledgeContent}

    Provide the summary in Markdown format.`;

    const response = await this.llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      messages: [
        { role: "system", content: "You are an AI assistant that summarizes and extracts best practices from SaaS application generation processes." },
        { role: "user", content: summaryPrompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summarizedContent = response.content?.trim();

    if (summarizedContent) {
      await this.ragSystem.storeDocument({
        id: `${appName}-knowledge-${Date.now()}`,
        title: title,
        content: summarizedContent,
        category: category,
        created_at: new Date().toISOString(),
      });
      logger.info(`Knowledge for ${appName} extracted and stored in RAG.`);
    } else {
      logger.warn(`Failed to summarize knowledge for ${appName}. Not storing.`);
    }
  }
}
