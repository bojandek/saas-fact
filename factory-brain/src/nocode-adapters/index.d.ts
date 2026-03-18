/**
 * No-Code Adapters
 *
 * Converts SaaS Factory architecture blueprints into formats compatible with
 * popular No-Code and Low-Code platforms.
 *
 * Supported targets:
 *  - FlutterFlow (mobile app builder)
 *  - Bubble (web app builder)
 *  - Webflow (website builder)
 *  - Retool (internal tools)
 *  - Zapier (workflow automation)
 */
import { z } from 'zod';
export declare const BlueprintSchema: z.ZodObject<{
    appName: z.ZodString;
    description: z.ZodString;
    sqlSchema: z.ZodString;
    apiSpec: z.ZodString;
    features: z.ZodArray<z.ZodString, "many">;
    pricingModel: z.ZodEnum<["Freemium", "Subscription", "PayAsYouGo", "Hybrid"]>;
    techStack: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    pricingModel?: "Freemium" | "Subscription" | "PayAsYouGo" | "Hybrid";
    description?: string;
    appName?: string;
    features?: string[];
    sqlSchema?: string;
    apiSpec?: string;
    techStack?: string[];
}, {
    pricingModel?: "Freemium" | "Subscription" | "PayAsYouGo" | "Hybrid";
    description?: string;
    appName?: string;
    features?: string[];
    sqlSchema?: string;
    apiSpec?: string;
    techStack?: string[];
}>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
export interface AdapterOutput {
    platform: string;
    format: 'json' | 'yaml' | 'csv' | 'markdown';
    content: string;
    instructions: string[];
    limitations: string[];
}
declare abstract class BaseAdapter {
    abstract readonly platform: string;
    abstract readonly outputFormat: 'json' | 'yaml' | 'csv' | 'markdown';
    abstract convert(blueprint: Blueprint): AdapterOutput;
    protected parseTableNames(sqlSchema: string): string[];
    protected parseColumns(sqlSchema: string, tableName: string): Array<{
        name: string;
        type: string;
    }>;
    protected parseApiEndpoints(apiSpec: string): Array<{
        path: string;
        method: string;
        description: string;
    }>;
}
export declare class FlutterFlowAdapter extends BaseAdapter {
    readonly platform = "FlutterFlow";
    readonly outputFormat: "json";
    convert(blueprint: Blueprint): AdapterOutput;
    private mapSqlTypeToFlutterFlow;
    private generateFlutterFlowPages;
}
export declare class BubbleAdapter extends BaseAdapter {
    readonly platform = "Bubble";
    readonly outputFormat: "json";
    convert(blueprint: Blueprint): AdapterOutput;
    private mapSqlTypeToBubble;
    private generateBubbleWorkflows;
}
export declare class ZapierAdapter extends BaseAdapter {
    readonly platform = "Zapier";
    readonly outputFormat: "json";
    convert(blueprint: Blueprint): AdapterOutput;
}
export declare class RetoolAdapter extends BaseAdapter {
    readonly platform = "Retool";
    readonly outputFormat: "json";
    convert(blueprint: Blueprint): AdapterOutput;
}
export type NoCodePlatform = 'flutterflow' | 'bubble' | 'zapier' | 'retool';
export declare class NoCodeAdapterFactory {
    private adapters;
    /**
     * Convert a blueprint to a specific platform format
     */
    convert(platform: NoCodePlatform, blueprint: Blueprint): AdapterOutput;
    /**
     * Convert a blueprint to all supported platforms
     */
    convertAll(blueprint: Blueprint): Record<NoCodePlatform, AdapterOutput>;
    /**
     * Get list of supported platforms
     */
    getSupportedPlatforms(): NoCodePlatform[];
}
export declare const noCodeAdapterFactory: NoCodeAdapterFactory;
export {};
//# sourceMappingURL=index.d.ts.map