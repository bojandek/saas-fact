import pino from "pino";
import { nanoid } from "nanoid";
import {
  SimulationConfig,
  SimulationConfigSchema,
  MarketSimulationState,
  SimulationEvent,
  UserBehaviorProfile,
  BehaviorPrediction,
  MarketTrend,
  CohortAnalysis,
} from "./types";
import { AgentSwarmManager } from "./swarm";
import { BehaviorPredictionModel } from "./prediction-model";
import { generatePersonas, personaToAgentConfig, type Persona } from "./persona-generator";
import { TemporalMemoryStore, type RoundUpdate } from "./temporal-memory";
import { PostSimulationReportAgent, type SimulationReport, type SimulationSummary } from "./report-agent";

/**
 * Market Simulation Engine - Orchestrates entire simulation
 */
export class MarketSimulationEngine {
  private config: SimulationConfig;
  private state: MarketSimulationState;
  private swarmManager: AgentSwarmManager;
  private predictionModel: BehaviorPredictionModel;
  private logger: pino.Logger;
  private simulatedUsers: Map<string, UserBehaviorProfile> = new Map();
  private predictions: Map<string, BehaviorPrediction> = new Map();
  private events: SimulationEvent[] = [];
  private trends: MarketTrend[] = [];
  private cohortAnalyses: Map<string, CohortAnalysis> = new Map();
  // MiroFish enhancements
  private personas: Persona[] = [];
  private memoryStore: TemporalMemoryStore | null = null;
  private reportAgent: PostSimulationReportAgent | null = null;
  private simulationReport: SimulationReport | null = null;

  constructor(config: SimulationConfig) {
    // Validate config
    this.config = SimulationConfigSchema.parse(config);

    this.logger = pino({
      level: this.config.logLevel || "info",
      transport: this.config.enableLogging
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          }
        : undefined,
    });

    this.swarmManager = new AgentSwarmManager(
      this.config.enableLogging,
      this.config.logLevel
    );
    this.predictionModel = new BehaviorPredictionModel(this.logger);

    const simulationId = `sim-${nanoid(12)}`;
    this.state = {
      simulationId,
      startTime: new Date(),
      status: "pending",
      totalUsersSimulated: config.totalUsers,
      totalAgents: config.totalAgents,
      timeHorizonDays: config.timeHorizonDays,
      currentDay: 0,
      metrics: {
        totalChurnPredicted: 0,
        churnRate: 0,
        conversionRate: 0,
        avgEngagementScore: 0,
        predictedARR: 0,
        predictedMRR: 0,
        retentionCohorts: {},
      },
      riskProfile: {
        highRiskUsers: 0,
        mediumRiskUsers: 0,
        lowRiskUsers: 0,
        criticalAnomalies: [],
      },
      trendAnalysis: {
        emergingTrends: [],
        seasonalPatterns: [],
        marketMovements: [],
      },
      errors: [],
      warnings: [],
    };

    this.logger.info(
      { simulationId, config: this.config },
      "Simulation engine created"
    );
  }

  /**
   * Initialize and run the simulation
   */
  async run(): Promise<MarketSimulationState> {
    try {
      this.state.status = "running";
      this.logger.info(
        { totalUsers: this.config.totalUsers, days: this.config.timeHorizonDays },
        "Starting market simulation"
      );

      // Step 1: Initialize agent swarm
      await this.swarmManager.initializeSwarm(
        this.config.totalAgents,
        this.getSpecializations()
      );

      // Step 1b: Generate personas if saasDescription is provided
      if ((this.config as Record<string, unknown>).saasDescription) {
        await this.generatePersonasForSimulation();
      }

      // Step 1c: Initialize temporal memory store
      this.memoryStore = new TemporalMemoryStore(this.state.simulationId);

      // Step 2: Generate simulated users
      await this.generateSimulatedUsers();

      // Step 3: Run daily simulation
      for (let day = 0; day < this.config.timeHorizonDays; day++) {
        this.state.currentDay = day;
        await this.simulateDay(day);

        // Periodic checkpointing
        if ((day + 1) % 10 === 0) {
          this.logger.info(
            { day: day + 1, totalDays: this.config.timeHorizonDays },
            "Simulation checkpoint"
          );
        }
      }

      // Step 4: Analyze results
      await this.analyzeResults();

      // Step 5: Generate trends and insights
      await this.generateTrends();

      // Step 6: Generate post-simulation report
      if (this.memoryStore) {
        await this.generateSimulationReport();
      }

      this.state.status = "completed";
      this.state.endTime = new Date();

      this.logger.info(
        {
          simulationId: this.state.simulationId,
          duration: this.state.endTime.getTime() - this.state.startTime.getTime(),
          metrics: this.state.metrics,
        },
        "Simulation completed successfully"
      );

      // Persist results if configured
      if (this.config.persistResults) {
        await this.persistResults();
      }

      return this.state;
    } catch (error) {
      this.state.status = "failed";
      this.state.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      this.logger.error({ error, simulationId: this.state.simulationId }, "Simulation failed");
      throw error;
    }
  }

  /**
   * Generate personas from SaaS description (MiroFish Enhancement #1)
   */
  private async generatePersonasForSimulation(): Promise<void> {
    const config = this.config as Record<string, unknown>;
    const saasDescription = config.saasDescription as string;
    const personaCount = Math.min(this.config.totalUsers, 20); // Generate up to 20 rich personas

    this.logger.info({ saasDescription, personaCount }, 'Generating personas for simulation');

    try {
      const result = await generatePersonas({
        saasDescription,
        targetMarket: (config.targetMarket as string) ?? 'B2B SaaS users',
        pricePoint: (config.pricePoint as string) ?? 'mid-market ($50-200/month)',
        count: personaCount,
        distributionStrategy: 'realistic',
      });

      this.personas = result.personas;
      this.logger.info(
        { generated: this.personas.length, dominant: result.dominant_segment },
        'Personas generated'
      );
    } catch (err) {
      this.logger.warn({ err }, 'Persona generation failed, falling back to generic users');
    }
  }

  /**
   * Generate post-simulation report (MiroFish Enhancement #3)
   */
  private async generateSimulationReport(): Promise<void> {
    if (!this.memoryStore) return;

    this.reportAgent = new PostSimulationReportAgent();
    const metrics = this.memoryStore.getAggregatedMetrics();
    const config = this.config as Record<string, unknown>;

    const summary: SimulationSummary = {
      simulation_id: this.state.simulationId,
      saas_description: (config.saasDescription as string) ?? 'SaaS Product',
      total_agents: this.config.totalAgents,
      simulation_rounds: Math.ceil(this.config.timeHorizonDays / 7), // weekly rounds
      time_horizon_days: this.config.timeHorizonDays,
      final_metrics: {
        avg_engagement: metrics.avg_engagement || this.state.metrics.avgEngagementScore,
        avg_churn_risk: metrics.avg_churn_risk || this.state.metrics.churnRate,
        avg_satisfaction: metrics.avg_satisfaction || 0.65,
        total_ltv: metrics.total_ltv || this.state.metrics.predictedARR / 12,
        high_churn_count: metrics.high_churn_count || this.state.riskProfile.highRiskUsers,
        churned_count: metrics.churned_count || this.state.metrics.totalChurnPredicted,
        top_features: metrics.top_features,
      },
      personas: this.personas.length > 0 ? this.personas : undefined,
    };

    this.logger.info({ simulation_id: summary.simulation_id }, 'Generating post-simulation report');

    try {
      this.simulationReport = await this.reportAgent.generateReport(summary, this.memoryStore);
      this.logger.info(
        { report_id: this.simulationReport.report_id, confidence: this.simulationReport.confidence_score },
        'Post-simulation report generated'
      );
    } catch (err) {
      this.logger.warn({ err }, 'Report generation failed');
    }
  }

  /**
   * Generate simulated users based on config
   */
  private async generateSimulatedUsers(): Promise<void> {
    this.logger.info(
      { totalUsers: this.config.totalUsers },
      "Generating simulated users"
    );

    const seed = this.config.randomSeed || Date.now();
    const random = this.seededRandom(seed);

    for (let i = 0; i < this.config.totalUsers; i++) {
      const userId = `sim-user-${i}`;
      const now = new Date();

      const user: UserBehaviorProfile = {
        userId,
        engagementLevel: random(),
        churnRisk: random() * 0.4, // 0-40% baseline
        purchasePropensity: random() * 0.7,
        featureUsagePattern: {
          dashboard: random() * 100,
          reports: random() * 80,
          api: random() * 50,
          integrations: random() * 30,
        },
        avgSessionDuration: random() * 60 + 5, // 5-65 minutes
        loginFrequency: random() * 5 + 0.5, // 0.5-5.5 logins per day
        conversionHistory: this.generateConversionHistory(random, 5),
        lastActive: new Date(now.getTime() - random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        cohortId: `cohort-${Math.floor(random() * 10)}`,
        segmentTags: this.generateSegmentTags(random),
        riskFactors: this.generateRiskFactors(random),
      };

      this.simulatedUsers.set(userId, user);
    }

    this.logger.debug(
      { totalUsers: this.simulatedUsers.size },
      "Simulated users generated"
    );
  }

  /**
   * Generate conversion history for user
   */
  private generateConversionHistory(
    random: () => number,
    maxConversions: number
  ): Array<{ timestamp: Date; amount: number }> {
    const conversions = [];
    const numConversions = Math.floor(random() * maxConversions);

    for (let i = 0; i < numConversions; i++) {
      conversions.push({
        timestamp: new Date(
          Date.now() - random() * 90 * 24 * 60 * 60 * 1000
        ), // Last 90 days
        amount: random() * 500 + 50, // $50-550
      });
    }

    return conversions;
  }

  /**
   * Generate segment tags
   */
  private generateSegmentTags(random: () => number): string[] {
    const allTags = [
      "early-adopter",
      "power-user",
      "casual-user",
      "enterprise",
      "SMB",
      "startup",
      "high-value",
      "at-risk",
    ];
    const tags = [];

    for (const tag of allTags) {
      if (random() > 0.7) {
        tags.push(tag);
      }
    }

    return tags.length > 0 ? tags : ["casual-user"];
  }

  /**
   * Generate risk factors
   */
  private generateRiskFactors(
    random: () => number
  ): Array<{
    factor: string;
    weight: number;
  }> {
    const factors = [];

    if (random() > 0.8) {
      factors.push({ factor: "low-usage", weight: 0.3 });
    }
    if (random() > 0.85) {
      factors.push({ factor: "support-tickets", weight: 0.2 });
    }
    if (random() > 0.9) {
      factors.push({ factor: "negative-feedback", weight: 0.25 });
    }

    return factors;
  }

  /**
   * Simulate a single day
   */
  private async simulateDay(day: number): Promise<void> {
    // Sample users for daily simulation
    const sampleSize = Math.min(1000, this.simulatedUsers.size);
    const usersToday = this.sampleUsers(sampleSize);

    // Generate predictions for users
    const predictions: BehaviorPrediction[] = [];
    for (const user of usersToday) {
      try {
        const prediction = await this.swarmManager.predictUserBehavior(user);
        predictions.push(prediction);
        this.predictions.set(user.userId, prediction);
      } catch (error) {
        this.logger.warn(
          { userId: user.userId, error },
          "Failed to predict user behavior"
        );
      }
    }

    // Generate events based on predictions
    await this.generateEventsFromPredictions(predictions, day);

    // Update user profiles based on simulated events
    this.updateUserProfiles(day);

    // Analyze cohorts periodically
    if (day % 5 === 0) {
      await this.analyzeCohorts();
    }
  }

  /**
   * Generate events from predictions
   */
  private async generateEventsFromPredictions(
    predictions: BehaviorPrediction[],
    day: number
  ): Promise<void> {
    const rand = Math.random;

    for (const prediction of predictions) {
      const churnProb = prediction.predictions.willChurnIn30Days.probability;
      const purchaseProb = prediction.predictions.nextPurchaseIn.probability;

      // Churn event
      if (rand() < churnProb * 0.01) {
        // Daily probability based on 30-day churn
        this.createEvent(prediction.userId, "churn", { reason: "predicted-churn" }, prediction.agentResponsible);
      }

      // Purchase event
      if (rand() < purchaseProb * 0.05) {
        this.createEvent(
          prediction.userId,
          "purchase",
          { amount: rand() * 200 + 50 },
          prediction.agentResponsible
        );
      }

      // Feature adoption
      if (rand() < 0.15) {
        const features = prediction.predictions.featureAdoption.likelyNextFeatures;
        if (features.length > 0) {
          const feature = features[Math.floor(rand() * features.length)];
          this.createEvent(
            prediction.userId,
            "feature_adoption",
            { featureId: feature.featureId },
            prediction.agentResponsible
          );
        }
      }

      // General engagement
      if (rand() < 0.7) {
        this.createEvent(
          prediction.userId,
          "user_engagement",
          { duration: rand() * 60 + 5 },
          prediction.agentResponsible
        );
      }
    }
  }

  /**
   * Create an event
   */
  private createEvent(
    userId: string,
    type: SimulationEvent["type"],
    data: Record<string, unknown>,
    agentId: string
  ): void {
    const event: SimulationEvent = {
      eventId: nanoid(12),
      simulationId: this.state.simulationId,
      timestamp: new Date(),
      type,
      userId,
      data,
      agentId,
      confidence: 0.85 + Math.random() * 0.15,
    };

    this.events.push(event);
  }

  /**
   * Update user profiles based on simulated events
   */
  private updateUserProfiles(day: number): void {
    // Update engagement and churn metrics
    for (const event of this.events.slice(-1000)) {
      // Last 1000 events
      const user = this.simulatedUsers.get(event.userId);
      if (user) {
        switch (event.type) {
          case "user_engagement":
            user.engagementLevel = Math.min(
              1,
              user.engagementLevel + 0.05
            );
            break;
          case "purchase":
            user.conversionHistory.push({
              timestamp: new Date(),
              amount: (event.data.amount as number) || 100,
            });
            user.churnRisk = Math.max(
              0,
              user.churnRisk - 0.1
            ); // Purchase reduces churn
            break;
          case "churn":
            user.churnRisk = 1;
            break;
        }
      }
    }
  }

  /**
   * Analyze cohorts
   */
  private async analyzeCohorts(): Promise<void> {
    const cohortMap: Map<string, UserBehaviorProfile[]> = new Map();

    // Group users by cohort
    for (const user of this.simulatedUsers.values()) {
      if (!cohortMap.has(user.cohortId)) {
        cohortMap.set(user.cohortId, []);
      }
      cohortMap.get(user.cohortId)!.push(user);
    }

    // Analyze each cohort
    for (const [cohortId, users] of cohortMap.entries()) {
      const analysis: CohortAnalysis = {
        cohortId,
        cohortName: `Cohort ${cohortId}`,
        userCount: users.length,
        creationDate: new Date(),
        characteristics: {
          avgEngagement: users.reduce((sum, u) => sum + u.engagementLevel, 0) / users.length,
          avgChurnRisk:
            users.reduce((sum, u) => sum + u.churnRisk, 0) / users.length,
        },
        metrics: {
          retention: [0.95, 0.92, 0.88, 0.84, 0.79], // 5-week retention curve
          churnRate:
            users.filter((u) => u.churnRisk > 0.7).length / users.length,
          ltv:
            users.reduce(
              (sum, u) =>
                sum +
                u.conversionHistory.reduce((s, c) => s + c.amount, 0),
              0
            ) / users.length,
          cac: 30, // Cost to acquire
          engagementScore:
            users.reduce((sum, u) => sum + u.engagementLevel, 0) / users.length,
        },
        trends: [],
      };

      this.cohortAnalyses.set(cohortId, analysis);
    }
  }

  /**
   * Analyze final results
   */
  private async analyzeResults(): Promise<void> {
    const predictionArray = Array.from(this.predictions.values());
    const userArray = Array.from(this.simulatedUsers.values());

    // Calculate metrics
    const churned = predictionArray.filter(
      (p) => p.predictions.willChurnIn30Days.probability > 0.5
    ).length;
    const purchased = this.events.filter((e) => e.type === "purchase").length;

    this.state.metrics.totalChurnPredicted = churned;
    this.state.metrics.churnRate = churned / this.config.totalUsers;
    this.state.metrics.conversionRate = purchased / this.config.totalUsers;
    this.state.metrics.avgEngagementScore =
      userArray.reduce((sum, u) => sum + u.engagementLevel, 0) /
      userArray.length;

    // Calculate financial metrics
    const totalRevenue = this.events
      .filter((e) => e.type === "purchase")
      .reduce((sum, e) => sum + ((e.data.amount as number) || 0), 0);

    this.state.metrics.predictedMRR = totalRevenue / 30; // Simplified
    this.state.metrics.predictedARR = this.state.metrics.predictedMRR * 12;

    // Classify risk
    for (const user of userArray) {
      if (user.churnRisk > 0.7) {
        this.state.riskProfile.highRiskUsers++;
      } else if (user.churnRisk > 0.4) {
        this.state.riskProfile.mediumRiskUsers++;
      } else {
        this.state.riskProfile.lowRiskUsers++;
      }
    }

    this.logger.info(
      { metrics: this.state.metrics, riskProfile: this.state.riskProfile },
      "Analysis completed"
    );
  }

  /**
   * Generate market trends
   */
  private async generateTrends(): Promise<void> {
    // Detect emerging trends from events
    const typeCount: Record<string, number> = {};

    for (const event of this.events) {
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;
    }

    // High engagement indicates trend
    if (typeCount["user_engagement"] / this.events.length > 0.6) {
      this.trends.push({
        trendId: nanoid(12),
        name: "High Engagement Period",
        category: "engagement",
        confidence: 0.85,
        affectedUsersPercent: 65,
        timeToMaturity: "1-2 weeks",
        businessImpact: {
          revenueImpact: 0.15,
          churnImpact: -0.2,
          engagementImpact: 0.3,
        },
        recommendations: [
          "Capitalize on high engagement with new feature releases",
          "Launch premium tier conversion campaigns",
        ],
        detectedAt: new Date(),
      });
    }

    // Feature adoption trend
    if (typeCount["feature_adoption"] > this.events.length * 0.1) {
      this.trends.push({
        trendId: nanoid(12),
        name: "Feature Discovery Wave",
        category: "features",
        confidence: 0.75,
        affectedUsersPercent: 45,
        timeToMaturity: "2-3 weeks",
        businessImpact: {
          revenueImpact: 0.1,
          churnImpact: -0.15,
          engagementImpact: 0.2,
        },
        recommendations: [
          "Accelerate advanced feature tutorials",
          "Monitor successful adoption patterns",
        ],
        detectedAt: new Date(),
      });
    }

    this.state.trendAnalysis.emergingTrends = this.trends;
  }

  /**
   * Sample users randomly
   */
  private sampleUsers(size: number): UserBehaviorProfile[] {
    const users = Array.from(this.simulatedUsers.values());
    const sampled = [];

    for (let i = 0; i < size; i++) {
      const idx = Math.floor(Math.random() * users.length);
      sampled.push(users[idx]);
    }

    return sampled;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Get specializations
   */
  private getSpecializations(): string[] {
    return [
      "churn-prediction",
      "conversion-modeling",
      "ltv-estimation",
      "cohort-analysis",
      "trend-detection",
      "anomaly-detection",
    ];
  }

  /**
   * Persist results to file
   */
  private async persistResults(): Promise<void> {
    try {
      const resultsPath = this.config.resultsPath || "./simulation-results.json";
      const fs = await import("fs/promises");

      const results = {
        simulationId: this.state.simulationId,
        config: this.config,
        state: this.state,
        eventCount: this.events.length,
        trendCount: this.trends.length,
        cohortCount: this.cohortAnalyses.size,
      };

      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
      this.logger.info({ path: resultsPath }, "Results persisted");
    } catch (error) {
      this.logger.error({ error }, "Failed to persist results");
    }
  }

  /**
   * Get generated personas (MiroFish Enhancement #1)
   */
  getPersonas(): Persona[] {
    return this.personas;
  }

  /**
   * Get temporal memory store (MiroFish Enhancement #2)
   */
  getMemoryStore(): TemporalMemoryStore | null {
    return this.memoryStore;
  }

  /**
   * Get post-simulation report (MiroFish Enhancement #3)
   */
  getReport(): SimulationReport | null {
    return this.simulationReport;
  }

  /**
   * Get report as Markdown string
   */
  getReportMarkdown(): string | null {
    if (!this.simulationReport || !this.reportAgent) return null;
    return this.reportAgent.formatAsMarkdown(this.simulationReport);
  }

  /**
   * Get current state
   */
  getState(): MarketSimulationState {
    return this.state;
  }

  /**
   * Get swarm statistics
   */
  getSwarmStats(): Record<string, unknown> {
    return this.swarmManager.getSwarmStats();
  }

  /**
   * Get all predictions
   */
  getPredictions(): BehaviorPrediction[] {
    return Array.from(this.predictions.values());
  }

  /**
   * Get all events
   */
  getEvents(): SimulationEvent[] {
    return this.events;
  }
}
