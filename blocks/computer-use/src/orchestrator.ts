import pino from "pino";
import { nanoid } from "nanoid";
import {
  AutomationTask,
  DesignIteration,
  CodeGeneration,
  ComputerUseSession,
  InteractionPlan,
  UIElement,
  Screenshot,
} from "./types";
import { ScreenshotEngine } from "./screenshot-engine";
import { ElementDetector } from "./element-detector";
import { InteractionEngine } from "./interaction-engine";

/**
 * Computer Use Orchestrator - Master coordinator for UI automation workflows
 */
export class ComputerUseOrchestrator {
  private logger: pino.Logger;
  private screenshotEngine: ScreenshotEngine;
  private elementDetector: ElementDetector;
  private interactionEngine: InteractionEngine;
  private sessions: Map<string, ComputerUseSession> = new Map();
  private isInitialized = false;

  constructor(enableLogging: boolean = true, logLevel: string = "info") {
    this.logger = pino({
      level: logLevel,
      transport: enableLogging
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          }
        : undefined,
    });

    this.screenshotEngine = new ScreenshotEngine(this.logger);
    this.elementDetector = new ElementDetector(this.logger);
    this.interactionEngine = new InteractionEngine(this.logger);
  }

  /**
   * Initialize orchestrator
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info("Initializing Computer Use Orchestrator");

      await this.screenshotEngine.initialize();

      this.isInitialized = true;
      this.logger.info("Orchestrator initialized");
    } catch (error) {
      this.logger.error({ error }, "Orchestrator initialization failed");
      throw error;
    }
  }

  /**
   * Execute automation task
   */
  async executeTask(
    task: AutomationTask,
    page?: any
  ): Promise<ComputerUseSession> {
    if (!this.isInitialized) {
      throw new Error("Orchestrator not initialized");
    }

    const sessionId = `session-${nanoid(12)}`;

    try {
      this.logger.info(
        { taskId: task.taskId, name: task.name },
        "Starting task execution"
      );

      // Initialize session
      const session = await this.interactionEngine.initializeSession(
        task.name,
        task.application,
        page
      );

      // Execute each step
      for (const step of task.steps) {
        this.logger.debug({ stepId: step.stepId }, "Executing step");

        try {
          // Check condition if specified
          if (step.condition) {
            const conditionMet = await this.checkCondition(
              step.condition,
              page
            );
            if (!conditionMet) {
              this.logger.warn(
                { condition: step.condition },
                "Condition not met, skipping step"
              );
              continue;
            }
          }

          // Execute interactions
          if (step.interactions && step.interactions.length > 0) {
            for (const interaction of step.interactions) {
              // Execute interaction based on type
              if (interaction.type === "click" && interaction.target) {
                await this.interactionEngine.click(interaction.target, page);
              } else if (interaction.type === "type" && interaction.value) {
                if (interaction.target) {
                  await this.interactionEngine.type(
                    interaction.target,
                    interaction.value,
                    page
                  );
                }
              } else if (interaction.type === "key-press" && interaction.key) {
                await this.interactionEngine.pressKey(
                  interaction.key,
                  page
                );
              }
            }
          }

          if (session) {
            session.tasksCompleted.push(step.stepId);
          }
        } catch (error) {
          this.logger.warn(
            { stepId: step.stepId, error },
            "Step execution failed"
          );
          if (session) {
            session.tasksFailed.push(step.stepId);
          }
        }
      }

      // End session
      const finalSession = await this.interactionEngine.endSession();
      this.sessions.set(sessionId, finalSession);

      this.logger.info(
        { taskId: task.taskId, sessionId },
        "Task execution completed"
      );

      return finalSession;
    } catch (error) {
      this.logger.error(
        { taskId: task.taskId, error },
        "Task execution failed"
      );

      const session = this.interactionEngine.getCurrentSession();
      if (session) {
        session.status = "failed";
        session.errors.push(
          error instanceof Error ? error.message : String(error)
        );
      }

      throw error;
    }
  }

  /**
   * Automate design iteration (Figma, etc)
   */
  async automateDesignIteration(
    iteration: DesignIteration,
    page?: any
  ): Promise<DesignIteration> {
    if (!this.isInitialized) {
      throw new Error("Orchestrator not initialized");
    }

    const startTime = Date.now();

    try {
      this.logger.info(
        {
          iterationId: iteration.iterationId,
          application: iteration.application,
          steps: iteration.steps.length,
        },
        "Starting design iteration"
      );

      const session = await this.interactionEngine.initializeSession(
        iteration.projectName,
        iteration.application,
        page
      );

      // Process each design step
      for (const step of iteration.steps) {
        this.logger.debug({ stepId: step.stepId }, "Processing design step");

        try {
          // Take screenshot before change
          let beforeScreenshot: Screenshot | undefined;
          if (this.screenshotEngine) {
            try {
              const buffer = await page.screenshot();
              beforeScreenshot = await this.screenshotEngine.processScreenshot(
                buffer,
                iteration.application
              );
            } catch {
              // Screenshot optional
            }
          }

          // Execute design task (simplified implementation)
          // In production, would integrate with Figma API, design tools etc
          this.logger.info({ task: step.task }, "Executing design task");

          // Simulate design work
          await this.delay(1000);

          step.status = "completed";
          step.completedTime = Date.now() - startTime;

          // Mark requirement as completed if matched
          for (const req of iteration.requirements) {
            if (
              req.description.toLowerCase().includes(step.task.toLowerCase())
            ) {
              req.status = "completed";
            }
          }
        } catch (error) {
          this.logger.error(
            { stepId: step.stepId, error },
            "Design step failed"
          );
          step.status = "failed";
        }
      }

      // Calculate quality score
      const completedSteps = iteration.steps.filter(
        (s) => s.status === "completed"
      ).length;
      iteration.qualityScore = completedSteps / iteration.steps.length;
      iteration.iterations++;
      iteration.endTime = new Date();

      await this.interactionEngine.endSession();

      this.logger.info(
        {
          iterationId: iteration.iterationId,
          qualityScore: iteration.qualityScore.toFixed(2),
          duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s",
        },
        "Design iteration completed"
      );

      return iteration;
    } catch (error) {
      this.logger.error(
        { iterationId: iteration.iterationId, error },
        "Design iteration failed"
      );
      throw error;
    }
  }

  /**
   * Automate code generation workflow
   */
  async automateCodeGeneration(
    generation: CodeGeneration,
    page?: any
  ): Promise<CodeGeneration> {
    if (!this.isInitialized) {
      throw new Error("Orchestrator not initialized");
    }

    const startTime = Date.now();

    try {
      this.logger.info(
        {
          generationId: generation.generationId,
          sourceLanguage: generation.sourceLanguage,
          targetLanguage: generation.targetLanguage,
        },
        "Starting code generation"
      );

      await this.interactionEngine.initializeSession(
        generation.projectName,
        "vscode",
        page
      );

      generation.status = "generating";
      generation.iterations++;

      // Simulated code generation
      const generatedCode = `
// Generated code for ${generation.projectName}
// Target: ${generation.targetLanguage}
// Requirements: ${generation.requirements.join(", ")}

${generation.requirements.map((req) => `// ${req}`).join("\n")}

// TODO: Implement requirements
      `.trim();

      generation.generatedCode = generatedCode;
      generation.generatedFiles = [];

      // Generate individual files based on requirements
      for (let i = 0; i < Math.min(generation.requirements.length, 5); i++) {
        const fileName = `generated-${i + 1}.${this.getFileExtension(
          generation.targetLanguage
        )}`;

        generation.generatedFiles!.push({
          fileName,
          content: generatedCode, // Simplified
          language: generation.targetLanguage,
          lineCount: generatedCode.split("\n").length,
        });
      }

      // Set quality metrics
      generation.qualityMetrics = {
        codeQuality: 0.8,
        testCoverage: 0.6,
        documentation: 0.7,
        performance: 0.85,
      };

      generation.status = "completed";
      generation.endTime = new Date();

      await this.interactionEngine.endSession();

      this.logger.info(
        {
          generationId: generation.generationId,
          filesGenerated: generation.generatedFiles!.length,
          duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s",
        },
        "Code generation completed"
      );

      return generation;
    } catch (error) {
      this.logger.error(
        { generationId: generation.generationId, error },
        "Code generation failed"
      );
      generation.status = "failed";
      throw error;
    }
  }

  /**
   * Take screenshot and detect elements
   */
  async captureAndDetect(page?: any): Promise<{
    screenshot: Screenshot;
    elements: UIElement[];
  }> {
    if (!this.isInitialized) {
      throw new Error("Orchestrator not initialized");
    }

    try {
      const pageToUse = page;
      if (!pageToUse) {
        throw new Error("Page context required");
      }

      // Capture screenshot
      const buffer = await pageToUse.screenshot();
      const screenshot = await this.screenshotEngine.processScreenshot(
        buffer,
        "web"
      );

      // Detect elements from page
      const elements = await this.elementDetector.detectElementsFromPage(
        pageToUse
      );

      // Filter clickable elements
      const clickable = this.elementDetector.getClickableElements(elements);

      this.logger.debug(
        {
          elements: elements.length,
          clickable: clickable.length,
        },
        "Screenshot and elements captured"
      );

      return {
        screenshot,
        elements: clickable,
      };
    } catch (error) {
      this.logger.error({ error }, "Capture and detect failed");
      throw error;
    }
  }

  /**
   * Generate interaction plan from objective
   */
  async generateInteractionPlan(
    objective: string,
    elements: UIElement[]
  ): Promise<InteractionPlan> {
    const planId = `plan-${nanoid(12)}`;

    try {
      this.logger.info({ objective }, "Generating interaction plan");

      // Find relevant elements for objective
      const relevantElements = elements.filter((elem) =>
        this.isElementRelevantToObjective(elem, objective)
      );

      // Create sample steps
      const steps = relevantElements.slice(0, 5).map((elem, idx) => ({
        stepNumber: idx + 1,
        action: `click on "${elem.text || elem.label || "element"}"`,
        targetElementDescription: elem.text ||
          elem.label || `${elem.type} at (${elem.coordinates.x}, ${elem.coordinates.y})`,
        expectedResult: "Element becomes active or navigation occurs",
        confidence: elem.confidence,
        alternatives: [
          `Try using keyboard navigation`,
          `Scroll and retry`,
        ],
      }));

      const plan: InteractionPlan = {
        planId,
        objective,
        reasoning: `Plan generated for objective: ${objective}`,
        steps,
        estimatedSteps: steps.length,
        timeEstimate: steps.length * 2,
        riskFactors: relevantElements.length === 0 ? ["No relevant elements found"] : [],
        fallbackStrategies: [
          "Refresh page and retry",
          "Use alternative navigation path",
        ],
      };

      this.logger.debug(
        { planId, steps: steps.length },
        "Interaction plan generated"
      );

      return plan;
    } catch (error) {
      this.logger.error({ error }, "Plan generation failed");
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ComputerUseSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ComputerUseSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Terminate orchestrator
   */
  async terminate(): Promise<void> {
    try {
      await this.screenshotEngine.terminate();
      this.isInitialized = false;
      this.logger.info("Orchestrator terminated");
    } catch (error) {
      this.logger.error({ error }, "Error terminating orchestrator");
    }
  }

  /**
   * Check condition helper
   */
  private async checkCondition(
    condition: string,
    page: any
  ): Promise<boolean> {
    if (!page) return true;

    try {
      if (condition === "element-visible") {
        return true; // Would check actual visibility
      }
      if (condition.startsWith("text-contains:")) {
        const text = condition.substring("text-contains:".length);
        const pageText = await page.content();
        return pageText.includes(text);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is relevant to objective
   */
  private isElementRelevantToObjective(
    element: UIElement,
    objective: string
  ): boolean {
    const objLower = objective.toLowerCase();
    const elemText = (element.text || element.label || "").toLowerCase();

    return (
      element.isClickable &&
      element.isVisible &&
      (elemText.includes(objLower) ||
        objLower.includes(elemText) ||
        element.type === "button" ||
        element.type === "link")
    );
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: "ts",
      javascript: "js",
      python: "py",
      go: "go",
      rust: "rs",
    };

    return extensions[language] || "txt";
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get orchestrator stats
   */
  getStats(): Record<string, unknown> {
    const sessions = Array.from(this.sessions.values());
    const totalInteractions = sessions.reduce(
      (sum, s) => sum + s.interactionCount,
      0
    );
    const successRate =
      totalInteractions > 0
        ? (sessions.reduce((sum, s) => sum + s.successfulInteractions, 0) /
            totalInteractions) *
          100
        : 0;

    return {
      initialized: this.isInitialized,
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === "completed")
        .length,
      totalInteractions,
      successRate: successRate.toFixed(1) + "%",
      averageErrorsPerSession:
        sessions.length > 0
          ? (sessions.reduce((sum, s) => sum + s.errors.length, 0) /
              sessions.length).toFixed(1)
          : 0,
    };
  }
}
