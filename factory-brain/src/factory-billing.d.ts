/**
 * SaaS Factory - Billing & Monetization System
 *
 * Defines the pricing model for the Factory tool itself (not for generated SaaS apps).
 * Uses a Freemium + Pay-per-Export model with optional Agency subscription.
 *
 * Tiers:
 *  - Free:    3 exports/month, community blocks only, watermarked output
 *  - Pro:     Unlimited exports, all blocks, priority generation, $29/month
 *  - Agency:  Everything in Pro + white-label, team seats, API access, $99/month
 */
import { z } from 'zod';
export declare const FACTORY_PLANS: {
    readonly free: {
        readonly id: "free";
        readonly name: "Free";
        readonly priceMonthly: 0;
        readonly priceYearly: 0;
        readonly stripePriceIdMonthly: any;
        readonly stripePriceIdYearly: any;
        readonly limits: {
            readonly exportsPerMonth: 3;
            readonly agentRunsPerMonth: 10;
            readonly blocksAccess: "community";
            readonly teamSeats: 1;
            readonly apiAccess: false;
            readonly whiteLabel: false;
            readonly priorityGeneration: false;
            readonly watermark: true;
        };
        readonly features: readonly ["3 SaaS exports per month", "10 AI agent runs per month", "Community blocks only", "Single user", "Watermarked output"];
    };
    readonly pro: {
        readonly id: "pro";
        readonly name: "Pro";
        readonly priceMonthly: 29;
        readonly priceYearly: 290;
        readonly stripePriceIdMonthly: string;
        readonly stripePriceIdYearly: string;
        readonly limits: {
            readonly exportsPerMonth: -1;
            readonly agentRunsPerMonth: 500;
            readonly blocksAccess: "all";
            readonly teamSeats: 1;
            readonly apiAccess: false;
            readonly whiteLabel: false;
            readonly priorityGeneration: true;
            readonly watermark: false;
        };
        readonly features: readonly ["Unlimited SaaS exports", "500 AI agent runs per month", "All premium blocks", "Priority generation queue", "No watermark", "Export to GitHub"];
    };
    readonly agency: {
        readonly id: "agency";
        readonly name: "Agency";
        readonly priceMonthly: 99;
        readonly priceYearly: 990;
        readonly stripePriceIdMonthly: string;
        readonly stripePriceIdYearly: string;
        readonly limits: {
            readonly exportsPerMonth: -1;
            readonly agentRunsPerMonth: -1;
            readonly blocksAccess: "all";
            readonly teamSeats: 10;
            readonly apiAccess: true;
            readonly whiteLabel: true;
            readonly priorityGeneration: true;
            readonly watermark: false;
        };
        readonly features: readonly ["Everything in Pro", "Unlimited AI agent runs", "10 team seats", "REST API access", "White-label output", "Custom block development", "Priority support"];
    };
};
export type PlanId = keyof typeof FACTORY_PLANS;
export type FactoryPlan = (typeof FACTORY_PLANS)[PlanId];
export declare const UsageRecordSchema: z.ZodObject<{
    userId: z.ZodString;
    planId: z.ZodEnum<["free", "pro", "agency"]>;
    periodStart: z.ZodDate;
    periodEnd: z.ZodDate;
    exportsUsed: z.ZodNumber;
    agentRunsUsed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId?: string;
    planId?: "pro" | "agency" | "free";
    periodStart?: Date;
    periodEnd?: Date;
    exportsUsed?: number;
    agentRunsUsed?: number;
}, {
    userId?: string;
    planId?: "pro" | "agency" | "free";
    periodStart?: Date;
    periodEnd?: Date;
    exportsUsed?: number;
    agentRunsUsed?: number;
}>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export declare class FactoryBillingService {
    /**
     * Check if a user can perform an action based on their plan limits
     */
    canPerformAction(usage: UsageRecord, action: 'export' | 'agentRun'): {
        allowed: boolean;
        reason?: string;
        upgradeUrl?: string;
    };
    /**
     * Get the recommended upgrade plan for a user
     */
    getUpgradeRecommendation(currentPlanId: PlanId): FactoryPlan | null;
    /**
     * Calculate remaining usage for a billing period
     */
    getRemainingUsage(usage: UsageRecord): {
        exportsRemaining: number | 'unlimited';
        agentRunsRemaining: number | 'unlimited';
        percentUsed: {
            exports: number;
            agentRuns: number;
        };
    };
    /**
     * Check if a feature is available on a plan
     */
    hasFeature(planId: PlanId, feature: keyof FactoryPlan['limits']): boolean;
    /**
     * Get annual savings compared to monthly billing
     */
    getAnnualSavings(planId: PlanId): number;
}
export declare const factoryBilling: FactoryBillingService;
//# sourceMappingURL=factory-billing.d.ts.map