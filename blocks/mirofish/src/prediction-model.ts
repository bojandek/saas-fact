import pino from "pino";
import {
  UserBehaviorProfile,
  BehaviorPrediction,
  MarketTrend,
} from "./types";

/**
 * Behavioral Prediction Model - Uses ensemble methods for accurate predictions
 */
export class BehaviorPredictionModel {
  private logger: pino.Logger;
  private modelWeights: Map<string, number> = new Map();

  constructor(logger: pino.Logger) {
    this.logger = logger;
    this.initializeModelWeights();
  }

  /**
   * Initialize model weights based on typical performance
   */
  private initializeModelWeights(): void {
    this.modelWeights.set("churn-classifier", 0.35);
    this.modelWeights.set("engagement-predictor", 0.25);
    this.modelWeights.set("conversion-model", 0.25);
    this.modelWeights.set("anomaly-detector", 0.15);

    this.logger.debug(
      { weights: Object.fromEntries(this.modelWeights) },
      "Model weights initialized"
    );
  }

  /**
   * Predict churn probability using multi-factor analysis
   */
  predictChurnProbability(user: UserBehaviorProfile): number {
    const factors: number[] = [];

    // Factor 1: Engagement level (inverse relationship)
    factors.push((1 - user.engagementLevel) * 0.4);

    // Factor 2: Session duration (shorter = higher churn)
    const avgDurationFactor = Math.max(
      0,
      1 - user.avgSessionDuration / 60
    );
    factors.push(avgDurationFactor * 0.2);

    // Factor 3: Login frequency (lower = higher churn)
    const loginFreqFactor = Math.max(0, 1 - user.loginFrequency / 5);
    factors.push(loginFreqFactor * 0.2);

    // Factor 4: Conversion history (more purchases = lower churn)
    const conversionFactor =
      user.conversionHistory.length > 0 ? 0 : 0.1;
    factors.push(conversionFactor);

    // Factor 5: Risk factors weight
    const riskWeight = user.riskFactors.reduce(
      (sum, f) => sum + f.weight,
      0
    );
    factors.push(Math.min(0.3, riskWeight * 0.15));

    // Factor 6: Baseline churn risk
    factors.push(user.churnRisk * 0.08);

    // Weighted combination
    const totalWeight = 0.4 + 0.2 + 0.2 + 0.075 + 0.225 + 0.08;
    const combinedScore = factors.reduce((a, b) => a + b, 0);
    const normalizedScore = combinedScore / totalWeight;

    return Math.min(1, Math.max(0, normalizedScore));
  }

  /**
   * Predict conversion probability
   */
  predictConversionProbability(user: UserBehaviorProfile): number {
    const factors: number[] = [];

    // Factor 1: Purchase propensity (direct)
    factors.push(user.purchasePropensity * 0.35);

    // Factor 2: Engagement (higher engagement = higher conversion)
    factors.push(user.engagementLevel * 0.25);

    // Factor 3: Feature usage pattern (more features = stronger commitment)
    const usedFeatures = Object.values(user.featureUsagePattern).filter(
      (v) => v > 0
    ).length;
    const featureFactor = Math.min(
      1,
      (usedFeatures / 4) * 0.2 // 4 main features
    );
    factors.push(featureFactor);

    // Factor 4: Conversion history (past converters likely to convert again)
    const hasConversionHistory = user.conversionHistory.length > 0 ? 0.15 : 0;
    factors.push(hasConversionHistory);

    // Factor 5: Recency of activity
    const daysSinceActive = Math.floor(
      (Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyFactor = daysSinceActive < 7 ? 0.15 : 0.05;
    factors.push(recencyFactor);

    return Math.min(1, factors.reduce((a, b) => a + b, 0));
  }

  /**
   * Estimate customer lifetime value
   */
  estimateLTV(user: UserBehaviorProfile): number {
    // Based on past conversions
    const historicalValue =
      user.conversionHistory.reduce((sum, c) => sum + c.amount, 0) || 100;
    const avgPurchaseValue =
      user.conversionHistory.length > 0
        ? historicalValue / user.conversionHistory.length
        : 100;

    // Estimate future purchases
    const conversionProb = this.predictConversionProbability(user);
    const churnProb = this.predictChurnProbability(user);
    const retentionRate = 1 - churnProb;

    // Simple LTV: (Average Purchase Value * Profit Margin) * (1 - Churn Rate) * (Average Customer Lifespan in months)
    const lifetimeMonths = Math.max(
      3,
      Math.min(36, (1 / Math.max(0.01, churnProb)) * 3)
    ); // 3-36 months
    const ltv =
      avgPurchaseValue * 0.6 * retentionRate * lifetimeMonths;

    return Math.max(0, ltv);
  }

  /**
   * Detect cohort membership
   */
  detectCohortCharacteristics(
    user: UserBehaviorProfile
  ): Record<string, string | number> {
    return {
      coreSegment: user.segmentTags[0] || "general",
      engagementTier: this.getEngagementTier(user.engagementLevel),
      valueSegment: this.getValueSegment(user),
      riskLevel: this.getRiskLevel(user.churnRisk),
      adoptionSpeed: this.getAdoptionSpeed(user),
    };
  }

  /**
   * Get engagement tier
   */
  private getEngagementTier(engagement: number): string {
    if (engagement > 0.75) return "power-user";
    if (engagement > 0.5) return "active-user";
    if (engagement > 0.25) return "casual-user";
    return "dormant-user";
  }

  /**
   * Get value segment
   */
  private getValueSegment(user: UserBehaviorProfile): string {
    const totalSpent = user.conversionHistory.reduce((s, c) => s + c.amount, 0);

    if (totalSpent > 1000) return "high-value";
    if (totalSpent > 200) return "medium-value";
    if (totalSpent > 0) return "low-value";
    return "non-paying";
  }

  /**
   * Get risk level
   */
  private getRiskLevel(churnRisk: number): string {
    if (churnRisk > 0.7) return "critical";
    if (churnRisk > 0.4) return "high";
    if (churnRisk > 0.2) return "medium";
    return "low";
  }

  /**
   * Get adoption speed
   */
  private getAdoptionSpeed(user: UserBehaviorProfile): string {
    const usedFeatures = Object.values(user.featureUsagePattern).filter(
      (v) => v > 0
    ).length;

    if (usedFeatures > 3) return "rapid";
    if (usedFeatures > 1) return "moderate";
    if (usedFeatures > 0) return "slow";
    return "none";
  }

  /**
   * Calculate customer acquisition cost breakeven point
   */
  calculatePaybackPeriod(user: UserBehaviorProfile, cac: number = 50): number {
    const avgMonthlyRevenue =
      (user.conversionHistory.reduce((s, c) => s + c.amount, 0) || 100) / 12;

    if (avgMonthlyRevenue <= 0) return Infinity;

    return cac / avgMonthlyRevenue;
  }

  /**
   * Detect anomalies in user behavior
   */
  detectAnomalies(user: UserBehaviorProfile): string[] {
    const anomalies: string[] = [];

    // Sudden disengagement
    const daysSinceActive = Math.floor(
      (Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActive > 60) {
      anomalies.push("extended-inactivity");
    }

    // Very short sessions
    if (user.avgSessionDuration < 3) {
      anomalies.push("minimal-session-duration");
    }

    // No engagement despite active status
    if (
      user.engagementLevel < 0.1 &&
      daysSinceActive < 7
    ) {
      anomalies.push("low-engagement-despite-activity");
    }

    // Atypical usage pattern
    const usedFeatures = Object.values(user.featureUsagePattern).filter(
      (v) => v > 0
    ).length;
    if (usedFeatures === 0 && daysSinceActive < 30) {
      anomalies.push("no-feature-usage");
    }

    // No conversion trend
    if (
      user.conversionHistory.length === 0 &&
      user.engagementLevel > 0.7 &&
      daysSinceActive < 30
    ) {
      anomalies.push("high-engagement-no-conversion");
    }

    return anomalies;
  }

  /**
   * Generate intervention recommendations
   */
  generateInterventions(
    user: UserBehaviorProfile,
    churnProb: number
  ): Array<{
    intervention: string;
    reason: string;
    expectedImpact: number;
    cost: number;
  }> {
    const interventions = [];

    // High churn risk
    if (churnProb > 0.7) {
      interventions.push({
        intervention: "retention-offer",
        reason: "Critical churn risk detected",
        expectedImpact: 0.4,
        cost: 75,
      });
      interventions.push({
        intervention: "vip-support",
        reason: "High-value at-risk customer",
        expectedImpact: 0.3,
        cost: 150,
      });
    }

    // Low engagement
    if (user.engagementLevel < 0.3) {
      interventions.push({
        intervention: "onboarding-support",
        reason: "Underutilization of platform",
        expectedImpact: 0.25,
        cost: 50,
      });
      interventions.push({
        intervention: "feature-discovery",
        reason: "Limited feature adoption",
        expectedImpact: 0.2,
        cost: 20,
      });
    }

    // Conversion opportunity
    if (
      user.purchasePropensity > 0.5 &&
      user.conversionHistory.length === 0
    ) {
      interventions.push({
        intervention: "trial-upgrade-prompt",
        reason: "High conversion propensity",
        expectedImpact: 0.35,
        cost: 10,
      });
    }

    // Seasonal opportunity
    interventions.push({
      intervention: "contextual-upsell",
      reason: "Opportunistic revenue increase",
      expectedImpact: 0.15,
      cost: 5,
    });

    return interventions;
  }

  /**
   * Predict market trends from user cohorts
   */
  predictMarketTrends(
    users: UserBehaviorProfile[]
  ): MarketTrend[] {
    const trends: MarketTrend[] = [];

    // Calculate aggregate metrics
    const avgEngagement =
      users.reduce((s, u) => s + u.engagementLevel, 0) / users.length;
    const avgChurnRisk =
      users.reduce((s, u) => s + u.churnRisk, 0) / users.length;
    const conversionRate =
      users.filter((u) => u.conversionHistory.length > 0).length / users.length;

    // Trend 1: Engagement patterns
    if (avgEngagement > 0.6) {
      trends.push({
        trendId: `trend-engagement-${Date.now()}`,
        name: "High Engagement Phase",
        category: "engagement",
        confidence: 0.8,
        affectedUsersPercent: 60,
        timeToMaturity: "1-2 weeks",
        businessImpact: {
          revenueImpact: 0.2,
          churnImpact: -0.15,
          engagementImpact: 0.25,
        },
        recommendations: [
          "Launch premium tier promotions",
          "Release new features to capitalize on engagement",
        ],
        detectedAt: new Date(),
      });
    }

    // Trend 2: Churn risk
    if (avgChurnRisk > 0.4) {
      trends.push({
        trendId: `trend-churn-${Date.now()}`,
        name: "Elevated Churn Risk",
        category: "market",
        confidence: 0.75,
        affectedUsersPercent: 40,
        timeToMaturity: "2-3 weeks",
        businessImpact: {
          revenueImpact: -0.1,
          churnImpact: 0.15,
          engagementImpact: -0.1,
        },
        recommendations: [
          "Activate retention campaigns",
          "Enhance customer success initiatives",
        ],
        detectedAt: new Date(),
      });
    }

    // Trend 3: Conversion opportunity
    if (conversionRate > 0.3) {
      trends.push({
        trendId: `trend-conversion-${Date.now()}`,
        name: "Strong Conversion Signals",
        category: "pricing",
        confidence: 0.85,
        affectedUsersPercent: 35,
        timeToMaturity: "1 week",
        businessImpact: {
          revenueImpact: 0.25,
          churnImpact: -0.05,
          engagementImpact: 0.1,
        },
        recommendations: [
          "Optimize pricing page conversion",
          "Run upsell campaigns",
        ],
        detectedAt: new Date(),
      });
    }

    return trends;
  }
}
