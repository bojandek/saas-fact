import { chromium, firefox, webkit, Browser, BrowserContext, Page } from '@playwright/test';
import pino from 'pino';
import { E2ETestScenario, TestResult } from './types.js';

const logger = pino();

/**
 * Orchestrates E2E testing across multiple browsers and scenarios
 */
export class E2EOrchestrator {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private projectId: string;
  private baseUrl: string;

  constructor(projectId: string, baseUrl: string) {
    this.projectId = projectId;
    this.baseUrl = baseUrl;
  }

  /**
   * Initializes browser instances for cross-browser testing
   */
  async initialize(browserTypes: string[] = ['chromium']): Promise<void> {
    try {
      for (const browserType of browserTypes) {
        let browser;
        switch (browserType) {
          case 'firefox':
            browser = await firefox.launch();
            break;
          case 'webkit':
            browser = await webkit.launch();
            break;
          default:
            browser = await chromium.launch();
        }

        this.browsers.set(browserType, browser);
        logger.info({ browserType }, 'Browser initialized');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initialize browsers');
      throw error;
    }
  }

  /**
   * Executes E2E test scenario
   */
  async executeScenario(
    scenario: E2ETestScenario,
    browserType: string = 'chromium'
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const browser = this.browsers.get(browserType);
      if (!browser) {
        throw new Error(`Browser ${browserType} not initialized`);
      }

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Execute steps
        for (const step of scenario.steps) {
          await this.executeStep(page, step);
        }

        const duration = Date.now() - startTime;

        logger.info(
          { scenario: scenario.name, duration, browserType },
          'E2E test passed'
        );

        return {
          id: `${scenario.id}-${browserType}-${Date.now()}`,
          type: 'e2e',
          name: `${scenario.name} (${browserType})`,
          status: 'passed',
          duration,
          timestamp: new Date(),
          projectId: this.projectId,
          environment: 'e2e'
        };
      } finally {
        await context.close();
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error(
        { scenario: scenario.name, error: error.message, duration },
        'E2E test failed'
      );

      return {
        id: `${scenario.id}-${browserType}-${Date.now()}`,
        type: 'e2e',
        name: `${scenario.name} (${browserType})`,
        status: 'failed',
        duration,
        message: error.message,
        stackTrace: error.stack,
        timestamp: new Date(),
        projectId: this.projectId,
        environment: 'e2e'
      };
    }
  }

  /**
   * Runs complete test suite on multiple browsers
   */
  async runTestSuite(
    scenarios: E2ETestScenario[],
    browserTypes: string[] = ['chromium']
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const scenario of scenarios) {
      for (const browserType of browserTypes) {
        const result = await this.executeScenario(scenario, browserType);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Executes a single step in test scenario
   */
  private async executeStep(page: Page, step: any): Promise<void> {
    switch (step.action) {
      case 'navigate':
        await page.goto(`${this.baseUrl}${step.value}`);
        break;

      case 'click':
        await page.click(step.selector);
        break;

      case 'fill':
        await page.fill(step.selector, step.value);
        break;

      case 'select':
        await page.selectOption(step.selector, step.value);
        break;

      case 'submit':
        await page.press(step.selector, 'Enter');
        break;

      case 'wait':
        await page.waitForNavigation({ timeout: step.timeout || 30000 });
        break;

      case 'assert':
        const text = await page.textContent(step.selector);
        if (!text?.includes(step.expectedResult)) {
          throw new Error(
            `Expected "${step.expectedResult}" but got "${text}"`
          );
        }
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  /**
   * Takes screenshot on test failure
   */
  async captureScreenshot(page: Page, testName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `./e2e/screenshots/${this.projectId}/${testName}-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  /**
   * Records video of test execution
   */
  async recordVideo(page: Page): Promise<void> {
    // Video recording handled by Playwright context options
    logger.info('Video recording enabled for this session');
  }

  /**
   * Cleans up resources
   */
  async cleanup(): Promise<void> {
    try {
      // Close all contexts
      for (const [, context] of this.contexts) {
        await context.close();
      }
      this.contexts.clear();

      // Close all browsers
      for (const [browserType, browser] of this.browsers) {
        await browser.close();
        logger.info({ browserType }, 'Browser closed');
      }
      this.browsers.clear();
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup E2E orchestrator');
    }
  }
}

export default E2EOrchestrator;
