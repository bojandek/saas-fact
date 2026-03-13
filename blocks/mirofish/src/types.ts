import { z } from "zod";

/**
 * User behavior profile for simulation
 */
export const UserBehaviorProfileSchema = z.object({
  userId: z.string(),
  engagementLevel: z.number().min(0).max(1), // 0-1 scale
  churnRisk: z.number().min(0).max(1), // Probability of churn
  purchasePropensity: z.number().min(0).max(1),
  featureUsagePattern: z.record(z.string(), z.number()), // feature -> usage frequency
  avgSessionDuration: z.number().positive(),
  loginFrequency: z.number().positive(), // logins per day
  conversionHistory: z.array(
    z.object({
      timestamp: z.date(),
      amount: z.number().positive(),
    })
  ),
  lastActive: z.date(),
  cohortId: z.string(), // Behavioral cohort identifier
  segmentTags: z.array(z.string()),
  riskFactors: z.array(
    z.object({
      factor: z.string(),
      weight: z.number(),
    })
  ),
});

export type UserBehaviorProfile = z.infer<typeof UserBehaviorProfileSchema>;

/**
 * AI Agent configuration in the swarm
 */
export const AIAgentConfigSchema = z.object({
  agentId: z.string(),
  role: z.enum([
    "predictor",
    "simulator",
    "analyzer",
    "optimizer",
    "validator",
  ]),
  modelVersion: z.string(),
  temperatureParam: z.number().min(0).max(2),
  confidenceThreshold: z.number().min(0).max(1),
  specialization: z.array(z.string()), // e.g., ["churn-prediction", "conversion-modeling"]
  agentMemory: z.record(z.any()),
  performanceMetrics: z.object({
    accuracy: z.number().min(0).max(1),
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1Score: z.number().min(0).max(1),
  }),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastUpdated: z.date(),
});

export type AIAgentConfig = z.infer<typeof AIAgentConfigSchema>;

/**
 * Market simulation state and results
 */
export const MarketSimulationStateSchema = z.object({
  simulationId: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  totalUsersSimulated: z.number().positive(),
  totalAgents: z.number().positive(),
  timeHorizonDays: z.number().positive(),
  currentDay: z.number().nonnegative(),
  metrics: z.object({
    totalChurnPredicted: z.number(),
    churnRate: z.number().min(0).max(1),
    conversionRate: z.number().min(0).max(1),
    avgEngagementScore: z.number().min(0).max(1),
    predictedARR: z.number().nonnegative(),
    predictedMRR: z.number().nonnegative(),
    retentionCohorts: z.record(z.number().min(0).max(1)),
  }),
  riskProfile: z.object({
    highRiskUsers: z.number(),
    mediumRiskUsers: z.number(),
    lowRiskUsers: z.number(),
    criticalAnomalies: z.array(z.string()),
  }),
  trendAnalysis: z.object({
    emergingTrends: z.array(
      z.object({
        trend: z.string(),
        confidence: z.number().min(0).max(1),
        affectedUsers: z.number(),
        timeline: z.string(),
      })
    ),
    seasonalPatterns: z.array(z.string()),
    marketMovements: z.array(
      z.object({
        movement: z.string(),
        direction: z.enum(["up", "down", "stable"]),
        magnitude: z.number(),
      })
    ),
  }),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type MarketSimulationState = z.infer<typeof MarketSimulationStateSchema>;

/**
 * Behavioral prediction model results
 */
export const BehaviorPredictionSchema = z.object({
  userId: z.string(),
  predictionTimestamp: z.date(),
  predictions: z.object({
    willChurnIn30Days: z.object({
      probability: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      factors: z.array(
        z.object({
          factor: z.string(),
          impact: z.number(), // positive or negative
          weight: z.number(),
        })
      ),
      recommendedActions: z.array(
        z.object({
          action: z.string(),
          effectiveness: z.number().min(0).max(1),
          cost: z.number().nonnegative(),
        })
      ),
    }),
    nextPurchaseIn: z.object({
      daysUntilPurchase: z.number().positive().optional(),
      probability: z.number().min(0).max(1),
      expectedValue: z.number().nonnegative(),
      productPreferences: z.array(
        z.object({
          productId: z.string(),
          likelihood: z.number().min(0).max(1),
        })
      ),
    }),
    featureAdoption: z.object({
      likelyNextFeatures: z.array(
        z.object({
          featureId: z.string(),
          adoptProbability: z.number().min(0).max(1),
          adoptionTimeline: z.string(),
        })
      ),
    }),
  }),
  modelVersion: z.string(),
  agentResponsible: z.string(),
});

export type BehaviorPrediction = z.infer<typeof BehaviorPredictionSchema>;

/**
 * Cohort analysis results
 */
export const CohortAnalysisSchema = z.object({
  cohortId: z.string(),
  cohortName: z.string(),
  userCount: z.number().positive(),
  creationDate: z.date(),
  characteristics: z.record(z.any()),
  metrics: z.object({
    retention: z.array(z.number()),
    churnRate: z.number().min(0).max(1),
    ltv: z.number().nonnegative(),
    cac: z.number().nonnegative(),
    paybackPeriod: z.number().positive().optional(),
    engagementScore: z.number().min(0).max(1),
  }),
  trends: z.array(
    z.object({
      week: z.number(),
      metric: z.string(),
      value: z.number(),
    })
  ),
});

export type CohortAnalysis = z.infer<typeof CohortAnalysisSchema>;

/**
 * Simulation configuration
 */
export const SimulationConfigSchema = z.object({
  simulationName: z.string(),
  description: z.string().optional(),
  totalUsers: z.number().min(1000).max(500000), // 50k default
  totalAgents: z.number().min(10).max(1000),
  timeHorizonDays: z.number().positive(),
  randomSeed: z.number().optional(),
  enableLogging: z.boolean().default(true),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  persistResults: z.boolean().default(true),
  resultsPath: z.string().optional(),
  agentBehaviorFile: z.string().optional(),
  marketConditions: z.object({
    economicShift: z.number().min(-1).max(1), // -1 recession, +1 boom
    competitionLevel: z.number().min(0).max(1),
    technologyAdoption: z.number().min(0).max(1),
  }).optional(),
});

export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;

/**
 * Event types in simulation
 */
export const SimulationEventSchema = z.object({
  eventId: z.string(),
  simulationId: z.string(),
  timestamp: z.date(),
  type: z.enum([
    "user_signup",
    "user_engagement",
    "purchase",
    "churn",
    "return",
    "feature_adoption",
    "support_ticket",
    "anomaly_detected",
  ]),
  userId: z.string(),
  data: z.record(z.any()),
  agentId: z.string(),
  confidence: z.number().min(0).max(1),
});

export type SimulationEvent = z.infer<typeof SimulationEventSchema>;

/**
 * Overall market trend
 */
export const MarketTrendSchema = z.object({
  trendId: z.string(),
  name: z.string(),
  category: z.enum([
    "engagement",
    "pricing",
    "features",
    "support",
    "market",
  ]),
  confidence: z.number().min(0).max(1),
  affectedUsersPercent: z.number().min(0).max(100),
  timeToMaturity: z.string(), // e.g., "2-4 weeks"
  businessImpact: z.object({
    revenueImpact: z.number(), // positive or negative percentage
    churnImpact: z.number().min(-1).max(1),
    engagementImpact: z.number().min(-1).max(1),
  }),
  recommendations: z.array(z.string()),
  detectedAt: z.date(),
});

export type MarketTrend = z.infer<typeof MarketTrendSchema>;
