import { WarRoomOrchestrator, AgentContext } from './war-room-orchestrator';
interface ArchitectBlueprint {
    sqlSchema: string;
    apiSpec: string;
    rlsPolicies: string;
}
export declare class ArchitectAgent {
    private llm;
    private sqlGenerator;
    private ragSystem;
    private orchestrator?;
    private log;
    constructor(orchestrator?: WarRoomOrchestrator);
    generateBlueprint(saasDescription: string, currentContext?: AgentContext): Promise<ArchitectBlueprint>;
}
export {};
//# sourceMappingURL=architect-agent.d.ts.map