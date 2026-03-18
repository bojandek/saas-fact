/**
 * MetaClaw Engine - Genetic Algorithm za SaaS Optimizaciju
 * Autos crossover, mutation, i selection operacije za 150+ aplikacija
 */
import { SaaSGenome, EvolutionPopulation, EvolutionCycleReport } from './types';
import { SimulationContext } from './simulation-environment';
export declare class MetaClawEngine {
    private population;
    private generation;
    private mutationRate;
    private eliteSize;
    private simulationContext;
    constructor(initialPopulation: SaaSGenome[], simulationContext?: SimulationContext);
    /**
     * Izvršava kompletan evolution cycle (24h)
     */
    evolve(): Promise<EvolutionCycleReport>;
    /**
     * Mutation - nasumična promena gena
     */
    private mutate;
    /**
     * Crossover - kombinovanje dva roditelja
     */
    private crossover;
    /**
     * Selection - izaberi best candidates za sledeću generaciju
     */
    private selectRandomElite;
    /**
     * Perform mutations na populaciji
     */
    private performMutations;
    /**
     * Perform crossovers na populaciji
     */
    private performCrossovers;
    /**
     * Evaluacija fitness za sve genome koristeći deterministički SimulationEnvironment.
     * Zamjenjuje prethodni random placeholder sa realnim modelom koji uzima u obzir
     * arhitekturu, feature set, monetizaciju i UX konfiguraciju svakog genoma.
     */
    private evaluatePopulation;
    /**
     * Generate improvement suggestions
     */
    private generateImprovementSuggestions;
    /**
     * Generate next actions
     */
    private generateNextActions;
    /**
     * Calculate average fitness
     */
    private calculateAverageFitness;
    /**
     * Calculate population diversity
     */
    private calculateDiversity;
    private selectRandomCachingStrategy;
    private selectRandomApiStyle;
    private selectRandomPricingModel;
    private optimizeIndices;
    /**
     * Public API - Get current population
     */
    getPopulation(): EvolutionPopulation;
    /**
     * Public API - Get elite genomes
     */
    getElite(): SaaSGenome[];
    /**
     * Public API - Get best genome
     */
    getBest(): SaaSGenome;
}
//# sourceMappingURL=metaclaw-engine.d.ts.map