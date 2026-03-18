import { WarRoomOrchestrator, AgentContext } from './war-room-orchestrator';
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
export declare class GrowthHackerAgent {
    private llm;
    private ragSystem;
    private orchestrator?;
    constructor(orchestrator?: WarRoomOrchestrator);
    generateGrowthPlan(saasDescription: string, currentContext?: AgentContext): Promise<GrowthPlan>;
}
export {};
//# sourceMappingURL=growth-hacker-agent.d.ts.map