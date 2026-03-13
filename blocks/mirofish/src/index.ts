/**
 * MiroFish Market Simulation Engine
 * 
 * Comprehensive market simulation platform featuring:
 * - 1000+ AI agent swarms for behavior prediction
 * - Market testing with 50k+ simulated users
 * - Trend and churn prediction analysis
 * - Behavioral pattern analysis
 */

export { MarketSimulationEngine } from "./simulation-engine";
export { AgentSwarmManager } from "./swarm";
export { BehaviorPredictionModel } from "./prediction-model";

// Types exports
export type {
  UserBehaviorProfile,
  AIAgentConfig,
  MarketSimulationState,
  BehaviorPrediction,
  CohortAnalysis,
  SimulationConfig,
  SimulationEvent,
  MarketTrend,
} from "./types";

export {
  UserBehaviorProfileSchema,
  AIAgentConfigSchema,
  MarketSimulationStateSchema,
  BehaviorPredictionSchema,
  CohortAnalysisSchema,
  SimulationConfigSchema,
  SimulationEventSchema,
  MarketTrendSchema,
} from "./types";
