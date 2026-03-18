"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageBillingService = void 0;
exports.getUsageBillingService = getUsageBillingService;
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
// ── Constants ──────────────────────────────────────────────────────────────────
const FREE_TIER_LIMIT = 5; // generations per month
const PRICE_PER_GENERATION = {
    free: 0,
    pro: 0.50,
    agency: 0.25,
    enterprise: 0, // invoiced separately
};
// ── UsageBillingService ────────────────────────────────────────────────────────
class UsageBillingService {
    constructor(config) {
        this.billingLog = []; // In-memory buffer, flush to DB periodically
        this.config = config;
        this.stripe = new stripe_1.default(config.stripeSecretKey, {
            apiVersion: '2024-12-18.acacia',
        });
    }
    /**
     * Record a generation event and bill the org if applicable.
     * Call this at the END of a successful War Room pipeline run.
     */
    async recordGeneration(params) {
        const record = {
            ...params,
            agentType: 'war-room-pipeline',
            timestamp: new Date(),
        };
        this.billingLog.push(record);
        // Free tier: check monthly limit
        if (params.tier === 'free') {
            const monthlyCount = await this.getMonthlyGenerationCount(params.orgId);
            if (monthlyCount > FREE_TIER_LIMIT) {
                logger_1.logger.warn({ orgId: params.orgId, count: monthlyCount }, 'Free tier limit exceeded');
                return {
                    billed: false,
                    amount: 0,
                    error: `Free tier limit of ${FREE_TIER_LIMIT} generations/month exceeded. Upgrade to PRO.`,
                };
            }
            return { billed: false, amount: 0 };
        }
        // Enterprise: no metered billing
        if (params.tier === 'enterprise') {
            logger_1.logger.info({ orgId: params.orgId, project: params.projectName }, 'Enterprise generation recorded');
            return { billed: true, amount: 0 };
        }
        // PRO / AGENCY: report to Stripe metered billing
        if (params.stripeSubscriptionItemId) {
            try {
                await this.stripe.subscriptionItems.createUsageRecord(params.stripeSubscriptionItemId, {
                    quantity: 1,
                    timestamp: Math.floor(Date.now() / 1000),
                    action: 'increment',
                });
                const amount = PRICE_PER_GENERATION[params.tier];
                logger_1.logger.info({ orgId: params.orgId, tier: params.tier, amount }, 'Stripe usage record created');
                return { billed: true, amount };
            }
            catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown Stripe error';
                logger_1.logger.error({ orgId: params.orgId, error }, 'Failed to create Stripe usage record');
                return { billed: false, amount: 0, error };
            }
        }
        return { billed: false, amount: 0, error: 'No Stripe subscription item ID provided' };
    }
    /**
     * Get usage summary for an org in the current billing period.
     */
    async getUsageSummary(orgId, tier) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const monthlyRecords = this.billingLog.filter((r) => r.orgId === orgId && r.timestamp >= periodStart);
        const totalGenerations = monthlyRecords.length;
        const totalTokens = monthlyRecords.reduce((sum, r) => sum + r.tokensUsed, 0);
        const totalCostUsd = monthlyRecords.reduce((sum, r) => sum + r.costUsd, 0);
        const freeGenerationsUsed = Math.min(totalGenerations, FREE_TIER_LIMIT);
        const billableGenerations = tier === 'free'
            ? 0
            : Math.max(0, totalGenerations - (tier === 'pro' ? 0 : 0));
        const pricePerGen = PRICE_PER_GENERATION[tier];
        const estimatedInvoiceUsd = billableGenerations * pricePerGen;
        return {
            orgId,
            tier,
            periodStart,
            periodEnd,
            totalGenerations,
            totalTokens,
            totalCostUsd,
            freeGenerationsUsed,
            freeGenerationsLimit: FREE_TIER_LIMIT,
            billableGenerations,
            estimatedInvoiceUsd,
        };
    }
    /**
     * Check if an org is allowed to run a generation based on their tier.
     */
    async checkGenerationAllowed(orgId, tier) {
        if (tier !== 'free') {
            return { allowed: true };
        }
        const monthlyCount = await this.getMonthlyGenerationCount(orgId);
        if (monthlyCount >= FREE_TIER_LIMIT) {
            return {
                allowed: false,
                reason: `You've used ${monthlyCount}/${FREE_TIER_LIMIT} free generations this month.`,
                upgradeUrl: '/pricing',
            };
        }
        return { allowed: true };
    }
    /**
     * Handle Stripe webhook events for subscription changes.
     */
    async handleWebhook(rawBody, signature) {
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Stripe webhook signature verification failed');
            return { handled: false };
        }
        logger_1.logger.info({ type: event.type }, 'Stripe webhook received');
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await this.handleSubscriptionChange(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await this.handleSubscriptionCancelled(subscription);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                logger_1.logger.info({ customerId: invoice.customer, amount: invoice.amount_paid }, 'Invoice payment succeeded');
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                logger_1.logger.warn({ customerId: invoice.customer, amount: invoice.amount_due }, 'Invoice payment failed — consider downgrading org to free tier');
                break;
            }
            default:
                logger_1.logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
        }
        return { handled: true, event: event.type };
    }
    /**
     * Create a Stripe checkout session for upgrading to PRO or AGENCY.
     */
    async createCheckoutSession(params) {
        const priceId = params.tier === 'pro'
            ? this.config.prices.pro
            : this.config.prices.agency;
        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId }],
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            customer_email: params.customerEmail,
            metadata: {
                orgId: params.orgId,
                userId: params.userId,
                tier: params.tier,
            },
            subscription_data: {
                metadata: {
                    orgId: params.orgId,
                    tier: params.tier,
                },
            },
        });
        return {
            url: session.url,
            sessionId: session.id,
        };
    }
    /**
     * Create a Stripe customer portal session for managing subscriptions.
     */
    async createPortalSession(params) {
        const session = await this.stripe.billingPortal.sessions.create({
            customer: params.stripeCustomerId,
            return_url: params.returnUrl,
        });
        return { url: session.url };
    }
    // ── Private helpers ──────────────────────────────────────────────────────────
    async getMonthlyGenerationCount(orgId) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.billingLog.filter((r) => r.orgId === orgId && r.timestamp >= periodStart).length;
    }
    async handleSubscriptionChange(subscription) {
        const orgId = subscription.metadata?.orgId;
        const tier = subscription.metadata?.tier;
        if (!orgId || !tier) {
            logger_1.logger.warn({ subscriptionId: subscription.id }, 'Subscription missing orgId or tier metadata');
            return;
        }
        logger_1.logger.info({ orgId, tier, status: subscription.status }, 'Subscription updated');
        // In production: update org tier in database
    }
    async handleSubscriptionCancelled(subscription) {
        const orgId = subscription.metadata?.orgId;
        if (!orgId)
            return;
        logger_1.logger.info({ orgId }, 'Subscription cancelled — downgrading to free tier');
        // In production: update org tier to 'free' in database
    }
}
exports.UsageBillingService = UsageBillingService;
// ── Singleton factory ──────────────────────────────────────────────────────────
let _instance = null;
function getUsageBillingService() {
    if (!_instance) {
        _instance = new UsageBillingService({
            stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
            prices: {
                pro: process.env.STRIPE_PRICE_PRO ?? '',
                agency: process.env.STRIPE_PRICE_AGENCY ?? '',
            },
        });
    }
    return _instance;
}
//# sourceMappingURL=usage-billing.js.map