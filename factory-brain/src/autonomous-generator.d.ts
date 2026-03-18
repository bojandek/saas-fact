/**
 * Autonomous Generator Engine
 *
 * This is the core of the "Automaton" — it runs the full SaaS generation
 * pipeline DIRECTLY, without any HTTP dependency on factory-dashboard.
 *
 * The CLI can invoke this directly:
 *   factory generate --niche "teretana-crm"
 *   factory generate --desc "A booking app for yoga studios" --name yoga-sync
 *
 * Pipeline:
 *   1. NicheMapper → select blocks & features
 *   2. ArchitectAgent → generate SQL schema + API spec
 *   3. WarRoomOrchestrator → run all agents in parallel
 *   4. AssemblerAgent → scaffold the app in apps/
 *   5. CoolifyDeployAgent → deploy to Coolify (optional)
 *   6. AutonomousLearningLoop → store result in memory
 */
import { NicheBlueprint } from './niche-mapper.js';
export interface GenerateOptions {
    /** Niche shorthand: "teretana-crm", "salon-booking", etc. */
    niche?: string;
    /** Free-form description (used if niche not provided) */
    description?: string;
    /** App name (slug): "my-gym-app" */
    appName: string;
    /** Organisation ID for RLS */
    orgId?: string;
    /** Skip Coolify deployment */
    skipDeploy?: boolean;
    /** Skip QA agent */
    skipQA?: boolean;
    /** Callback for real-time progress updates */
    onProgress?: (event: ProgressEvent) => void;
}
export interface ProgressEvent {
    step: GenerationStep;
    status: 'started' | 'completed' | 'failed';
    message: string;
    data?: unknown;
    timestamp: Date;
    elapsedMs: number;
}
export type GenerationStep = 'niche-mapping' | 'architecture' | 'war-room' | 'assembly' | 'deployment' | 'learning';
export interface GenerationResult {
    success: boolean;
    appName: string;
    appPath: string;
    niche: string;
    blueprint: NicheBlueprint;
    deployUrl?: string;
    totalCostUsd: number;
    totalDurationMs: number;
    steps: ProgressEvent[];
    error?: string;
}
export declare class AutonomousGenerator {
    private nicheMapper;
    private log;
    private startTime;
    private steps;
    generate(opts: GenerateOptions): Promise<GenerationResult>;
    private runStep;
    private emit;
    /**
     * Physically scaffold the app in apps/ directory
     */
    private assembleApp;
    /**
     * Generate fallback SQL schema from blueprint tables
     */
    private generateFallbackSQL;
}
//# sourceMappingURL=autonomous-generator.d.ts.map