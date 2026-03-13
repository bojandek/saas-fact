import pino from "pino";
import { nanoid } from "nanoid";
import {
  AIAgentConfig,
  AIAgentConfigSchema,
  SimulationEvent,
  BehaviorPrediction,
  UserBehaviorProfile,
} from "./types";

/**
 * AI Agent Swarm Manager - Orchestrates 1000+ agents for market simulation
 */
export class AgentSwarmManager {
  private agents: Map<string, AIAgentConfig> = new Map();
  private logger: pino.Logger;
  private agentResults: Map<string, unknown[]> = new Map();

  constructor(enableLogging: boolean = true, logLevel: string = "info") {
    this.logger = pino({
      level: logLevel,
      transport: enableLogging
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          }
        : undefined,
    });
  }

  /**
   * Initialize agent swarm with specified configuration
   */
  async initializeSwarm(
    totalAgents: number,
    specializations: string[] = []
  ): Promise<void> {
    this.logger.info(
      { totalAgents, specializations },
      "Initializing agent swarm"
    );

    const roles: Array<
      "predictor" | "simulator" | "analyzer" | "optimizer" | "validator"
    > = ["predictor", "simulator", "analyzer", "optimizer", "validator"];

    for (let i = 0; i < totalAgents; i++) {
      const role = roles[i % roles.length];
      const agentId = `agent-${nanoid(12)}`;

      const agentConfig: AIAgentConfig = {
        agentId,
        role,
        modelVersion: "claude-3.5-sonnet",
        temperatureParam: 0.7 + Math.random() * 0.3, // Slight variation
        confidenceThreshold: 0.7 + Math.random() * 0.25,
        specialization: this.assignSpecializations(
          role,
          specializations,
          3
        ),
        agentMemory: {
          predictions: [],
          experiences: 0,
          accuracy_history: [],
        },
        performanceMetrics: {
          accuracy: 0.8,
          precision: 0.85,
          recall: 0.75,
          f1Score: 0.8,
        },
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      // Validate agent config
      const validated = AIAgentConfigSchema.parse(agentConfig);
      this.agents.set(agentId, validated);
      this.agentResults.set(agentId, []);
    }

    this.logger.info(
      { agentCount: this.agents.size },
      "Agent swarm initialized"
    );
  }

  /**
   * Assign specializations to agents based on their role
   */
  private assignSpecializations(
    role: string,
    availableSpecializations: string[],
    count: number
  ): string[] {
    const roleSpecializations: Record<string, string[]> = {
      predictor: [
        "churn-prediction",
        "conversion-modeling",
        "ltv-estimation",
      ],
      simulator: ["user-behavior-simulation", "event-generation"],
      analyzer: [
        "cohort-analysis",
        "trend-detection",
        "anomaly-detection",
      ],
      optimizer: ["intervention-optimization", "pricing-optimization"],
      validator: [
        "prediction-validation",
        "data-quality-checks",
        "consistency-validation",
      ],
    };

    const specs = roleSpecializations[role] || [];
    return specs.slice(0, count);
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AIAgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AIAgentConfig[] {
    return Array.from(this.agents.values()).filter((agent) => agent.isActive);
  }

  /**
   * Predict user behavior using agent(s)
   */
  async predictUserBehavior(
    userProfile: UserBehaviorProfile,
    useEnsemble: boolean = true
  ): Promise<BehaviorPrediction> {
    const predictorAgents = this.getAgentsByRole("predictor");

    if (predictorAgents.length === 0) {
      throw new Error("No predictor agents available");
    }

    let selectedAgents = predictorAgents;
    if (!useEnsemble && predictorAgents.length > 0) {
      selectedAgents = [predictorAgents[0]];
    } else if (useEnsemble && predictorAgents.length > 3) {
      // Use 3 best agents for ensemble
      selectedAgents = predictorAgents.slice(0, 3);
    }

    const predictions = await Promise.all(
      selectedAgents.map((agent) =>
        this.generatePrediction(agent, userProfile)
      )
    );

    // Combine predictions using weighted average
    const combinedPrediction = this.combinePredictions(
      predictions,
      selectedAgents
    );

    this.logger.debug(
      { userId: userProfile.userId, agentCount: selectedAgents.length },
      "User behavior predicted"
    );

    return combinedPrediction;
  }

  /**
   * Generate prediction from a single agent
   */
  private async generatePrediction(
    agent: AIAgentConfig,
    userProfile: UserBehaviorProfile
  ): Promise<BehaviorPrediction> {
    // Simulate agent prediction based on user profile
    const churnProbability = this.calculateChurnProbability(userProfile);
    const purchaseProbability = this.calculatePurchaseProbability(userProfile);

    const prediction: BehaviorPrediction = {
      userId: userProfile.userId,
      predictionTimestamp: new Date(),
      predictions: {
        willChurnIn30Days: {
          probability: churnProbability,
          confidence: agent.confidenceThreshold,
          factors: this.extractChurnFactors(userProfile),
          recommendedActions: this.generateRetentionActions(churnProbability),
        },
        nextPurchaseIn: {
          daysUntilPurchase: Math.ceil(30 * (1 - purchaseProbability)) || 15,
          probability: purchaseProbability,
          expectedValue: userProfile.avgSessionDuration *
            purchaseProbability * (Math.random() * 200 + 50), // random LTV
          productPreferences: this.generateProductPreferences(),
        },
        featureAdoption: {
          likelyNextFeatures: this.predictFeatureAdoption(userProfile),
        },
      },
      modelVersion: agent.modelVersion,
      agentResponsible: agent.agentId,
    };

    // Update agent memory with prediction
    if (agent.agentMemory.predictions) {
      (agent.agentMemory.predictions as BehaviorPrediction[]).push(prediction);
    }

    return prediction;
  }

  /**
   * Calculate churn probability based on user profile
   */
  private calculateChurnProbability(userProfile: UserBehaviorProfile): number {
    let probability = userProfile.churnRisk;

    // Adjust based on engagement
    probability *= 1 - userProfile.engagementLevel * 0.5;

    // Adjust based on recent activity
    const daysSinceActive = Math.floor(
      (Date.now() - userProfile.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActive > 30) {
      probability += 0.3;
    }

    // Clamp to [0, 1]
    return Math.min(1, Math.max(0, probability));
  }

  /**
   * Calculate purchase probability
   */
  private calculatePurchaseProbability(
    userProfile: UserBehaviorProfile
  ): number {
    const baseProb = userProfile.purchasePropensity;
    const engagementBoost = userProfile.engagementLevel * 0.3;
    const frequencyBoost = Math.min(userProfile.loginFrequency / 10, 0.2);

    return Math.min(1, baseProb + engagementBoost + frequencyBoost);
  }

  /**
   * Extract churn factors from user profile
   */
  private extractChurnFactors(
    userProfile: UserBehaviorProfile
  ): Array<{
    factor: string;
    impact: number;
    weight: number;
  }> {
    const factors: Array<{ factor: string; impact: number; weight: number }> =
      [];

    // Low engagement
    if (userProfile.engagementLevel < 0.3) {
      factors.push({
        factor: "low-engagement",
        impact: -0.5,
        weight: 0.3,
      });
    }

    // Inactive
    const daysSinceActive = Math.floor(
      (Date.now() - userProfile.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActive > 30) {
      factors.push({
        factor: "long-inactivity",
        impact: -0.6,
        weight: 0.4,
      });
    }

    // Low session duration
    if (userProfile.avgSessionDuration < 5) {
      factors.push({
        factor: "short-sessions",
        impact: -0.3,
        weight: 0.2,
      });
    }

    // Existing risk factors
    factors.push(...userProfile.riskFactors);

    return factors;
  }

  /**
   * Generate retention actions
   */
  private generateRetentionActions(
    churnProbability: number
  ): Array<{
    action: string;
    effectiveness: number;
    cost: number;
  }> {
    const actions = [];

    if (churnProbability > 0.7) {
      actions.push(
        {
          action: "personalized-discount-offer",
          effectiveness: 0.6,
          cost: 50,
        },
        {
          action: "priority-support",
          effectiveness: 0.4,
          cost: 100,
        },
        {
          action: "feature-training-session",
          effectiveness: 0.5,
          cost: 75,
        }
      );
    } else if (churnProbability > 0.4) {
      actions.push(
        {
          action: "engagement-email",
          effectiveness: 0.3,
          cost: 5,
        },
        {
          action: "feature-discovery-nudge",
          effectiveness: 0.35,
          cost: 10,
        }
      );
    } else {
      actions.push({
        action: "regular-content-recommendation",
        effectiveness: 0.2,
        cost: 2,
      });
    }

    return actions;
  }

  /**
   * Generate product preferences
   */
  private generateProductPreferences(): Array<{
    productId: string;
    likelihood: number;
  }> {
    return [
      { productId: "product-premium", likelihood: 0.7 },
      { productId: "product-analytics", likelihood: 0.6 },
      { productId: "product-api", likelihood: 0.4 },
    ];
  }

  /**
   * Predict feature adoption
   */
  private predictFeatureAdoption(
    userProfile: UserBehaviorProfile
  ): Array<{
    featureId: string;
    adoptProbability: number;
    adoptionTimeline: string;
  }> {
    return [
      {
        featureId: "feature-advanced-reporting",
        adoptProbability: userProfile.engagementLevel * 0.8,
        adoptionTimeline: "1-2 weeks",
      },
      {
        featureId: "feature-integrations",
        adoptProbability: userProfile.engagementLevel * 0.6,
        adoptionTimeline: "2-4 weeks",
      },
      {
        featureId: "feature-automation",
        adoptProbability: userProfile.engagementLevel * 0.5,
        adoptionTimeline: "3-6 weeks",
      },
    ];
  }

  /**
   * Combine predictions from multiple agents
   */
  private combinePredictions(
    predictions: BehaviorPrediction[],
    agents: AIAgentConfig[]
  ): BehaviorPrediction {
    if (predictions.length === 0) {
      throw new Error("No predictions to combine");
    }

    if (predictions.length === 1) {
      return predictions[0];
    }

    // Weight predictions by agent performance
    const weights = agents.map((agent) => agent.performanceMetrics.f1Score);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Combine churn probabilities
    const combinedChurnProb = predictions.reduce((sum, pred, idx) => {
      return (
        sum +
        pred.predictions.willChurnIn30Days.probability * normalizedWeights[idx]
      );
    }, 0);

    // Combine confidence
    const combinedConfidence = predictions.reduce((sum, pred, idx) => {
      return (
        sum +
        pred.predictions.willChurnIn30Days.confidence * normalizedWeights[idx]
      );
    }, 0);

    // Use first prediction as template and update probabilities
    const combined = { ...predictions[0] };
    combined.predictions.willChurnIn30Days.probability = combinedChurnProb;
    combined.predictions.willChurnIn30Days.confidence = combinedConfidence;
    combined.agentResponsible = `ensemble-${agents
      .map((a) => a.agentId.slice(-6))
      .join("-")}`;

    return combined;
  }

  /**
   * Get agents by role
   */
  private getAgentsByRole(
    role: "predictor" | "simulator" | "analyzer" | "optimizer" | "validator"
  ): AIAgentConfig[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.role === role && agent.isActive
    );
  }

  /**
   * Get swarm statistics
   */
  getSwarmStats(): Record<string, unknown> {
    const activeAgents = this.getActiveAgents();
    const roles: Record<string, number> = {};

    activeAgents.forEach((agent) => {
      roles[agent.role] = (roles[agent.role] || 0) + 1;
    });

    const avgPerformance = {
      accuracy:
        activeAgents.reduce((sum, a) => sum + a.performanceMetrics.accuracy, 0) /
        activeAgents.length,
      precision:
        activeAgents.reduce((sum, a) => sum + a.performanceMetrics.precision, 0) /
        activeAgents.length,
      recall:
        activeAgents.reduce((sum, a) => sum + a.performanceMetrics.recall, 0) /
        activeAgents.length,
      f1Score:
        activeAgents.reduce((sum, a) => sum + a.performanceMetrics.f1Score, 0) /
        activeAgents.length,
    };

    return {
      totalAgents: this.agents.size,
      activeAgents: activeAgents.length,
      roles,
      averagePerformance: avgPerformance,
      resultsCached: this.agentResults.size,
    };
  }

  /**
   * Activate/deactivate agents
   */
  setAgentActive(agentId: string, active: boolean): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isActive = active;
      agent.lastUpdated = new Date();
      this.logger.debug(
        { agentId, active },
        "Agent activity status updated"
      );
    }
  }
}
