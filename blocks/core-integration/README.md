# Core Integration Module

Central orchestration hub for SaaS Factory critical systems: QA automation, custom AI models, and real-time monitoring.

## Features

- **Unified System Orchestration**: Coordinate QA, AI, and Monitoring subsystems
- **Project Bootstrapping**: Automated setup of testing, AI, and monitoring for new projects
- **Subsystem Access**: Get direct access to QA, AI, and Monitoring systems
- **Cross-System Coordination**: Enable data flow between subsystems

## Installation

```bash
pnpm install @saas-factory/core-integration
```

## Quick Start

### Initialize Integration

```typescript
import { SaaSFactoryCoreIntegration } from '@saas-factory/core-integration';

const integration = new SaaSFactoryCoreIntegration();
await integration.initialize();

console.log('All systems ready!');
```

### Bootstrap New Project

```typescript
const projectConfig = {
  projectId: 'saas-001',
  projectName: 'My Awesome SaaS',
  basePath: './apps/saas-001/src',
  apiUrl: 'http://localhost:3000',
  environment: 'development',
  enableCustomAI: true,
  nLayers: 8,
  epochs: 5,
  batchSize: 64,
  datasetPath: './data/training.txt'
};

const result = await integration.bootstrapProject('saas-001', projectConfig);

console.log('QA Config:', result.qaConfig);
console.log('AI Model:', result.aiModel);
console.log('Dashboard:', result.dashboard);
```

### Access QA System

```typescript
const qaSystem = integration.getQASystem();

// Run tests
const testResults = await qaSystem.runTests('saas-001');
console.log(`Tests: ${testResults.passed}/${testResults.testsRun} passed`);
```

### Access AI System

```typescript
const aiSystem = integration.getAISystem();

// Get inference engine
const inference = await aiSystem.getInferenceEngine('models/saas-001-custom-model');

// Generate text
const result = await inference.generate({
  inputs: 'The future of SaaS is',
  maxTokens: 50,
  temperature: 0.8
});

console.log(result.output);
```

### Access Monitoring System

```typescript
const monitoring = integration.getMonitoringSystem();

// Record metric
monitoring.recordMetric({
  id: 'metric-1',
  name: 'requests_per_second',
  type: 'gauge',
  value: 1250,
  timestamp: new Date(),
  projectId: 'saas-001'
});

// Get metrics collector
const collector = monitoring.getMetricsCollector();
const stats = collector.getStats(
  'requests_per_second',
  new Date(Date.now() - 3600000),
  new Date()
);

console.log(`Avg RPS: ${stats.avg}`);
```

### Setup Alert Handlers

```typescript
const monitoring = integration.getMonitoringSystem();
const alertManager = monitoring.getAlertManager();

// Subscribe to alerts
alertManager.onAlert(async (incident) => {
  console.log(`🚨 Alert: ${incident.title}`);
  
  // Send to Slack
  await fetch(process.env.SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      text: `Alert: ${incident.title}`,
      severity: incident.severity
    })
  });
  
  // Send to PagerDuty
  if (incident.severity === 'critical') {
    await createPagerDutyIncident(incident);
  }
});
```

## Architecture

```
SaaSFactoryCoreIntegration
├── QASystem
│   ├── TestGenerator
│   ├── CoverageAnalyzer
│   └── E2EOrchestrator
├── AISystem
│   ├── NanoGPTModel
│   ├── NanoGPTTrainer
│   └── NanoGPTInference
└── MonitoringSystem
    ├── MetricsCollector
    ├── AlertManager
    └── DashboardManager
```

## API Reference

### SaaSFactoryCoreIntegration

- `initialize()` - Initialize all subsystems
- `bootstrapProject(projectId, config)` - Setup new project with all systems
- `getQASystem()` - Access QA subsystem
- `getAISystem()` - Access AI subsystem
- `getMonitoringSystem()` - Access Monitoring subsystem
- `shutdown()` - Gracefully shutdown all systems

### Project Bootstrap Config

```typescript
interface ProjectConfig {
  projectId: string;
  projectName: string;
  basePath: string;
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableCustomAI?: boolean;
  
  // AI Configuration
  nLayers?: number;
  nHeads?: number;
  dModel?: number;
  epochs?: number;
  batchSize?: number;
  datasetPath?: string;
  
  // QA Configuration
  coverageThreshold?: number;
  testPaths?: string[];
  
  // Monitoring Configuration
  enableMonitoring?: boolean;
  metricsInterval?: number;
}
```

## Integration Patterns

### Pattern 1: Full Pipeline

```typescript
// 1. Bootstrap
const result = await integration.bootstrapProject(projectId, config);

// 2. Run tests
const qaSystem = integration.getQASystem();
await qaSystem.runTests(projectId);

// 3. Train AI model
const aiSystem = integration.getAISystem();
const inferenceEngine = await aiSystem.getInferenceEngine(result.aiModel);

// 4. Monitor everything
const monitoring = integration.getMonitoringSystem();
const metrics = monitoring.getMetricsCollector();
```

### Pattern 2: Testing & Monitoring

```typescript
const qa = integration.getQASystem();
const monitoring = integration.getMonitoringSystem();

// Run tests and track metrics
const results = await qa.runTests(projectId);
monitoring.recordMetric({
  name: 'test_results',
  value: results.passed,
  projectId
});
```

### Pattern 3: AI-Powered QA

```typescript
const ai = integration.getAISystem();
const qa = integration.getQASystem();

// Use AI to generate test suggestions
const inference = await ai.getInferenceEngine(modelPath);
const suggestions = await inference.generate({
  inputs: 'Generate test scenarios for user authentication:',
  maxTokens: 200
});

console.log('Suggested tests:', suggestions.output);
```

## Production Checklist

- ✅ Initialize all subsystems before use
- ✅ Set up proper error handlers for each system
- ✅ Configure alert webhooks (Slack, PagerDuty)
- ✅ Enable metrics collection for all projects
- ✅ Set up log aggregation
- ✅ Configure backup for trained models
- ✅ Test failover scenarios
- ✅ Document custom alert rules
- ✅ Review dashboard layouts per project
- ✅ Plan capacity for AI model serving

## Performance Tips

- Cache QA test results
- Use inference batching for AI
- Implement metrics aggregation pipelines
- Archive old alerts and incidents
- Use CDN for monitor dashboard assets
- Implement rate limiting on alert webhooks

## Troubleshooting

### Tests Not Running

Check QA System initialization:
```typescript
const qa = integration.getQASystem();
// Ensure test config is created
```

### AI Model Errors

Verify training data path:
```typescript
const config = {
  datasetPath: './data/training.txt',
  // Ensure file exists and is readable
};
```

### Missing Metrics

Ensure metrics are being recorded:
```typescript
const monitoring = integration.getMonitoringSystem();
const collector = monitoring.getMetricsCollector();
if (collector) {
  monitoring.recordMetric(metric);
}
```
