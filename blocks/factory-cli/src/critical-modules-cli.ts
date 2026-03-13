#!/usr/bin/env node

/**
 * Factory CLI - Critical Modules Commands
 * 
 * Integration of MiroFish and Computer Use into Factory CLI
 * 
 * Usage:
 *   factory mirofish simulate [options]
 *   factory computer-use automate [options]
 *   factory workflow run [options]
 *   factory critical-modules status
 */

import { program } from "commander";
import pino from "pino";
import { CriticalModulesManager, criticalModulesCommands } from "./critical-modules";

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
 * MiroFish Commands
 */
program
  .command("mirofish <command>")
  .description("MiroFish Market Simulation commands")
  .option("--users <number>", "Number of simulated users", "50000")
  .option("--agents <number>", "Number of AI agents", "300")
  .option("--days <number>", "Time horizon in days", "90")
  .option("--seed <number>", "Random seed for reproducibility")
  .action(async (command, options) => {
    try {
      switch (command) {
        case "simulate":
          logger.info("Starting MiroFish market simulation");
          await criticalModulesCommands.simulateMarket({
            users: parseInt(options.users, 10),
            agents: parseInt(options.agents, 10),
            days: parseInt(options.days, 10),
            seed: options.seed ? parseInt(options.seed, 10) : undefined,
          });
          break;

        case "help":
          console.log(`
MiroFish Market Simulation Commands

Usage: factory mirofish <command> [options]

Commands:
  simulate    Run market simulation

Options:
  --users <n>       Number of simulated users (default: 50000)
  --agents <n>      Number of AI agents (default: 300)
  --days <n>        Time horizon in days (default: 90)
  --seed <n>        Random seed for reproducibility

Examples:
  factory mirofish simulate --users 10000 --agents 100 --days 30
  factory mirofish simulate --seed 12345
          `);
          break;

        default:
          logger.error({ command }, "Unknown MiroFish command");
          process.exit(1);
      }
    } catch (error) {
      logger.error(error, "MiroFish command failed");
      process.exit(1);
    }
  });

/**
 * Computer Use Commands
 */
program
  .command("computer-use <command>")
  .description("CLI-Anything Computer Use commands")
  .option("--task <description>", "Task description")
  .option("--app <name>", "Application name", "chrome")
  .option("--timeout <seconds>", "Task timeout", "300")
  .action(async (command, options) => {
    try {
      switch (command) {
        case "automate":
          if (!options.task) {
            logger.error("--task option is required");
            process.exit(1);
          }
          logger.info({ task: options.task }, "Starting UI automation");
          await criticalModulesCommands.automateUI({
            task: options.task,
            app: options.app,
            timeout: parseInt(options.timeout, 10),
          });
          break;

        case "help":
          console.log(`
CLI-Anything Computer Use Commands

Usage: factory computer-use <command> [options]

Commands:
  automate    Execute UI automation task

Options:
  --task <text>     Task description (required)
  --app <name>      Application name (default: chrome)
  --timeout <s>     Task timeout in seconds (default: 300)

Examples:
  factory computer-use automate --task "Complete checkout flow"
  factory computer-use automate --task "Fill contact form" --app chrome --timeout 600
          `);
          break;

        default:
          logger.error({ command }, "Unknown computer-use command");
          process.exit(1);
      }
    } catch (error) {
      logger.error(error, "Computer Use command failed");
      process.exit(1);
    }
  });

/**
 * Workflow Commands - Run integrated workflows
 */
program
  .command("workflow <command>")
  .description("Integrated workflow orchestration")
  .option("--name <description>", "Workflow name")
  .option("--users <number>", "Simulated users", "50000")
  .option("--agents <number>", "AI agents", "300")
  .option("--days <number>", "Time horizon", "90")
  .option("--with-design", "Include design iteration")
  .option("--with-codegen", "Include code generation")
  .action(async (command, options) => {
    try {
      switch (command) {
        case "run":
          logger.info(
            {
              withDesign: options.withDesign,
              withCodegen: options.withCodegen,
            },
            "Starting integrated workflow"
          );

          const manager = new CriticalModulesManager();
          await manager.initialize();

          const result = await manager.runIntegratedWorkflow({
            simulation: {
              simulationName:
                options.name || `Workflow ${new Date().toISOString()}`,
              totalUsers: parseInt(options.users, 10),
              totalAgents: parseInt(options.agents, 10),
              timeHorizonDays: parseInt(options.days, 10),
              enableLogging: true,
              logLevel: "info",
              persistResults: true,
            },
            design: options.withDesign
              ? {
                  iterationId: `design-${Date.now()}`,
                  projectName: "Workflow Design Updates",
                  description: "Design changes based on simulation results",
                  requirements: [
                    {
                      id: "req-1",
                      description: "Update retention messaging",
                      priority: "high",
                      status: "pending",
                    },
                  ],
                  steps: [
                    {
                      stepId: "step-1",
                      task: "Update hero section",
                      estimatedTime: 15,
                      status: "pending",
                    },
                  ],
                  application: "figma",
                  iterations: 0,
                  maxIterations: 3,
                  startTime: new Date(),
                }
              : undefined,
            codegen: options.withCodegen
              ? {
                  generationId: `codegen-${Date.now()}`,
                  projectName: "Workflow Generated Code",
                  description: "Code generated from design updates",
                  sourceLanguage: "figma",
                  targetLanguage: "typescript",
                  requirements: [
                    "Create retention components",
                    "Add analytics tracking",
                  ],
                  startTime: new Date(),
                  status: "pending",
                  iterations: 0,
                }
              : undefined,
          });

          await manager.terminate();

          console.log("\n✅ WORKFLOW COMPLETED:");
          console.log(`Workflow ID: ${result.workflowId}`);
          console.log(
            `Simulation - Churn Rate: ${(
              result.simulation.metrics.churnRate * 100
            ).toFixed(2)}%`
          );
          if (result.design) {
            console.log(
              `Design - Quality Score: ${(result.design.qualityScore * 100).toFixed(0)}%`
            );
          }
          if (result.code) {
            console.log(
              `Code Generation - Files: ${result.code.generatedFiles?.length || 0}`
            );
          }
          console.log(`Total Duration: ${(result.duration / 1000).toFixed(2)}s\n`);

          break;

        case "help":
          console.log(`
Integrated Workflow Commands

Usage: factory workflow <command> [options]

Commands:
  run         Execute integrated workflow

Options:
  --name <text>       Workflow name/description
  --users <n>         Simulated users (default: 50000)
  --agents <n>        AI agents (default: 300)
  --days <n>          Time horizon (default: 90)
  --with-design       Include design iteration
  --with-codegen      Include code generation

Examples:
  factory workflow run --users 10000 --agents 100 --with-design --with-codegen
  factory workflow run --name "Q1 Campaign" --users 50000
          `);
          break;

        default:
          logger.error({ command }, "Unknown workflow command");
          process.exit(1);
      }
    } catch (error) {
      logger.error(error, "Workflow command failed");
      process.exit(1);
    }
  });

/**
 * Critical Modules Status Command
 */
program
  .command("critical-modules")
  .description("Critical Modules management")
  .action(async () => {
    try {
      logger.info("Checking Critical Modules status");
      await criticalModulesCommands.getStatus();
    } catch (error) {
      logger.error(error, "Status check failed");
      process.exit(1);
    }
  });

/**
 * Global help and version
 */
program
  .version("1.0.0", "-v, --version", "Show version")
  .helpOption("-h, --help", "Show help")
  .addHelpCommand("help [command]", "Show help for command");

program
  .on("command:*", () => {
    logger.error("Unknown command");
    program.help();
    process.exit(1);
  });

// Display help if no args
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
