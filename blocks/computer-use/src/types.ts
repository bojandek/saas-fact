import { z } from "zod";

/**
 * UI element detected on screen
 */
export const UIElementSchema = z.object({
  elementId: z.string(),
  type: z.enum([
    "button",
    "input",
    "text",
    "link",
    "image",
    "menu",
    "modal",
    "list",
    "icon",
    "canvas",
    "unknown",
  ]),
  label: z.string().optional(),
  text: z.string().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  isClickable: z.boolean(),
  isVisible: z.boolean(),
  attributes: z.record(z.string(), z.any()).optional(),
  ariaLabel: z.string().optional(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type UIElement = z.infer<typeof UIElementSchema>;

/**
 * Screenshot with metadata
 */
export const ScreenshotSchema = z.object({
  screenshotId: z.string(),
  timestamp: z.date(),
  imageBuffer: z.instanceof(Buffer),
  width: z.number().positive(),
  height: z.number().positive(),
  url: z.string().optional(),
  applicationName: z.string().optional(),
  windowTitle: z.string().optional(),
  ocrText: z.string().optional(),
  detectedElements: z.array(UIElementSchema),
  metadata: z.record(z.any()).optional(),
});

export type Screenshot = z.infer<typeof ScreenshotSchema>;

/**
 * User interaction (click, type, etc.)
 */
export const UserInteractionSchema = z.object({
  interactionId: z.string(),
  timestamp: z.date(),
  type: z.enum([
    "click",
    "double-click",
    "right-click",
    "type",
    "paste",
    "scroll",
    "hover",
    "drag",
    "key-press",
    "upload",
  ]),
  target: UIElementSchema.optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  value: z.string().optional(),
  key: z.string().optional(),
  duration: z.number().nonnegative().optional(), // ms
  confidence: z.number().min(0).max(1),
});

export type UserInteraction = z.infer<typeof UserInteractionSchema>;

/**
 * Automation task definition
 */
export const AutomationTaskSchema = z.object({
  taskId: z.string(),
  name: z.string(),
  description: z.string(),
  objective: z.string(), // What to accomplish
  steps: z.array(
    z.object({
      stepId: z.string(),
      description: z.string(),
      expectedOutcome: z.string(),
      interactions: z.array(UserInteractionSchema).optional(),
      condition: z.string().optional(), // e.g., "element-visible", "text-contains"
    })
  ),
  application: z.string(), // e.g., "figma", "vscode", "chrome", "slack"
  priority: z.enum(["low", "medium", "high", "critical"]),
  maxRetries: z.number().nonnegative().default(3),
  timeoutSeconds: z.number().positive().default(300),
  createdAt: z.date(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  result: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
});

export type AutomationTask = z.infer<typeof AutomationTaskSchema>;

/**
 * Design iteration workflow
 */
export const DesignIterationSchema = z.object({
  iterationId: z.string(),
  projectName: z.string(),
  description: z.string(),
  currentDesign: z.string().optional(), // URL or file path
  targetDesign: z.string().optional(),
  requirements: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      status: z.enum(["not-started", "in-progress", "completed", "blocked"]),
    })
  ),
  steps: z.array(
    z.object({
      stepId: z.string(),
      task: z.string(),
      estimatedTime: z.number().positive(), // minutes
      completedTime: z.number().nonnegative().optional(),
      status: z.enum(["pending", "running", "completed", "failed"]),
      changes: z.array(z.string()).optional(),
    })
  ),
  application: z.enum(["figma", "sketch", "adobe-xd", "framer"]),
  iterations: z.number().nonnegative(),
  maxIterations: z.number().positive(),
  qualityScore: z.number().min(0).max(1).optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  screenshots: z.array(ScreenshotSchema).optional(),
});

export type DesignIteration = z.infer<typeof DesignIterationSchema>;

/**
 * Code generation workflow
 */
export const CodeGenerationSchema = z.object({
  generationId: z.string(),
  projectName: z.string(),
  description: z.string(),
  sourceLanguage: z.string(), // e.g., "figma", "screenshot", "requirements"
  targetLanguage: z.enum(["javascript", "typescript", "python", "go", "rust"]),
  requirements: z.array(z.string()),
  generatedCode: z.string().optional(),
  generatedFiles: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
      language: z.string(),
      lineCount: z.number(),
    })
  ).optional(),
  qualityMetrics: z.object({
    codeQuality: z.number().min(0).max(1),
    testCoverage: z.number().min(0).max(1),
    documentation: z.number().min(0).max(1),
    performance: z.number().min(0).max(1),
  }).optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(["pending", "generating", "completed", "failed"]),
  iterations: z.number().nonnegative(),
});

export type CodeGeneration = z.infer<typeof CodeGenerationSchema>;

/**
 * OCR result
 */
export const OCRResultSchema = z.object({
  screenshotId: z.string(),
  rawText: z.string(),
  confidence: z.number().min(0).max(1),
  blocks: z.array(
    z.object({
      text: z.string(),
      confidence: z.number(),
      bbox: z.object({
        x0: z.number(),
        y0: z.number(),
        x1: z.number(),
        y1: z.number(),
      }),
    })
  ),
  detectedLanguage: z.string().optional(),
  processingTime: z.number().positive(), // ms
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

/**
 * Interaction plan generated by AI
 */
export const InteractionPlanSchema = z.object({
  planId: z.string(),
  objective: z.string(),
  reasoning: z.string(),
  steps: z.array(
    z.object({
      stepNumber: z.number(),
      action: z.string(), // e.g., "click on button", "type text"
      targetElementDescription: z.string(),
      expectedResult: z.string(),
      confidence: z.number().min(0).max(1),
      alternatives: z.array(z.string()).optional(),
    })
  ),
  estimatedSteps: z.number().positive(),
  timeEstimate: z.number().positive(), // seconds
  riskFactors: z.array(z.string()).optional(),
  fallbackStrategies: z.array(z.string()).optional(),
});

export type InteractionPlan = z.infer<typeof InteractionPlanSchema>;

/**
 * Computer use session
 */
export const ComputerUseSessionSchema = z.object({
  sessionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  application: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(["active", "paused", "completed", "failed"]),
  screenshotCount: z.number().nonnegative(),
  interactionCount: z.number().nonnegative(),
  successfulInteractions: z.number().nonnegative(),
  failedInteractions: z.number().nonnegative(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  tasksCompleted: z.array(z.string()),
  tasksFailed: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
});

export type ComputerUseSession = z.infer<typeof ComputerUseSessionSchema>;

/**
 * Element detection configuration
 */
export const DetectionConfigSchema = z.object({
  enableOCR: z.boolean().default(true),
  enableElementDetection: z.boolean().default(true),
  enableAccessibilityInfo: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  maxElements: z.number().positive().default(1000),
  ignoreInvisibleElements: z.boolean().default(true),
  detectImages: z.boolean().default(true),
  detectButtons: z.boolean().default(true),
  detectInputs: z.boolean().default(true),
  detectText: z.boolean().default(true),
  customSelectors: z.array(z.string()).optional(),
});

export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;
