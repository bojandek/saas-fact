/**
 * usage-billing.ts
 *
 * Stripe usage-based billing for SaaS Factory.
 * Charges are metered per agent execution, not flat-rate.
 *
 * Pricing model:
 *   - FREE tier:    5 generations/month (no charge)
 *   - PRO tier:     $0.50 per generation (Stripe metered billing)
 *   - AGENCY tier:  $0.25 per generation (volume discount)
 *   - ENTERPRISE:   Custom pricing, invoiced monthly
 *
 * Each "generation" = one full War Room pipeline execution
 * (Architect + Assembler + QA + Legal + Growth + Compliance agents)
 */
export type BillingTier = 'free' | 'pro' | 'agency' | 'enterprise';
export interface UsageRecord {
    orgId: string;
    userId: string;
    tier: BillingTier;
    agentType: string;
    tokensUsed: number;
    costUsd: number;
    projectName: string;
    timestamp: Date;
    stripeSubscriptionItemId?: string;
}
export interface BillingConfig {
    stripeSecretKey: string;
    webhookSecret: string;
    prices: {
        pro: string;
        agency: string;
    };
}
export interface UsageSummary {
    orgId: string;
    tier: BillingTier;
    periodStart: Date;
    periodEnd: Date;
    totalGenerations: number;
    totalTokens: number;
    totalCostUsd: number;
    freeGenerationsUsed: number;
    freeGenerationsLimit: number;
    billableGenerations: number;
    estimatedInvoiceUsd: number;
}
export declare class UsageBillingService {
    private stripe;
    private config;
    private billingLog;
    constructor(config: BillingConfig);
    /**
     * Record a generation event and bill the org if applicable.
     * Call this at the END of a successful War Room pipeline run.
     */
    recordGeneration(params: {
        orgId: string;
        userId: string;
        tier: BillingTier;
        projectName: string;
        tokensUsed: number;
        costUsd: number;
        stripeSubscriptionItemId?: string;
    }): Promise<{
        billed: boolean;
        amount: number;
        error?: string;
    }>;
    /**
     * Get usage summary for an org in the current billing period.
     */
    getUsageSummary(orgId: string, tier: BillingTier): Promise<UsageSummary>;
    /**
     * Check if an org is allowed to run a generation based on their tier.
     */
    checkGenerationAllowed(orgId: string, tier: BillingTier): Promise<{
        allowed: boolean;
        reason?: string;
        upgradeUrl?: string;
    }>;
    /**
     * Handle Stripe webhook events for subscription changes.
     */
    handleWebhook(rawBody: string, signature: string): Promise<{
        handled: boolean;
        event?: string;
    }>;
    /**
     * Create a Stripe checkout session for upgrading to PRO or AGENCY.
     */
    createCheckoutSession(params: {
        orgId: string;
        userId: string;
        tier: 'pro' | 'agency';
        successUrl: string;
        cancelUrl: string;
        customerEmail?: string;
    }): Promise<{
        url: string;
        sessionId: string;
    }>;
    /**
     * Create a Stripe customer portal session for managing subscriptions.
     */
    createPortalSession(params: {
        stripeCustomerId: string;
        returnUrl: string;
    }): Promise<{
        url: string;
    }>;
    private getMonthlyGenerationCount;
    private handleSubscriptionChange;
    private handleSubscriptionCancelled;
}
export declare function getUsageBillingService(): UsageBillingService;
//# sourceMappingURL=usage-billing.d.ts.map