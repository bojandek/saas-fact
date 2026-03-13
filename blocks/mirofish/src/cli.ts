#!/usr/bin/env node

import { MarketSimulationEngine } from "./simulation-engine";
import { SimulationConfig } from "./types";
import pino from "pino";

/**
 * MiroFish CLI - Command-line interface for market simulations
 */

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  },
});

/**
 * Run simulation from CLI
 */
async function runSimulation(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || "run";

  try {
    switch (command) {
      case "run":
        await handleRunCommand(args.slice(1));
        break;

      case "help":
        printHelp();
        break;

      case "example":
        await handleExampleCommand();
        break;

      default:
        logger.error({ command }, "Unknown command");
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error(error, "Simulation failed");
    process.exit(1);
  }
}

/**
 * Handle run command
 */
async function handleRunCommand(args: string[]): Promise<void> {
  let configPath = "./simulation-config.json";
  let users = 50000;
  let agents = 300;
  let days = 90;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--config":
        configPath = args[++i];
        break;
      case "--users":
        users = parseInt(args[++i], 10);
        break;
      case "--agents":
        agents = parseInt(args[++i], 10);
        break;
      case "--days":
        days = parseInt(args[++i], 10);
        break;
    }
  }

  const config: SimulationConfig = {
    simulationName: "Market Simulation Run",
    description: "CLI-triggered comprehensive market simulation",
    totalUsers: users,
    totalAgents: agents,
    timeHorizonDays: days,
    enableLogging: true,
    logLevel: "info",
    persistResults: true,
    resultsPath: "./simulation-results.json",
    marketConditions: {
      economicShift: 0.1,
      competitionLevel: 0.6,
      technologyAdoption: 0.7,
    },
  };

  logger.info(
    {
      config,
    },
    "Starting market simulation"
  );

  const engine = new MarketSimulationEngine(config);
  const startTime = Date.now();

  try {
    const result = await engine.run();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(
      {
        simulationId: result.simulationId,
        duration: `${duration}s`,
        metrics: result.metrics,
        risks: result.riskProfile,
        trends: result.trendAnalysis.emergingTrends.length,
      },
      "Simulation completed successfully"
    );

    // Print summary
    printResultsSummary(result);
  } catch (error) {
    logger.error(
      { error, duration: ((Date.now() - startTime) / 1000).toFixed(2) },
      "Simulation failed"
    );
    throw error;
  }
}

/**
 * Handle example command
 */
async function handleExampleCommand(): Promise<void> {
  logger.info("Running example market simulation with 5000 users and 50 agents");

  const config: SimulationConfig = {
    simulationName: "Example Simulation",
    description: "Small-scale example for demonstration",
    totalUsers: 5000,
    totalAgents: 50,
    timeHorizonDays: 30,
    enableLogging: true,
    logLevel: "debug",
    persistResults: true,
    resultsPath: "./example-results.json",
    marketConditions: {
      economicShift: 0.05,
      competitionLevel: 0.5,
      technologyAdoption: 0.65,
    },
  };

  const engine = new MarketSimulationEngine(config);
  const result = await engine.run();

  logger.info(
    {
      simulationId: result.simulationId,
      churnRate: (result.metrics.churnRate * 100).toFixed(2) + "%",
      conversionRate: (result.metrics.conversionRate * 100).toFixed(2) + "%",
      predictedARR: `$${result.metrics.predictedARR.toFixed(0)}`,
    },
    "Example simulation completed"
  );

  printResultsSummary(result);
}

/**
 * Print results summary
 */
function printResultsSummary(result: any): void {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║         MARKET SIMULATION RESULTS SUMMARY              ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  console.log("\n📊 KEY METRICS:");
  console.log(
    `   Churn Rate:        ${(result.metrics.churnRate * 100).toFixed(2)}%`
  );
  console.log(
    `   Conversion Rate:   ${(result.metrics.conversionRate * 100).toFixed(2)}%`
  );
  console.log(
    `   Avg Engagement:    ${(result.metrics.avgEngagementScore * 100).toFixed(2)}%`
  );
  console.log(
    `   Predicted MRR:     $${result.metrics.predictedMRR.toFixed(0)}`
  );
  console.log(
    `   Predicted ARR:     $${result.metrics.predictedARR.toFixed(0)}`
  );

  console.log("\n⚠️  RISK PROFILE:");
  console.log(`   High Risk Users:   ${result.riskProfile.highRiskUsers}`);
  console.log(
    `   Medium Risk Users: ${result.riskProfile.mediumRiskUsers}`
  );
  console.log(`   Low Risk Users:    ${result.riskProfile.lowRiskUsers}`);

  if (result.riskProfile.criticalAnomalies.length > 0) {
    console.log(`   Critical Anomalies: ${result.riskProfile.criticalAnomalies.length}`);
    result.riskProfile.criticalAnomalies.forEach((a: string) => {
      console.log(`     - ${a}`);
    });
  }

  if (result.trendAnalysis.emergingTrends.length > 0) {
    console.log("\n📈 EMERGING TRENDS:");
    result.trendAnalysis.emergingTrends.forEach((trend: any) => {
      console.log(`   ${trend.name} (${(trend.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`     - Affects ${trend.affectedUsersPercent}% of users`);
      console.log(
        `     - Revenue impact: ${(trend.businessImpact.revenueImpact * 100).toFixed(1)}%`
      );
    });
  }

  console.log("\n✅ Simulation ID: " + result.simulationId);
  console.log(`📁 Results saved to: ./simulation-results.json`);
  console.log("\n");
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
MiroFish Market Simulation Engine

USAGE:
  mirofish [COMMAND] [OPTIONS]

COMMANDS:
  run         Run a market simulation (default)
  example     Run example simulation with preset values
  help        Show this help message

OPTIONS (for 'run' command):
  --config FILE     Path to simulation config file
  --users N         Number of simulated users (default: 50000)
  --agents N        Number of AI agents (default: 300)
  --days N          Simulation time horizon in days (default: 90)

EXAMPLES:
  # Run default simulation
  $ mirofish run

  # Run with custom parameters
  $ mirofish run --users 10000 --agents 100 --days 60

  # Run example simulation
  $ mirofish example

  # Show this help
  $ mirofish help
`);
}

// Run CLI
runSimulation().catch((error) => {
  logger.error(error, "Fatal error");
  process.exit(1);
});
