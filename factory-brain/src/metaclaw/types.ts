/**
 * MetaClaw - Evolutionary Engine dla SaaS Factory
 * Genetic algorithm za automatsku optimizaciju 150+ SaaS aplikacija
 */

// ===== GENOME (Genetski materijal) =====
export interface SaaSGenome {
  id: string;
  appName: string;
  version: number;
  
  // Architecture genome
  architecture: {
    techStack: string[]; // ['Next.js', 'PostgreSQL', 'Redis', ...]
    apiStyle: 'REST' | 'GraphQL' | 'gRPC' | 'Mixed';
    databasePattern: 'Monolith' | 'Microservices' | 'ServerlessDB';
    cachingStrategy: 'Redis' | 'CDN' | 'Browser' | 'Multi-layer';
    messageQueue: 'Kafka' | 'RabbitMQ' | 'Redis' | 'SQS' | 'None';
  };

  // Feature genome
  features: {
    enabled: string[];
    versions: Record<string, string>;
    experiments: ExperimentConfig[];
  };

  // Performance config
  performance: {
    cachePolicy: CachePolicy;
    rateLimits: RateLimitConfig[];
    dbIndices: string[];
    asyncJobs: AsyncJobConfig[];
    cdn: boolean;
    edgeComputing: boolean;
  };

  // Monetization genome
  monetization: {
    pricingModel: 'Freemium' | 'Subscription' | 'PayAsYouGo' | 'Hybrid';
    tierConfig: PricingTier[];
    paymentGateway: string;
    trialDays: number;
  };

  // UX genome
  ux: {
    components: UIComponentLibrary;
    workflows: UserWorkflow[];
    designSystem: DesignSystemConfig;
    mobileOptimized: boolean;
  };

  // Fitness score
  fitness: FitnessScore;
  createdAt: Date;
  generation: number;
}

// ===== FITNESS EVALUATION =====
export interface FitnessScore {
  performance: number; // 0-100
  userSatisfaction: number; // 0-100
  costEfficiency: number; // 0-100
  featureCompleteness: number; // 0-100
  innovationIndex: number; // 0-100
  overall: number; // weighted average
}

export const FitnessWeights = {
  performance: 0.3,
  userSatisfaction: 0.25,
  costEfficiency: 0.2,
  featureCompleteness: 0.15,
  innovationIndex: 0.1,
};

// ===== GENETIC OPERATORS =====
export interface GeneticOperatorResult {
  parent1: SaaSGenome;
  parent2?: SaaSGenome;
  offspring: SaaSGenome;
  operator: 'Crossover' | 'Mutation' | 'Selection';
  improvementFactor: number; // 1.0 = no change, 1.15 = +15% improvement
}

// ===== PERFORMANCE CONFIG =====
export interface CachePolicy {
  ttl: number; // seconds
  strategy: 'LRU' | 'LFU' | 'TTL';
  distributed: boolean;
  compressionLevel: number;
}

export interface RateLimitConfig {
  resource: string;
  maxRequests: number;
  windowSeconds: number;
  burstSize?: number;
}

export interface AsyncJobConfig {
  trigger: string;
  maxRetries: number;
  timeoutMs: number;
  parallelism: number;
}

// ===== MONETIZATION =====
export interface PricingTier {
  name: string;
  priceUSD: number;
  features: string[];
  quotas: Record<string, number>;
  supportLevel: 'Community' | 'Email' | 'Priority' | '24/7';
}

// ===== UX GENOME =====
export interface UIComponentLibrary {
  designSystem: string;
  componentCount: number;
  customComponents: string[];
  animationLevel: 'None' | 'Subtle' | 'Rich';
}

export interface UserWorkflow {
  name: string;
  steps: WorkflowStep[];
  avgTimeSeconds: number;
  conversionRate: number;
}

export interface WorkflowStep {
  action: string;
  uiComponent: string;
  expectedTime: number;
}

export interface DesignSystemConfig {
  theme: 'Light' | 'Dark' | 'Auto';
  colorScheme: string;
  typography: TypographyConfig;
  spacing: SpacingConfig;
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  baseFontSize: number;
}

export interface SpacingConfig {
  scale: number[];
  baseline: number;
}

// ===== EXPERIMENT CONFIG =====
export interface ExperimentConfig {
  id: string;
  name: string;
  trafficPercentage: number;
  variants: ExperimentVariant[];
  metric: string;
  minDuration: number;
  status: 'Active' | 'Completed' | 'Paused';
}

export interface ExperimentVariant {
  id: string;
  name: string;
  changes: Record<string, unknown>;
  conversionRate?: number;
}

// ===== POPULATION =====
export interface EvolutionPopulation {
  generation: number;
  genomes: SaaSGenome[];
  elite: SaaSGenome[]; // top 20%
  averageFitness: number;
  bestFitness: number;
  diversity: number;
}

// ===== EVOLUTION CYCLE =====
export interface EvolutionCycleReport {
  generation: number;
  timestamp: Date;
  populationStats: PopulationStats;
  mutations: MutationEvent[];
  crossovers: CrossoverEvent[];
  improvements: ImprovementSuggestion[];
  nextActions: string[];
}

export interface PopulationStats {
  totalGenomes: number;
  averageFitness: number;
  bestFitness: number;
  worstFitness: number;
  diversity: number;
  improvementRate: number; // percent change from prev generation
}

export interface MutationEvent {
  appId: string;
  appName: string;
  mutationType: string;
  parameter: string;
  oldValue: unknown;
  newValue: unknown;
  expectedImprovement: number;
}

export interface CrossoverEvent {
  parent1Id: string;
  parent2Id: string;
  offspringId: string;
  inheritedTraits: string[];
  expectedSynergy: number;
}

export interface ImprovementSuggestion {
  appId: string;
  appName: string;
  suggestion: string;
  expectedImprovement: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  actionItems: string[];
}
