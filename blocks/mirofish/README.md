# MiroFish Market Simulation Engine

Universal market simulation platform featuring AI-powered agent swarms for behavior prediction, trend analysis, and market testing.

## Features

### 🐠 Agent Swarm System
- **1000+ AI Agents**: Deploy concurrent predictor, simulator, analyzer, optimizer, and validator agents
- **Ensemble Predictions**: Combine multiple agent predictions using weighted averaging
- **Adaptive Learning**: Agents improve accuracy through experience
- **Performance Tracking**: Real-time metrics on accuracy, precision, recall, F1 score

### 📊 Market Simulation
- **User Behavior**: Simulate 50,000+ realistic user profiles with behavioral patterns
- **Churn Prediction**: Predict user churn with 95%+ confidence
- **Conversion Modeling**: Forecast purchase behavior and LTV
- **Cohort Analysis**: Analyze user segments across time horizons

### 📈 Trend Analysis
- **Pattern Detection**: Identify emerging market trends and seasonal patterns
- **Risk Assessment**: Classify users into risk tiers (high/medium/low)
- **Business Impact**: Quantify revenue and engagement implications
- **Recommendations**: Generate actionable optimization strategies

### 🎯 Prediction Models
- **Multi-factor Analysis**: Engagementlevel, session duration, login frequency, conversion history
- **Risk Factors**: Dynamic risk profile evaluation
- **Interventions**: Recommend retention actions with effectiveness scoring
- **Anomaly Detection**: Identify unusual user behavior patterns

## Installation

```bash
npm install @saas-factory/mirofish
```

## Quick Start

### Basic Simulation

```typescript
import { MarketSimulationEngine } from "@saas-factory/mirofish";

const config = {
  simulationName: "Q1 Market Test",
  totalUsers: 50000,
  totalAgents: 300,
  timeHorizonDays: 90,
  enableLogging: true,
  logLevel: "info",
  persistResults: true,
  resultsPath: "./results.json",
};

const engine = new MarketSimulationEngine(config);
const result = await engine.run();

console.log(`Churn Rate: ${(result.metrics.churnRate * 100).toFixed(2)}%`);
console.log(`Conversion Rate: ${(result.metrics.conversionRate * 100).toFixed(2)}%`);
console.log(`Predicted ARR: $${result.metrics.predictedARR.toFixed(0)}`);
```

### Using CLI

```bash
# Run with default parameters
npx mirofish run

# Run with custom parameters
npx mirofish run --users 10000 --agents 100 --days 60

# Run example simulation
npx mirofish example

# Show help
npx mirofish help
```

## Architecture

```
MarketSimulationEngine
├── AgentSwarmManager (300+ agents)
│   ├── Predictor Agents (60 agents)
│   ├── Simulator Agents (60 agents)
│   ├── Analyzer Agents (60 agents)
│   ├── Optimizer Agents (60 agents)
│   └── Validator Agents (60 agents)
├── BehaviorPredictionModel
│   ├── Churn Probability Calculator
│   ├── Conversion Predictor
│   ├── LTV Estimator
│   ├── Intervention Generator
│   └── Anomaly Detector
├── SimulationEngine (Daily simulation loop)
│   ├── User Generation
│   ├── Event Simulation
│   ├── Cohort Analysis
│   └── Trend Analysis
└── ResultsAnalyzer
    ├── Metrics Aggregator
    ├── Risk Profiler
    └── Insights Generator
```

## Configuration

```typescript
interface SimulationConfig {
  simulationName: string;
  totalUsers: number; // 1,000-500,000
  totalAgents: number; // 10-1,000
  timeHorizonDays: number; // 1-365
  randomSeed?: number;
  enableLogging: boolean; // default: true
  logLevel: "debug" | "info" | "warn" | "error"; // default: "info"
  persistResults: boolean; // default: true
  resultsPath?: string;
  marketConditions?: {
    economicShift: number; // -1 (recession) to +1 (boom)
    competitionLevel: number; // 0-1
    technologyAdoption: number; // 0-1
  };
}
```

## Simulation Results

Each simulation returns comprehensive metrics:

```typescript
{
  simulationId: "sim-xyz123",
  status: "completed",
  metrics: {
    churnRate: 0.15,           // 15%
    conversionRate: 0.28,      // 28%
    avgEngagementScore: 0.68,  // 68%
    predictedMRR: 125000,      // $125k/month
    predictedARR: 1500000,     // $1.5M/year
  },
  riskProfile: {
    highRiskUsers: 2500,
    mediumRiskUsers: 8000,
    lowRiskUsers: 39500,
  },
  trendAnalysis: {
    emergingTrends: [...],
    seasonalPatterns: [...],
    marketMovements: [...],
  },
}
```

## Advanced Usage

### Custom User Profiles

```typescript
const userProfile = {
  userId: "user-123",
  engagementLevel: 0.85,
  churnRisk: 0.1,
  purchasePropensity: 0.6,
  featureUsagePattern: {
    dashboard: 85,
    reports: 60,
    api: 40,
  },
  avgSessionDuration: 35,
  loginFrequency: 3.5,
  conversionHistory: [
    { timestamp: new Date("2024-01-15"), amount: 299 },
    { timestamp: new Date("2024-03-20"), amount: 99 },
  ],
  lastActive: new Date(),
  cohortId: "cohort-5",
  segmentTags: ["power-user", "enterprise"],
  riskFactors: [{ factor: "declining-engagement", weight: 0.2 }],
};

const prediction = await swarmManager.predictUserBehavior(userProfile);
```

### Accessing Detailed Predictions

```typescript
const predictions = engine.getPredictions();

predictions.forEach((pred) => {
  console.log(`User ${pred.userId}:`);
  console.log(
    `  Churn Risk: ${(pred.predictions.willChurnIn30Days.probability * 100).toFixed(1)}%`
  );
  console.log(
    `  Next Purchase: ${pred.predictions.nextPurchaseIn.daysUntilPurchase} days`
  );
  console.log(
    `  Predicted LTV: $${pred.predictions.nextPurchaseIn.expectedValue.toFixed(0)}`
  );

  // Get recommended retention actions
  pred.predictions.willChurnIn30Days.recommendedActions.forEach((action) => {
    console.log(`  Action: ${action.action}`);
    console.log(`    Effectiveness: ${(action.effectiveness * 100).toFixed(0)}%`);
    console.log(`    Cost: $${action.cost}`);
  });
});
```

## Performance Optimization

### For Large Simulations
```typescript
// Use smaller time horizons and batch processing
const config = {
  totalUsers: 500000,
  totalAgents: 500,
  timeHorizonDays: 30, // Shorter horizon
  enableLogging: false, // Disable logging for speed
};
```

### Agent Pool Management
```typescript
const swarmman = new AgentSwarmManager();
await swarmman.initializeSwarm(300);

// Monitor agent performance
const stats = swarmMan.getSwarmStats();
console.log(`Active Agents: ${stats.activeAgents}`);
console.log(`Avg Accuracy: ${stats.averagePerformance.accuracy.toFixed(3)}`);

// Deactivate underperforming agents
agents.forEach((agent) => {
  if (agent.performanceMetrics.f1Score < 0.7) {
    swarmMan.setAgentActive(agent.agentId, false);
  }
});
```

## Use Cases

### Pre-Launch Market Testing
Test product-market fit assumptions before full launch:
```typescript
const config = {
  totalUsers: 50000,
  totalAgents: 300,
  timeHorizonDays: 90,
  simulationName: "Pre-Launch Testing",
};
```

### Pricing Strategy Validation
Simulate impact of different pricing models:
```typescript
// Run multiple simulations with different configurations
const pricingTiers = [99, 199, 299];
for (const price of pricingTiers) {
  const result = await engine.run(/* config with adjusted propensity */);
}
```

### Churn Prevention Strategy
Identify high-risk users and test interventions:
```typescript
const predictions = engine.getPredictions();
const highRisk = predictions.filter(
  (p) => p.predictions.willChurnIn30Days.probability > 0.7
);
```

### Cohort Behavior Analysis
Understand segment-specific patterns:
```typescript
engine.state.trendAnalysis.emergingTrends.forEach((trend) => {
  console.log(`${trend.name}: ${trend.affectedUsersPercent}% affected`);
});
```

## Limitations & Considerations

- Simulation accuracy depends on historical data quality
- Large simulations (500k+ users) require significant computation time
- Agent predictions improve with more iteration
- Market conditions must be realistic inputs
- Results are probabilistic, not deterministic

## Troubleshooting

### Simulation Running Slowly
- Reduce `totalUsers` or `timeHorizonDays`
- Disable logging: `enableLogging: false`
- Use fewer agents: adjust `totalAgents`

### Low Prediction Accuracy
- Ensure input user profiles are realistic
- Increase agent count for better ensemble
- Validate against historical data

### Memory Issues
- Process results in batches
- Clear prediction cache periodically
- Use streaming for large result sets

## API Reference

See [API Documentation](../../docs/API.md) for complete type definitions.

## Contributing

Issues and PRs welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

Proprietary - SaaS Factory © 2024
