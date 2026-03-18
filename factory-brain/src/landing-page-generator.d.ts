import { WarRoomOrchestrator, AgentContext } from './war-room-orchestrator';
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
export declare class LandingPageGenerator {
    private llm;
    private ragSystem;
    private orchestrator?;
    constructor(orchestrator?: WarRoomOrchestrator);
    generateContent(saasDescription: string, currentContext?: AgentContext): Promise<LandingPageContent>;
}
export {};
//# sourceMappingURL=landing-page-generator.d.ts.map