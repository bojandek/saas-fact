export { TestGenerator } from './test-generator.js';
export { CoverageAnalyzer } from './coverage-analyzer.js';
export { E2EOrchestrator } from './e2e-orchestrator.js';
export type {
  TestType,
  TestResult,
  TestSuiteConfig,
  CoverageReport,
  E2ETestScenario,
  QAMetrics
} from './types.js';

export {
  TestTypeSchema,
  TestResultSchema,
  TestSuiteConfigSchema,
  CoverageReportSchema,
  E2ETestScenarioSchema,
  QAMetricsSchema
} from './types.js';

/**
 * SaaS Factory QA Automation Module
 *
 * Provides comprehensive automated testing capabilities:
 * - Test generation for various test types
 * - Coverage analysis with gap detection
 * - Cross-browser E2E testing orchestration
 * - Performance and security testing
 */
