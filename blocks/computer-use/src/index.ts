/**
 * CLI-Anything Computer Use Module
 *
 * Comprehensive UI automation platform featuring:
 * - AI-powered screenshot capture and OCR
 * - Intelligent UI element detection
 * - Autonomous interaction workflows
 * - Design iteration automation (Figma, Sketch, etc)
 * - Code generation from visual designs
 */

export { ScreenshotEngine } from "./screenshot-engine";
export { ElementDetector } from "./element-detector";
export { InteractionEngine } from "./interaction-engine";
export { ComputerUseOrchestrator } from "./orchestrator";

// Types exports
export type {
  UIElement,
  Screenshot,
  UserInteraction,
  AutomationTask,
  DesignIteration,
  CodeGeneration,
  OCRResult,
  InteractionPlan,
  ComputerUseSession,
  DetectionConfig,
} from "./types";

export {
  UIElementSchema,
  ScreenshotSchema,
  UserInteractionSchema,
  AutomationTaskSchema,
  DesignIterationSchema,
  CodeGenerationSchema,
  OCRResultSchema,
  InteractionPlanSchema,
  ComputerUseSessionSchema,
  DetectionConfigSchema,
} from "./types";
