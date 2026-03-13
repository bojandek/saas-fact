/**
 * Enterprise Feature Flags Manager
 * Safe deployments with LaunchDarkly integration
 * Supports: Canary deployments, A/B testing, gradual rollouts, kill switches
 */

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  email?: string;
  customAttributes?: Record<string, any>;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: any;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  targetUsers?: string[];
  targetTenants?: string[];
  variants?: FlagVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FlagVariant {
  id: string;
  key: string;
  name: string;
  value: any;
  weight: number; // 0-100, sum should be 100
}

export interface CanaryDeployment {
  featureFlagKey: string;
  stages: DeploymentStage[];
  currentStage: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface DeploymentStage {
  name: string;
  percentage: number; // 1, 10, 25, 50, 100
  durationMinutes: number;
  rollbackOnErrors: boolean;
  fallbackOnErrors: boolean;
}

/**
 * In-memory feature flag store (can be replaced with LaunchDarkly SDK)
 */
class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private deployments: Map<string, CanaryDeployment> = new Map();
  private analyticsEnabled = true;

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags() {
    // Production-ready flags
    this.createFlag({
      key: 'new-dashboard',
      name: 'New Dashboard UI',
      description: 'New glassmorphism dashboard design',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      rolloutPercentage: 0, // Start at 0%
      variants: [
        { id: 'control', key: 'control', name: 'Old Dashboard', value: false, weight: 50 },
        { id: 'treatment', key: 'treatment', name: 'New Dashboard', value: true, weight: 50 },
      ],
    });

    this.createFlag({
      key: 'metaclaw-evolution',
      name: 'MetaClaw Evolution Engine',
      description: 'Enable automated SaaS evolution cycles',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      rolloutPercentage: 25, // 25% of users
    });

    this.createFlag({
      key: 'knowledge-sync-v2',
      name: 'Knowledge Graph Sync v2',
      description: 'New knowledge synchronization protocol',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      rolloutPercentage: 10, // 10% canary
    });

    this.createFlag({
      key: 'ai-recommendations',
      name: 'AI-Powered Recommendations',
      description: 'Enable ML-based app recommendations',
      type: 'boolean',
      defaultValue: false,
      enabled: false,
      rolloutPercentage: 0,
    });

    console.log('✅ Default feature flags initialized');
  }

  /**
   * Create or update flag
   */
  createFlag(flag: FeatureFlag) {
    flag.createdAt = flag.createdAt || new Date();
    flag.updatedAt = new Date();
    this.flags.set(flag.key, flag);
    return flag;
  }

  /**
   * Get flag by key
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * List all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Evaluate flag for user/context
   */
  evaluateFlag(key: string, context: FeatureFlagContext): boolean | any {
    const flag = this.flags.get(key);
    
    if (!flag) {
      console.warn(`Feature flag not found: ${key}`);
      return flag?.defaultValue ?? false;
    }

    // Check if globally enabled
    if (!flag.enabled) {
      return flag.defaultValue;
    }

    // Check if user is in target list
    if (flag.targetUsers?.includes(context.userId || '')) {
      return true;
    }

    // Check if tenant is in target list
    if (flag.targetTenants?.includes(context.tenantId || '')) {
      return true;
    }

    // Rollout percentage (hash user ID for consistent bucketing)
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
      const bucket = this.getBucket(context.userId || context.tenantId || 'unknown', key);
      if (bucket < flag.rolloutPercentage) {
        return true;
      }
    }

    // A/B testing (variant selection)
    if (flag.variants && flag.variants.length > 0) {
      const selectedVariant = this.selectVariant(flag.variants, context.userId || 'unknown');
      return selectedVariant.value;
    }

    return flag.defaultValue;
  }

  /**
   * Calculate consistent bucket for user (0-100)
   * Uses hash to ensure same user always gets same bucket
   */
  private getBucket(userId: string, flagKey: string): number {
    const hash = this.simpleHash(`${userId}:${flagKey}`);
    return (hash % 100) + 1; // 1-100
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Select variant based on weights (for A/B testing)
   */
  private selectVariant(variants: FlagVariant[], userId: string) {
    const bucket = this.getBucket(userId, 'variant-selection');
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.weight;
      if (bucket <= cumulative) {
        return variant;
      }
    }

    return variants[0]; // Fallback
  }

  /**
   * Start canary deployment
   */
  startCanaryDeployment(flagKey: string, stages: DeploymentStage[]): CanaryDeployment {
    const deployment: CanaryDeployment = {
      featureFlagKey: flagKey,
      stages,
      currentStage: 0,
      startedAt: new Date(),
    };

    this.deployments.set(flagKey, deployment);

    // Auto-advance stages
    this.scheduleDeploymentAdvance(flagKey);

    console.log(`🚀 Canary deployment started for ${flagKey}`);
    console.log(`   Stage 1: ${stages[0].percentage}% for ${stages[0].durationMinutes}min`);

    return deployment;
  }

  /**
   * Schedule stage advancement
   */
  private scheduleDeploymentAdvance(flagKey: string) {
    const deployment = this.deployments.get(flagKey);
    if (!deployment || deployment.currentStage >= deployment.stages.length - 1) {
      return;
    }

    const nextStage = deployment.currentStage + 1;
    const currentStage = deployment.stages[deployment.currentStage];
    const flag = this.flags.get(flagKey);

    if (!flag) return;

    // Schedule next stage
    const durationMs = currentStage.durationMinutes * 60 * 1000;
    setTimeout(() => {
      if (flag) {
        flag.rolloutPercentage = deployment.stages[nextStage].percentage;
        deployment.currentStage = nextStage;

        console.log(`📈 Canary advanced: ${flagKey} → ${deployment.stages[nextStage].percentage}%`);

        if (nextStage < deployment.stages.length - 1) {
          this.scheduleDeploymentAdvance(flagKey);
        } else {
          deployment.completedAt = new Date();
          console.log(`✅ Canary deployment completed: ${flagKey}`);
        }
      }
    }, durationMs);
  }

  /**
   * Rollback feature flag
   */
  rollbackDeployment(flagKey: string): CanaryDeployment | undefined {
    const deployment = this.deployments.get(flagKey);
    const flag = this.flags.get(flagKey);

    if (flag) {
      flag.rolloutPercentage = 0;
      flag.enabled = false;
    }

    if (deployment) {
      deployment.completedAt = new Date();
    }

    console.log(`⚠️ ROLLBACK: ${flagKey} disabled`);

    return deployment;
  }

  /**
   * Get canary deployment status
   */
  getDeploymentStatus(flagKey: string): Partial<CanaryDeployment> | null {
    const deployment = this.deployments.get(flagKey);
    if (!deployment) return null;

    const currentStage = deployment.stages[deployment.currentStage];
    const elapsed = Date.now() - deployment.startedAt.getTime();
    const totalDuration = deployment.stages
      .slice(0, deployment.currentStage + 1)
      .reduce((sum, stage) => sum + stage.durationMinutes * 60 * 1000, 0);

    return {
      featureFlagKey: deployment.featureFlagKey,
      currentStage: deployment.currentStage + 1,
      stages: deployment.stages,
      startedAt: deployment.startedAt,
      completedAt: deployment.completedAt,
      currentPercentage: currentStage.percentage,
      progressPercent: Math.min(Math.round((elapsed / totalDuration) * 100), 100),
    };
  }

  /**
   * Update flag percentage manually
   */
  updateFlagPercentage(key: string, percentage: number) {
    const flag = this.flags.get(key);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      flag.updatedAt = new Date();
      console.log(`📊 Updated ${key}: ${percentage}%`);
      return flag;
    }
  }

  /**
   * Emergency kill switch
   */
  killSwitch(flagKey: string) {
    const flag = this.flags.get(flagKey);
    if (flag) {
      flag.enabled = false;
      flag.rolloutPercentage = 0;
      flag.updatedAt = new Date();
      
      // Also rollback any active deployment
      this.rollbackDeployment(flagKey);

      console.log(`🛑 KILL SWITCH: ${flagKey} disabled immediately`);
      return flag;
    }
  }

  /**
   * Get analytics for flag
   */
  getFlagAnalytics(flagKey: string) {
    const flag = this.flags.get(flagKey);
    const deployment = this.deployments.get(flagKey);

    return {
      flag,
      deployment,
      status: {
        enabled: flag?.enabled,
        rolloutPercentage: flag?.rolloutPercentage,
        variantCount: flag?.variants?.length || 0,
        targetUserCount: flag?.targetUsers?.length || 0,
        targetTenantCount: flag?.targetTenants?.length || 0,
      },
    };
  }

  /**
   * Export all flags as JSON (for Terraform/IaC)
   */
  exportFlags(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      flags: Array.from(this.flags.values()),
      deployments: Array.from(this.deployments.values()),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import flags from JSON
   */
  importFlags(json: string) {
    const importData = JSON.parse(json);
    
    for (const flag of importData.flags || []) {
      this.createFlag(flag);
    }

    console.log(`✅ Imported ${importData.flags?.length || 0} flags`);
  }
}

/**
 * Singleton instance
 */
let manager: FeatureFlagManager | null = null;

export function getFeatureFlagManager(): FeatureFlagManager {
  if (!manager) {
    manager = new FeatureFlagManager();
  }
  return manager;
}

/**
 * Hook for React components
 */
export function useFeatureFlag(flagKey: string, context: FeatureFlagContext = {}): boolean {
  const manager = getFeatureFlagManager();
  return manager.evaluateFlag(flagKey, context) as boolean;
}

/**
 * Higher-order component for feature flags
 */
export function withFeatureFlag(
  Component: React.ComponentType<any>,
  flagKey: string,
  context?: FeatureFlagContext
) {
  return (props: any) => {
    const manager = getFeatureFlagManager();
    const isEnabled = manager.evaluateFlag(flagKey, context || {});

    if (!isEnabled) {
      return null;
    }

    return <Component {...props} />;
  };
}

export default getFeatureFlagManager();
