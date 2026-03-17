/**
 * MiroFish Market Simulation Engine
 *
 * Comprehensive market simulation platform featuring:
 * - 1000+ AI agent swarms for behavior prediction
 * - Market testing with 50k+ simulated users
 * - Trend and churn prediction analysis
 * - Behavioral pattern analysis
 *
 * MiroFish Enhancements (inspired by github.com/666ghj/MiroFish):
 * - Persona Generation: auto-generate rich user personas from SaaS description
 * - Temporal Memory: per-agent memory that evolves across simulation rounds
 * - Post-Simulation Report Agent: comprehensive analysis with recommendations
 */

// Core engine
export { MarketSimulationEngine } from "./simulation-engine";
export { AgentSwarmManager } from "./swarm";
export { BehaviorPredictionModel } from "./prediction-model";

// MiroFish Enhancement #1 — Persona Generation
export { generatePersonas, personaToAgentConfig } from "./persona-generator";
export type {
  Persona,
  PersonaGenerationConfig,
  PersonaGenerationResult,
} from "./persona-generator";

// MiroFish Enhancement #2 — Temporal Memory
export { TemporalMemoryStore } from "./temporal-memory";
export type {
  AgentMemoryState,
  MemoryEvent,
  MemorySnapshot,
  RoundUpdate,
} from "./temporal-memory";

// MiroFish Enhancement #3 — Post-Simulation Report Agent
export { PostSimulationReportAgent } from "./report-agent";
export type {
  SimulationReport,
  SimulationSummary,
  ReportSection,
} from "./report-agent";

// Core types
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
