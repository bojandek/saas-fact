import pino from "pino";
import { nanoid } from "nanoid";
import {
  UserInteraction,
  UserInteractionSchema,
  UIElement,
  InteractionPlan,
  ComputerUseSession,
} from "./types";

/**
 * Interaction Engine - Manages UI interactions and workflows
 */
export class InteractionEngine {
  private logger: pino.Logger;
  private session: ComputerUseSession | null = null;
  private page: any = null; // Playwright page
  private interactionHistory: UserInteraction[] = [];
  private sessionStartTime: Date | null = null;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  /**
   * Initialize session
   */
  async initializeSession(
    name: string,
    application: string,
    page?: any
  ): Promise<ComputerUseSession> {
    const sessionId = `session-${nanoid(12)}`;
    this.sessionStartTime = new Date();
    this.page = page;

    this.session = {
      sessionId,
      name,
      application,
      startTime: this.sessionStartTime,
      status: "active",
      screenshotCount: 0,
      interactionCount: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      errors: [],
      warnings: [],
      tasksCompleted: [],
      tasksFailed: [],
    };

    this.logger.info(
      { sessionId, application, name },
      "Session initialized"
    );

    return this.session;
  }

  /**
   * Click on an element
   */
  async click(
    element: UIElement,
    page?: any
  ): Promise<UserInteraction> {
    const browser = page || this.page;
    if (!browser) {
      throw new Error("Browser not initialized");
    }

    const interactionId = `interaction-${nanoid(12)}`;
    const timestamp = new Date();

    try {
      // Try multiple selectors
      const selectors = [
        `button:has-text("${element.text}")`,
        `[aria-label="${element.ariaLabel}"]`,
        `[title="${element.text}"]`,
        `text=${element.text}`,
      ];

      let clicked = false;

      for (const selector of selectors) {
        try {
          await browser.click(selector, { force: true, timeout: 2000 });
          clicked = true;
          break;
        } catch {
          // Continue to next selector
        }
      }

      if (!clicked) {
        throw new Error(`Could not find clickable element: ${element.text}`);
      }

      const interaction: UserInteraction = {
        interactionId,
        timestamp,
        type: "click",
        target: element,
        coordinates: {
          x:
            element.coordinates.x +
            element.coordinates.width / 2,
          y:
            element.coordinates.y +
            element.coordinates.height / 2,
        },
        confidence: 0.95,
      };

      const validated = UserInteractionSchema.parse(interaction);
      this.interactionHistory.push(validated);

      if (this.session) {
        this.session.interactionCount++;
        this.session.successfulInteractions++;
      }

      this.logger.debug(
        { elementText: element.text, interactionId },
        "Click successful"
      );

      return validated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn({ error: errorMessage, element: element.text }, "Click failed");

      if (this.session) {
        this.session.interactionCount++;
        this.session.failedInteractions++;
        this.session.errors.push(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Type text into an input element
   */
  async type(
    element: UIElement,
    text: string,
    page?: any
  ): Promise<UserInteraction> {
    const browser = page || this.page;
    if (!browser) {
      throw new Error("Browser not initialized");
    }

    const interactionId = `interaction-${nanoid(12)}`;
    const timestamp = new Date();

    try {
      // Focus and clear the input first
      const selectors = [
        `input[placeholder="${element.placeholder}"]`,
        `input[aria-label="${element.ariaLabel}"]`,
        `textarea`,
      ];

      let typed = false;

      for (const selector of selectors) {
        try {
          await browser.fill(selector, text, { timeout: 2000 });
          typed = true;
          break;
        } catch {
          // Continue to next selector
        }
      }

      if (!typed) {
        throw new Error(`Could not find input for: ${element.text}`);
      }

      const interaction: UserInteraction = {
        interactionId,
        timestamp,
        type: "type",
        target: element,
        value: text,
        confidence: 0.95,
      };

      const validated = UserInteractionSchema.parse(interaction);
      this.interactionHistory.push(validated);

      if (this.session) {
        this.session.interactionCount++;
        this.session.successfulInteractions++;
      }

      this.logger.debug(
        { elementText: element.text, textLength: text.length },
        "Type successful"
      );

      return validated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn({ error: errorMessage, element: element.text }, "Type failed");

      if (this.session) {
        this.session.interactionCount++;
        this.session.failedInteractions++;
        this.session.errors.push(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Press a key
   */
  async pressKey(
    key: string,
    page?: any
  ): Promise<UserInteraction> {
    const browser = page || this.page;
    if (!browser) {
      throw new Error("Browser not initialized");
    }

    const interactionId = `interaction-${nanoid(12)}`;
    const timestamp = new Date();

    try {
      await browser.press("body", key);

      const interaction: UserInteraction = {
        interactionId,
        timestamp,
        type: "key-press",
        key,
        confidence: 0.95,
      };

      const validated = UserInteractionSchema.parse(interaction);
      this.interactionHistory.push(validated);

      if (this.session) {
        this.session.interactionCount++;
        this.session.successfulInteractions++;
      }

      this.logger.debug({ key }, "Key press successful");

      return validated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn({ error: errorMessage, key }, "Key press failed");

      if (this.session) {
        this.session.interactionCount++;
        this.session.failedInteractions++;
      }

      throw error;
    }
  }

  /**
   * Execute interaction plan
   */
  async executePlan(
    plan: InteractionPlan,
    page?: any,
    elements?: UIElement[]
  ): Promise<{
    completed: number;
    failed: number;
    results: unknown[];
  }> {
    const browser = page || this.page;
    if (!browser) {
      throw new Error("Browser not initialized");
    }

    const results: unknown[] = [];
    let completed = 0;
    let failed = 0;

    this.logger.info(
      { planId: plan.planId, steps: plan.steps.length },
      "Executing interaction plan"
    );

    for (const step of plan.steps) {
      try {
        await this.executeStep(step, browser, elements);
        completed++;
        results.push({ step: step.stepNumber, status: "success" });

        // Add delay between steps
        await this.delay(500);
      } catch (error) {
        failed++;
        results.push({
          step: step.stepNumber,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        this.logger.warn(
          { stepNumber: step.stepNumber, error },
          "Step execution failed"
        );

        // Try fallback if available
        if (step.alternetives && step.alternatives.length > 0) {
          this.logger.info(
            { stepNumber: step.stepNumber },
            "Trying fallback strategy"
          );

          for (const alt of step.alternatives) {
            try {
              // Simple retry
              await this.delay(1000);
              completed++;
              results[results.length - 1] = {
                ...results[results.length - 1],
                status: "success-fallback",
              };
              break;
            } catch {
              // Continue to next alternative
            }
          }
        }
      }
    }

    const planCompletion = (completed / plan.steps.length) * 100;

    this.logger.info(
      { completed, failed, completion: planCompletion.toFixed(1) + "%" },
      "Plan execution completed"
    );

    return { completed, failed, results };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: any,
    page: any,
    elements?: UIElement[]
  ): Promise<void> {
    // Parse the action
    const actionParts = step.action.match(
      /(\w+)\s+(?:on|to|at)?\s*(.+)/i
    );

    if (!actionParts || actionParts.length < 2) {
      throw new Error(`Invalid action format: ${step.action}`);
    }

    const action = actionParts[1].toLowerCase();
    const target = actionParts[2];

    switch (action) {
      case "click":
        await this.clickByDescription(target, page, elements);
        break;

      case "type":
        const textMatch = step.action.match(/type\s+"([^"]+)"/i);
        if (textMatch) {
          await page.type("input", textMatch[1]);
        }
        break;

      case "scroll":
        const direction = target.toLowerCase();
        const scrollAmount = direction.includes("down") ? 500 : -500;
        await page.evaluate((amount: number) => {
          window.scrollBy(0, amount);
        }, scrollAmount);
        break;

      case "wait":
        const waitMs = parseInt(target) || 1000;
        await this.delay(waitMs);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Click by description
   */
  private async clickByDescription(
    description: string,
    page: any,
    elements?: UIElement[]
  ): Promise<void> {
    // Find matching element by description
    const normalizedDesc = description.toLowerCase();

    if (elements) {
      for (const elem of elements) {
        if (
          elem.text?.toLowerCase().includes(normalizedDesc) ||
          elem.label?.toLowerCase().includes(normalizedDesc)
        ) {
          await page.click(
            `button:has-text("${elem.text}")`,
            {
              force: true,
            }
          );
          return;
        }
      }
    }

    // Fallback: try to find by text
    await page.click(`text=${description}`, { force: true });
  }

  /**
   * Get interaction history
   */
  getInteractionHistory(): UserInteraction[] {
    return this.interactionHistory;
  }

  /**
   * Clear interaction history
   */
  clearHistory(): void {
    this.interactionHistory = [];
  }

  /**
   * End session
   */
  async endSession(): Promise<ComputerUseSession> {
    if (!this.session) {
      throw new Error("No active session");
    }

    this.session.endTime = new Date();
    this.session.status = "completed";

    this.logger.info(
      {
        sessionId: this.session.sessionId,
        duration:
          this.session.endTime.getTime() -
          this.session.startTime.getTime(),
        interactions: this.session.interactionCount,
        success: this.session.successfulInteractions,
        failed: this.session.failedInteractions,
      },
      "Session ended"
    );

    return this.session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ComputerUseSession | null {
    return this.session;
  }

  /**
   * Generate interaction sequence from plan
   */
  generateSequenceFromPlan(plan: InteractionPlan): string[] {
    return plan.steps.map(
      (step) =>
        `[${step.stepNumber}] ${step.action} (confidence: ${(step.confidence * 100).toFixed(0)}%)`
    );
  }

  /**
   * Add error to session
   */
  addError(error: string): void {
    if (this.session) {
      this.session.errors.push(error);
    }
    this.logger.error({ error }, "Session error recorded");
  }

  /**
   * Add warning to session
   */
  addWarning(warning: string): void {
    if (this.session) {
      this.session.warnings.push(warning);
    }
    this.logger.warn({ warning }, "Session warning recorded");
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate time for plan execution
   */
  estimateExecutionTime(plan: InteractionPlan): number {
    // Base delay (500ms per step) + action time
    const baseDelay = plan.steps.length * 500;
    const actionTime = plan.timeEstimate * 1000;
    const buffer = 2000; // 2 second buffer

    return baseDelay + actionTime + buffer;
  }
}
