import { z } from 'zod';

// Test Configuration Types
export const TestTypeSchema = z.enum([
  'unit',
  'integration',
  'e2e',
  'performance',
  'security',
  'accessibility'
]);

export type TestType = z.infer<typeof TestTypeSchema>;

export const TestResultSchema = z.object({
  id: z.string().uuid(),
  type: TestTypeSchema,
  name: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'pending']),
  duration: z.number().positive(),
  message: z.string().optional(),
  stackTrace: z.string().optional(),
  timestamp: z.date(),
  projectId: z.string(),
  environment: z.string()
});

export type TestResult = z.infer<typeof TestResultSchema>;

export const TestSuiteConfigSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  basePath: z.string(),
  apiUrl: z.string().url(),
  environment: z.enum(['development', 'staging', 'production']),
  timeout: z.number().positive().default(30000),
  retries: z.number().nonnegative().default(0),
  parallelWorkers: z.number().positive().default(4),
  enableCoverage: z.boolean().default(true),
  coverageThreshold: z.number().min(0).max(100).default(80),
  testPaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional()
});

export type TestSuiteConfig = z.infer<typeof TestSuiteConfigSchema>;

export const CoverageReportSchema = z.object({
  projectId: z.string(),
  timestamp: z.date(),
  overall: z.object({
    statements: z.number(),
    branches: z.number(),
    functions: z.number(),
    lines: z.number()
  }),
  files: z.record(
    z.string(),
    z.object({
      statements: z.number(),
      branches: z.number(),
      functions: z.number(),
      lines: z.number()
    })
  ),
  uncoveredLines: z.array(
    z.object({
      file: z.string(),
      lines: z.array(z.number())
    })
  )
});

export type CoverageReport = z.infer<typeof CoverageReportSchema>;

export const E2ETestScenarioSchema = z.object({
  id: z.string(),
  name: z.string().describe('Human-readable test scenario name'),
  description: z.string(),
  steps: z.array(
    z.object({
      action: z.enum(['navigate', 'click', 'fill', 'select', 'submit', 'wait', 'assert']),
      selector: z.string().optional(),
      value: z.string().optional(),
      expectedResult: z.string().optional(),
      timeout: z.number().optional()
    })
  ),
  tags: z.array(z.string()),
  critical: z.boolean().default(false),
  skipReason: z.string().optional()
});

export type E2ETestScenario = z.infer<typeof E2ETestScenarioSchema>;

export const QAMetricsSchema = z.object({
  projectId: z.string(),
  timestamp: z.date(),
  totalTests: z.number().nonnegative(),
  passedTests: z.number().nonnegative(),
  failedTests: z.number().nonnegative(),
  skippedTests: z.number().nonnegative(),
  totalDuration: z.number().positive(),
  averageDuration: z.number().positive(),
  passRate: z.number().min(0).max(100),
  bugsDensity: z.number().nonnegative().describe('Bugs per 1000 lines of code'),
  flakiness: z.number().min(0).max(100).describe('Percentage of flaky tests')
});

export type QAMetrics = z.infer<typeof QAMetricsSchema>;
