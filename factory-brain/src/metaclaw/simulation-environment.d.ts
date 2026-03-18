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
import { SaaSGenome, FitnessScore } from './types';
export interface SimulationContext {
    /** Market segment: 'b2b' | 'b2c' | 'developer' */
    marketSegment: 'b2b' | 'b2c' | 'developer';
    /** Expected monthly active users */
    expectedMAU: number;
    /** Competition level: 0-1 */
    competitionLevel: number;
    /** Budget constraints: 0-1 (0=tight, 1=unlimited) */
    budgetLevel: number;
}
export interface SimulationResult {
    fitness: FitnessScore;
    metrics: {
        estimatedPageLoadMs: number;
        estimatedMonthlyCostUSD: number;
        estimatedConversionRate: number;
        estimatedChurnRate: number;
        estimatedNPS: number;
        featureCoverage: number;
    };
    warnings: string[];
    recommendations: string[];
}
/**
 * Evaluate a genome's fitness using deterministic simulation
 * instead of random values.
 */
export declare function simulateFitness(genome: SaaSGenome, context?: SimulationContext): SimulationResult;
/**
 * Compare two genomes and return the better one
 */
export declare function compareGenomes(a: SaaSGenome, b: SaaSGenome, context?: SimulationContext): {
    winner: SaaSGenome;
    loser: SaaSGenome;
    improvement: number;
};
/**
 * Batch evaluate a population using simulation
 */
export declare function evaluatePopulation(genomes: SaaSGenome[], context?: SimulationContext): Array<{
    genome: SaaSGenome;
    result: SimulationResult;
}>;
//# sourceMappingURL=simulation-environment.d.ts.map