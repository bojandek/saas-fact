export { TestGenerator } from './test-generator';
export { CoverageAnalyzer } from './coverage-analyzer';
export { E2EOrchestrator } from './e2e-orchestrator';
export type {
  TestType,
  TestResult,
  TestSuiteConfig,
  CoverageReport,
  E2ETestScenario,
  QAMetrics
} from './types';

export {
  TestTypeSchema,
  TestResultSchema,
  TestSuiteConfigSchema,
  CoverageReportSchema,
  E2ETestScenarioSchema,
  QAMetricsSchema
} from './types';

/**
 * SaaS Factory QA Automation Module
 *
 * Provides comprehensive automated testing capabilities:
 * - Test generation for various test types
 * - Coverage analysis with gap detection
 * - Cross-browser E2E testing orchestration
 * - Performance and security testing
 */
