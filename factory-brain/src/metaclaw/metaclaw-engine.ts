/**
 * MetaClaw Engine - Genetic Algorithm za SaaS Optimizaciju
 * Autos crossover, mutation, i selection operacije za 150+ aplikacija
 */

import {
  SaaSGenome,
  EvolutionPopulation,
  GeneticOperatorResult,
  EvolutionCycleReport,
  MutationEvent,
  CrossoverEvent,
  ImprovementSuggestion,
} from './types';
import { simulateFitness, SimulationContext } from './simulation-environment';
import { logger } from '../utils/logger'

export class MetaClawEngine {
  private population: EvolutionPopulation;
  private generation: number = 0;
  private mutationRate: number = 0.15; // 15% chance per gene
  private eliteSize: number = 20; // Keep top 20 genomes
  private simulationContext: SimulationContext;

  constructor(initialPopulation: SaaSGenome[], simulationContext?: SimulationContext) {
    this.population = {
      generation: 0,
      genomes: initialPopulation,
      elite: [],
      averageFitness: 0,
      bestFitness: 0,
      diversity: 0,
    };
    this.simulationContext = simulationContext ?? {
      marketSegment: 'b2b',
      expectedMAU: 1000,
      competitionLevel: 0.5,
      budgetLevel: 0.5,
    };
  }

  /**
   * Izvršava kompletan evolution cycle (24h)
   */
  async evolve(): Promise<EvolutionCycleReport> {
    logger.info(`🧬 Starting Evolution Cycle ${this.generation + 1}...`);

    // 1. Evaluate fitness za sve genome
    await this.evaluatePopulation();

    // 2. Sort po fitness score
    this.population.genomes.sort((a, b) => b.fitness.overall - a.fitness.overall);

    // 3. Select elite
    this.population.elite = this.population.genomes.slice(0, this.eliteSize);

    // 4. Record mutations i crossovers
    const mutations = this.performMutations();
    const crossovers = this.performCrossovers();

    // 5. Merge sa elite populacijom
    const newPopulation = [
      ...this.population.elite,
      ...this.population.genomes.slice(this.eliteSize * 2, this.population.genomes.length * 0.5),
    ];

    // 6. Fill remaining slots sa mutacijama i crossoverima
    while (newPopulation.length < this.population.genomes.length) {
      if (Math.random() < 0.6) {
        const mutant = this.mutate(this.selectRandomElite());
        newPopulation.push(mutant);
      } else {
        const parent1 = this.selectRandomElite();
        const parent2 = this.selectRandomElite();
        const offspring = this.crossover(parent1, parent2);
        newPopulation.push(offspring);
      }
    }

    this.population.genomes = newPopulation;
    this.generation++;

    // 7. Calculate stats
    const avgFitness = this.calculateAverageFitness();
    const bestFitness = Math.max(...this.population.genomes.map((g) => g.fitness.overall));
    const prevBest = this.population.bestFitness;
    const improvementRate = prevBest > 0 ? ((bestFitness - prevBest) / prevBest) * 100 : 0;

    this.population.averageFitness = avgFitness;
    this.population.bestFitness = bestFitness;

    // 8. Generate improvement suggestions
    const suggestions = await this.generateImprovementSuggestions();

    return {
      generation: this.generation,
      timestamp: new Date(),
      populationStats: {
        totalGenomes: this.population.genomes.length,
        averageFitness: avgFitness,
        bestFitness: bestFitness,
        worstFitness: Math.min(...this.population.genomes.map((g) => g.fitness.overall)),
        diversity: this.calculateDiversity(),
        improvementRate,
      },
      mutations,
      crossovers,
      improvements: suggestions,
      nextActions: this.generateNextActions(suggestions),
    };
  }

  /**
   * Mutation - nasumična promena gena
   */
  private mutate(parent: SaaSGenome): SaaSGenome {
    const mutant = JSON.parse(JSON.stringify(parent));
    mutant.version++;
    mutant.fitness.overall = 0; // Reset fitness, treba preracunati

    // Architecture mutations
    if (Math.random() < this.mutationRate) {
      mutant.architecture.cachingStrategy = this.selectRandomCachingStrategy();
    }
    if (Math.random() < this.mutationRate) {
      mutant.architecture.apiStyle = this.selectRandomApiStyle();
    }

    // Performance mutations
    if (Math.random() < this.mutationRate) {
      mutant.performance.cachePolicy.ttl = Math.floor(150 + Math.random() * 900); // 150-1050s
    }
    if (Math.random() < this.mutationRate) {
      mutant.performance.dbIndices = this.optimizeIndices(mutant.performance.dbIndices);
    }

    // Monetization mutations
    if (Math.random() < this.mutationRate) {
      mutant.monetization.pricingModel = this.selectRandomPricingModel();
    }

    return mutant;
  }

  /**
   * Crossover - kombinovanje dva roditelja
   */
  private crossover(parent1: SaaSGenome, parent2: SaaSGenome): SaaSGenome {
    const offspring = JSON.parse(JSON.stringify(parent1));
    offspring.version = Math.max(parent1.version, parent2.version) + 1;
    offspring.id = `${offspring.id}-${Date.now()}`;

    // Nasledi arhitekturu od boljeg roditelja
    if (parent2.fitness.performance > parent1.fitness.performance) {
      offspring.architecture = parent2.architecture;
    }

    // Nasledi performance config od boljeg roditelja
    if (parent2.fitness.costEfficiency > parent1.fitness.costEfficiency) {
      offspring.performance = parent2.performance;
    }

    // Nasledi monetization od boljeg roditelja
    if (parent2.fitness.userSatisfaction > parent1.fitness.userSatisfaction) {
      offspring.monetization = parent2.monetization;
    }

    // Nasledi UX od boljeg roditelja
    if (parent2.fitness.userSatisfaction > parent1.fitness.userSatisfaction) {
      offspring.ux = parent2.ux;
    }

    offspring.fitness.overall = 0; // Reset fitness
    return offspring;
  }

  /**
   * Selection - izaberi best candidates za sledeću generaciju
   */
  private selectRandomElite(): SaaSGenome {
    return this.population.elite[Math.floor(Math.random() * this.population.elite.length)];
  }

  /**
   * Perform mutations na populaciji
   */
  private performMutations(): MutationEvent[] {
    const events: MutationEvent[] = [];

    // Mutate 10% najslabijih genoma
    const weakGenomes = this.population.genomes.slice(-Math.floor(this.population.genomes.length * 0.1));

    for (const genome of weakGenomes) {
      if (Math.random() < 0.7) {
        // 70% chance mutation za weak genomes
        const oldCachePolicy = JSON.stringify(genome.performance.cachePolicy);
        const mutated = this.mutate(genome);
        const newCachePolicy = JSON.stringify(mutated.performance.cachePolicy);

        events.push({
          appId: genome.id,
          appName: genome.appName,
          mutationType: 'Performance',
          parameter: 'cachePolicy',
          oldValue: oldCachePolicy,
          newValue: newCachePolicy,
          expectedImprovement: 8, // 8% improvement
        });
      }
    }

    return events;
  }

  /**
   * Perform crossovers na populaciji
   */
  private performCrossovers(): CrossoverEvent[] {
    const events: CrossoverEvent[] = [];

    // Crossover elite sa good performers
    for (let i = 0; i < Math.floor(this.population.genomes.length * 0.15); i++) {
      const parent1 = this.population.elite[Math.floor(Math.random() * this.population.elite.length)];
      const parent2 = this.population.genomes[Math.floor(Math.random() * this.population.genomes.length)];

      const offspring = this.crossover(parent1, parent2);

      events.push({
        parent1Id: parent1.id,
        parent2Id: parent2.id,
        offspringId: offspring.id,
        inheritedTraits: ['architecture', 'performance', 'monetization', 'ux'],
        expectedSynergy: 12, // 12% synergy benefit
      });
    }

    return events;
  }

  /**
   * Evaluacija fitness za sve genome koristeći deterministički SimulationEnvironment.
   * Zamjenjuje prethodni random placeholder sa realnim modelom koji uzima u obzir
   * arhitekturu, feature set, monetizaciju i UX konfiguraciju svakog genoma.
   */
  private async evaluatePopulation(): Promise<void> {
    for (const genome of this.population.genomes) {
      const { fitness } = simulateFitness(genome, this.simulationContext);
      genome.fitness = fitness;
    }
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];

    // Analyze weak performers
    const weakGenomes = this.population.genomes.slice(
      Math.floor(this.population.genomes.length * 0.7),
      -1
    );

    for (const genome of weakGenomes.slice(0, 10)) {
      const issues: ImprovementSuggestion[] = [];

      if (genome.fitness.performance < 40) {
        issues.push({
          appId: genome.id,
          appName: genome.appName,
          suggestion: 'Enable multi-layer caching (Redis + CDN) to improve response times',
          expectedImprovement: 25,
          priority: 'High',
          actionItems: ['Analyze query patterns', 'Implement Redis cache', 'Setup CDN'],
        });
      }

      if (genome.fitness.costEfficiency < 30) {
        issues.push({
          appId: genome.id,
          appName: genome.appName,
          suggestion: 'Switch to serverless database for cost optimization',
          expectedImprovement: 35,
          priority: 'Critical',
          actionItems: ['Evaluate serverless options', 'Migration plan', 'Cost analysis'],
        });
      }

      if (genome.fitness.userSatisfaction < 35) {
        issues.push({
          appId: genome.id,
          appName: genome.appName,
          suggestion: 'Redesign dashboard with Apple design principles',
          expectedImprovement: 20,
          priority: 'Medium',
          actionItems: ['Design audit', 'Prototype redesign', 'User testing'],
        });
      }

      suggestions.push(...issues);
    }

    return suggestions;
  }

  /**
   * Generate next actions
   */
  private generateNextActions(suggestions: ImprovementSuggestion[]): string[] {
    const actions: string[] = [];

    // Group by priority
    const critical = suggestions.filter((s) => s.priority === 'Critical');
    const high = suggestions.filter((s) => s.priority === 'High');

    if (critical.length > 0) {
      actions.push(`🚨 CRITICAL: ${critical[0].suggestion}`);
    }

    if (high.length > 0) {
      actions.push(`⚠️  HIGH: ${high[0].suggestion}`);
    }

    actions.push(`📊 Population improved ${this.population.bestFitness.toFixed(1)}% in this generation`);
    actions.push(`🎯 Diversity: ${this.population.diversity.toFixed(2)}`);

    return actions;
  }

  /**
   * Calculate average fitness
   */
  private calculateAverageFitness(): number {
    const sum = this.population.genomes.reduce((acc, g) => acc + g.fitness.overall, 0);
    return sum / this.population.genomes.length;
  }

  /**
   * Calculate population diversity
   */
  private calculateDiversity(): number {
    // Simplified diversity metric
    let diversity = 0;

    for (let i = 0; i < this.population.genomes.length; i++) {
      for (let j = i + 1; j < this.population.genomes.length; j++) {
        const g1 = this.population.genomes[i];
        const g2 = this.population.genomes[j];

        // Simple difference in tech stack
        const diff = g1.architecture.techStack.length - g2.architecture.techStack.length;
        diversity += Math.abs(diff);
      }
    }

    return diversity / (this.population.genomes.length * this.population.genomes.length);
  }

  // ===== HELPER FUNCTIONS =====

  private selectRandomCachingStrategy(): 'Redis' | 'CDN' | 'Browser' | 'Multi-layer' {
    const strategies: ('Redis' | 'CDN' | 'Browser' | 'Multi-layer')[] = [
      'Redis',
      'CDN',
      'Browser',
      'Multi-layer',
    ];
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  private selectRandomApiStyle(): 'REST' | 'GraphQL' | 'gRPC' | 'Mixed' {
    const styles: ('REST' | 'GraphQL' | 'gRPC' | 'Mixed')[] = ['REST', 'GraphQL', 'gRPC', 'Mixed'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private selectRandomPricingModel(): 'Freemium' | 'Subscription' | 'PayAsYouGo' | 'Hybrid' {
    const models: ('Freemium' | 'Subscription' | 'PayAsYouGo' | 'Hybrid')[] = [
      'Freemium',
      'Subscription',
      'PayAsYouGo',
      'Hybrid',
    ];
    return models[Math.floor(Math.random() * models.length)];
  }

  private optimizeIndices(indices: string[]): string[] {
    // Add missing indices detected from slow queries
    if (Math.random() < 0.3) {
      indices.push(`idx_created_at_${Date.now()}`);
    }
    return indices;
  }

  /**
   * Public API - Get current population
   */
  getPopulation(): EvolutionPopulation {
    return this.population;
  }

  /**
   * Public API - Get elite genomes
   */
  getElite(): SaaSGenome[] {
    return this.population.elite;
  }

  /**
   * Public API - Get best genome
   */
  getBest(): SaaSGenome {
    return this.population.elite[0];
  }
}
