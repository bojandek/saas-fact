export { SaaSFactoryCoreIntegration, default } from './integration';

// Re-export QA components
export {
  TestGenerator,
  CoverageAnalyzer,
  E2EOrchestrator
} from '@saas-factory/qa-automation';

export type {
  TestSuiteConfig,
  CoverageReport,
  E2ETestScenario,
  QAMetrics
} from '@saas-factory/qa-automation';

// Re-export AI components
export {
  NanoGPTModel,
  NanoGPTTrainer,
  NanoGPTInference
} from '@saas-factory/nanogpt';

export type {
  ModelConfig,
  TrainingResults,
  InferenceOutput,
  ModelRegistry
} from '@saas-factory/nanogpt';

// Re-export Monitoring components
export {
  MetricsCollector,
  AlertManager,
  DashboardManager
} from '@saas-factory/monitoring-dashboard';

export type {
  Metric,
  AlertRule,
  AlertIncident,
  ProjectHealth,
  DashboardConfig
} from '@saas-factory/monitoring-dashboard';

/**
 * SaaS Factory Core Integration
 *
 * Unified orchestration of:
 * - Quality Assurance (automated testing)
 * - AI/ML (custom model training & inference)
 * - Real-time Monitoring (metrics, alerts, dashboards)
 */
