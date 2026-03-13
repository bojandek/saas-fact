# QA Automation Module

Automated quality assurance testing system for SaaS Factory applications.

## Features

- **Test Generator**: Automatically generates unit, integration, E2E, performance, and security tests
- **Coverage Analyzer**: Deep coverage analysis with gap detection and recommendations
- **E2E Orchestrator**: Cross-browser E2E testing with Playwright
- **Performance Testing**: Automated performance regression detection
- **Security Testing**: OWASP top 10 vulnerability checks

## Usage

### Test Generation

```typescript
import { TestGenerator } from '@saas-factory/qa-automation';

const config = {
  projectId: 'project-001',
  projectName: 'My SaaS',
  basePath: './src',
  apiUrl: 'http://localhost:3000',
  environment: 'development',
  parallelWorkers: 4,
  coverageThreshold: 80
};

const generator = new TestGenerator(config);
const unitTests = await generator.generateUnitTests('./src/services/user.ts');
await generator.writeTestFile('./src/services/user.test.ts', unitTests);
```

### Coverage Analysis

```typescript
import { CoverageAnalyzer } from '@saas-factory/qa-automation';

const analyzer = new CoverageAnalyzer();
const report = await analyzer.analyzeCoverage(coverageData);
const gaps = await analyzer.identifyGaps(report, 80);
```

### E2E Testing

```typescript
import { E2EOrchestrator, E2ETestScenario } from '@saas-factory/qa-automation';

const orchestrator = new E2EOrchestrator('project-001', 'http://localhost:3000');
await orchestrator.initialize(['chromium', 'firefox']);

const scenarios: E2ETestScenario[] = [
  {
    id: '001',
    name: 'User Login Flow',
    description: 'Test complete login process',
    steps: [
      { action: 'navigate', value: '/login' },
      { action: 'fill', selector: '[name="email"]', value: 'user@example.com' },
      { action: 'fill', selector: '[name="password"]', value: 'password123' },
      { action: 'click', selector: 'button[type="submit"]' },
      { action: 'wait', timeout: 5000 }
    ],
    tags: ['auth', 'critical'],
    critical: true
  }
];

const results = await orchestrator.runTestSuite(scenarios);
await orchestrator.cleanup();
```

## API

### TestGenerator

- `generateUnitTests(filePath)` - Generate unit test templates
- `generateE2ETests(scenarios)` - Generate E2E tests from scenarios
- `generateIntegrationTests(apiSpec)` - Generate API integration tests
- `generatePerformanceTests(endpoints)` - Generate performance tests
- `generateSecurityTests()` - Generate security tests
- `writeTestFile(filePath, content)` - Write test to disk

### CoverageAnalyzer

- `analyzeCoverage(coverageData)` - Analyze coverage report
- `identifyGaps(report, threshold)` - Find low coverage files
- `generateReport(report, threshold)` - Generate human-readable report
- `calculateMetrics(testResults)` - Calculate QA metrics

### E2EOrchestrator

- `initialize(browserTypes)` - Initialize browser instances
- `executeScenario(scenario, browserType)` - Run single test scenario
- `runTestSuite(scenarios, browserTypes)` - Run complete test suite
- `captureScreenshot(page, testName)` - Capture failure screenshots
- `cleanup()` - Clean up resources

## Configuration

Create a `test-config.json`:

```json
{
  "projectId": "project-001",
  "projectName": "My SaaS",
  "basePath": "./src",
  "apiUrl": "http://localhost:3000",
  "environment": "testing",
  "timeout": 30000,
  "retries": 2,
  "parallelWorkers": 4,
  "enableCoverage": true,
  "coverageThreshold": 80
}
```

## Production Guidelines

- Always run tests in CI/CD pipeline
- Maintain minimum 80% code coverage
- Fix failing security tests immediately
- Monitor flaky tests and stabilize them
- Generate coverage reports after each deployment
