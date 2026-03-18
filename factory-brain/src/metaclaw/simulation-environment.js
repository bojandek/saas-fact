"use strict";
/**
 * MetaClaw Simulation Environment
 *
 * Replaces random fitness evaluation with a deterministic simulation model.
 * Each genome is evaluated against realistic SaaS performance metrics based on
 * its architecture choices, feature set, and monetization strategy.
 *
 * This allows the genetic algorithm to make informed decisions rather than
 * random walks, dramatically improving convergence speed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateFitness = simulateFitness;
exports.compareGenomes = compareGenomes;
exports.evaluatePopulation = evaluatePopulation;
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// Simulation Constants
// ---------------------------------------------------------------------------
/** Architecture performance scores (0-100 base) */
const ARCH_PERFORMANCE_SCORES = {
    'Next.js': 85,
    'Nuxt.js': 80,
    'Remix': 82,
    'Express': 70,
    'Fastify': 88,
    'NestJS': 75,
    'PostgreSQL': 90,
    'MySQL': 82,
    'MongoDB': 75,
    'Redis': 95,
    'Supabase': 85,
};
const API_STYLE_SCORES = {
    REST: 80,
    GraphQL: 85,
    gRPC: 90,
    Mixed: 75,
};
const CACHING_SCORES = {
    Redis: 95,
    'Multi-layer': 92,
    CDN: 80,
    Browser: 65,
};
const PRICING_CONVERSION_RATES = {
    Freemium: 0.05, // 5% free-to-paid conversion
    Subscription: 0.12, // 12% direct subscription
    PayAsYouGo: 0.08, // 8% pay-as-you-go
    Hybrid: 0.10, // 10% hybrid model
};
/**
 * Evaluate a genome's fitness using deterministic simulation
 * instead of random values.
 */
function simulateFitness(genome, context = {
    marketSegment: 'b2b',
    expectedMAU: 1000,
    competitionLevel: 0.5,
    budgetLevel: 0.5,
}) {
    const warnings = [];
    const recommendations = [];
    // --- Performance Score ---
    let performanceScore = 60; // base
    // Tech stack contribution
    const stackScores = genome.architecture.techStack
        .map((tech) => ARCH_PERFORMANCE_SCORES[tech] ?? 70);
    if (stackScores.length > 0) {
        performanceScore += (stackScores.reduce((a, b) => a + b, 0) / stackScores.length - 70) * 0.5;
    }
    // Caching bonus
    performanceScore += (CACHING_SCORES[genome.architecture.cachingStrategy] - 70) * 0.3;
    // API style
    performanceScore += (API_STYLE_SCORES[genome.architecture.apiStyle] - 70) * 0.2;
    // CDN bonus
    if (genome.performance.cdn)
        performanceScore += 5;
    if (genome.performance.edgeComputing)
        performanceScore += 8;
    // DB indices penalty for missing indices
    if (genome.performance.dbIndices.length < 3) {
        performanceScore -= 10;
        warnings.push('Insufficient database indices may cause slow queries at scale');
        recommendations.push('Add indices for frequently queried columns (user_id, tenant_id, created_at)');
    }
    // Estimate page load time (ms)
    const estimatedPageLoadMs = Math.max(200, 2000 - performanceScore * 15);
    // --- User Satisfaction Score ---
    let userSatisfactionScore = 55;
    // Feature completeness contributes to satisfaction
    const enabledFeatures = genome.features.enabled.length;
    userSatisfactionScore += Math.min(20, enabledFeatures * 2);
    // Mobile optimization
    if (genome.ux.mobileOptimized) {
        userSatisfactionScore += 10;
    }
    else if (context.marketSegment === 'b2c') {
        userSatisfactionScore -= 15;
        warnings.push('Mobile optimization is critical for B2C applications');
        recommendations.push('Enable mobile-optimized UI for better user satisfaction');
    }
    // Trial days - longer trial = higher satisfaction/conversion
    if (genome.monetization.trialDays >= 14) {
        userSatisfactionScore += 8;
    }
    else if (genome.monetization.trialDays === 0) {
        userSatisfactionScore -= 5;
        recommendations.push('Consider offering a free trial to reduce conversion friction');
    }
    // Estimate NPS score (0-100)
    const estimatedNPS = Math.max(0, Math.min(100, userSatisfactionScore - 10 + Math.random() * 10));
    // --- Cost Efficiency Score ---
    let costEfficiencyScore = 70;
    // Message queue cost
    const queueCosts = {
        None: 0,
        Redis: 5,
        RabbitMQ: 15,
        SQS: 8,
        Kafka: 30,
    };
    const queueCost = queueCosts[genome.architecture.messageQueue] ?? 10;
    costEfficiencyScore -= queueCost * 0.3;
    // Microservices are expensive
    if (genome.architecture.databasePattern === 'Microservices') {
        costEfficiencyScore -= 15;
        if (context.budgetLevel < 0.5) {
            warnings.push('Microservices architecture may be too expensive for current budget');
            recommendations.push('Consider starting with a Monolith and extracting services later');
        }
    }
    else if (genome.architecture.databasePattern === 'ServerlessDB') {
        costEfficiencyScore += 10; // Serverless scales to zero
    }
    // Estimate monthly cost (USD)
    const baseCostUSD = 50;
    const scalingFactor = context.expectedMAU / 1000;
    const archMultiplier = genome.architecture.databasePattern === 'Microservices' ? 3 : 1;
    const estimatedMonthlyCostUSD = baseCostUSD * scalingFactor * archMultiplier + queueCost;
    // --- Feature Completeness Score ---
    const featureCoverage = Math.min(100, (enabledFeatures / 10) * 100);
    const featureCompletenessScore = 40 + featureCoverage * 0.6;
    if (enabledFeatures < 5) {
        recommendations.push('Enable more features to improve product completeness');
    }
    // --- Innovation Index ---
    let innovationIndex = 50;
    // Modern tech stack bonus
    if (genome.architecture.techStack.includes('Redis'))
        innovationIndex += 5;
    if (genome.architecture.apiStyle === 'GraphQL' || genome.architecture.apiStyle === 'gRPC') {
        innovationIndex += 10;
    }
    if (genome.performance.edgeComputing)
        innovationIndex += 15;
    if (genome.features.experiments.length > 0)
        innovationIndex += 10;
    // Hybrid pricing is innovative
    if (genome.monetization.pricingModel === 'Hybrid')
        innovationIndex += 8;
    // --- Conversion Rate ---
    const baseConversionRate = PRICING_CONVERSION_RATES[genome.monetization.pricingModel] ?? 0.05;
    const trialBonus = genome.monetization.trialDays > 0 ? 0.02 : 0;
    const estimatedConversionRate = Math.min(0.25, baseConversionRate + trialBonus);
    // Estimated churn rate (lower is better)
    const estimatedChurnRate = Math.max(0.01, 0.15 - userSatisfactionScore * 0.001);
    // --- Calculate Weighted Overall ---
    const clamp = (v) => Math.max(0, Math.min(100, v));
    const fitness = {
        performance: clamp(performanceScore),
        userSatisfaction: clamp(userSatisfactionScore),
        costEfficiency: clamp(costEfficiencyScore),
        featureCompleteness: clamp(featureCompletenessScore),
        innovationIndex: clamp(innovationIndex),
        overall: 0,
    };
    fitness.overall =
        fitness.performance * types_1.FitnessWeights.performance +
            fitness.userSatisfaction * types_1.FitnessWeights.userSatisfaction +
            fitness.costEfficiency * types_1.FitnessWeights.costEfficiency +
            fitness.featureCompleteness * types_1.FitnessWeights.featureCompleteness +
            fitness.innovationIndex * types_1.FitnessWeights.innovationIndex;
    return {
        fitness,
        metrics: {
            estimatedPageLoadMs,
            estimatedMonthlyCostUSD,
            estimatedConversionRate,
            estimatedChurnRate,
            estimatedNPS,
            featureCoverage,
        },
        warnings,
        recommendations,
    };
}
/**
 * Compare two genomes and return the better one
 */
function compareGenomes(a, b, context) {
    const resultA = simulateFitness(a, context);
    const resultB = simulateFitness(b, context);
    const winner = resultA.fitness.overall >= resultB.fitness.overall ? a : b;
    const loser = winner === a ? b : a;
    const improvement = Math.abs(resultA.fitness.overall - resultB.fitness.overall);
    return { winner, loser, improvement };
}
/**
 * Batch evaluate a population using simulation
 */
function evaluatePopulation(genomes, context) {
    return genomes
        .map((genome) => ({
        genome,
        result: simulateFitness(genome, context),
    }))
        .sort((a, b) => b.result.fitness.overall - a.result.fitness.overall);
}
//# sourceMappingURL=simulation-environment.js.map