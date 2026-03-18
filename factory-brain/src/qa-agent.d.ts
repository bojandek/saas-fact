import { AgentContext, AgentMessage } from './war-room-orchestrator';
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
export declare class QaAgent {
    private llm;
    private warRoomMessages;
    private currentContext;
    constructor(context?: AgentContext | null);
    private addMessage;
    generateTests({ saasDescription, appName, generatedTheme, generatedBlueprint, generatedLandingPage, generatedGrowthPlan, context, }: QaAgentInput): Promise<{
        tests: GeneratedTests;
        messages: AgentMessage[];
        context: AgentContext;
    }>;
}
export {};
//# sourceMappingURL=qa-agent.d.ts.map