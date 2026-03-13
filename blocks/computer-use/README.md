# CLI-Anything Computer Use

Enterprise-grade AI-powered UI automation platform with screenshot capture, OCR, element detection, and autonomous interaction workflows.

## Features

### 📸 Screenshot & OCR Engine
- **Intelligent Capture**: Screenshot web pages, desktop apps, or cloud applications
- **OCR Processing**: Extract text with 95%+ accuracy using Tesseract.js
- **Screenshot Comparison**: Detect changes between states
- **Optimization**: Automatic compression and storage optimization
- **Format Support**: PNG, JPEG, WebP with quality preservation

### 🎯 UI Element Detection
- **Smart Detection**: Identify clickable elements, forms, buttons, links
- **Accessibility Info**: Extract ARIA labels, roles, and semantic HTML
- **Confidence Scores**: Know how confident the model is about detections
- **Grouping**: Organize elements by type, position, or role
- **Modal Handling**: Detect and work within modal dialogs

### ⚙️ Interaction Engine
- **Click & Type**: Native element interactions with Playwright
- **Complex Workflows**: Multi-step automation sequences
- **Keyboard Support**: Key presses, shortcuts, navigation
- **Error Recovery**: Automatic fallback strategies
- **Session Management**: Track all interactions with timestamps

### 🤖 Orchestration
- **Task Execution**: Run predefined automation tasks
- **Design Iteration**: Automate design changes (Figma, Sketch, Adobe XD)
- **Code Generation**: Generate code from visual designs
- **Plan Generation**: AI-driven interaction planning
- **Error Handling**: Graceful failure recovery

## Installation

```bash
npm install @saas-factory/computer-use
```

## Quick Start

### Basic Element Detection

```typescript
import { ComputerUseOrchestrator } from "@saas-factory/computer-use";
import { chromium } from "playwright";

const orchestrator = new ComputerUseOrchestrator();
await orchestrator.initialize();

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://example.com");

// Capture and detect
const { screenshot, elements } = await orchestrator.captureAndDetect(page);

console.log(`Found ${elements.length} clickable elements`);
elements.forEach((elem) => {
  console.log(`- [${elem.type}] ${elem.text || elem.label}`);
});

await browser.close();
await orchestrator.terminate();
```

### Automate Task Execution

```typescript
import { ComputerUseOrchestrator, AutomationTask } from "@saas-factory/computer-use";

const task: AutomationTask = {
  taskId: "task-1",
  name: "Fill Contact Form",
  description: "Automatically fill and submit contact form",
  objective: "Submit form with user data",
  steps: [
    {
      stepId: "step-1",
      description: "Fill email field",
      expectedOutcome: "Email is entered",
      interactions: [
        {
          interactionId: "int-1",
          timestamp: new Date(),
          type: "click",
          target: emailField,
          confidence: 0.95,
        },
        {
          interactionId: "int-2",
          timestamp: new Date(),
          type: "type",
          value: "user@example.com",
          confidence: 0.95,
        },
      ],
    },
    // More steps...
  ],
  application: "chrome",
  priority: "high",
  maxRetries: 3,
  timeoutSeconds: 300,
  createdAt: new Date(),
  status: "pending",
};

const orchestrator = new ComputerUseOrchestrator();
await orchestrator.initialize();

const session = await orchestrator.executeTask(task, page);
console.log(`Task completed: ${session.tasksCompleted.length}/${task.steps.length}`);
```

### Design Iteration Automation

```typescript
const iteration: DesignIteration = {
  iterationId: "design-1",
  projectName: "Landing Page Update",
  description: "Update hero section design",
  requirements: [
    {
      id: "req-1",
      description: "Update hero headline",
      priority: "high",
      status: "pending",
    },
    {
      id: "req-2",
      description: "Change button colors",
      priority: "high",
      status: "pending",
    },
  ],
  steps: [
    {
      stepId: "step-1",
      task: "Edit hero headline text",
      estimatedTime: 5,
      status: "pending",
    },
    // More steps...
  ],
  application: "figma",
  iterations: 0,
  maxIterations: 5,
  startTime: new Date(),
};

const result = await orchestrator.automateDesignIteration(iteration, page);
console.log(`Quality Score: ${(result.qualityScore * 100).toFixed(0)}%`);
```

### Code Generation

```typescript
const generation: CodeGeneration = {
  generationId: "gen-1",
  projectName: "React Component",
  description: "Generate React button component",
  sourceLanguage: "figma",
  targetLanguage: "typescript",
  requirements: [
    "Create reusable button component",
    "Support loading state",
    "Add accessibility attributes",
  ],
  start Time: new Date(),
  status: "pending",
  iterations: 0,
};

const result = await orchestrator.automateCodeGeneration(generation, page);
console.log(`Generated ${result.generatedFiles?.length} files`);
result.generatedFiles?.forEach((file) => {
  console.log(`- ${file.fileName} (${file.lineCount} lines)`);
});
```

## Architecture

```
ComputerUseOrchestrator
├── ScreenshotEngine
│   ├── OCR Worker (Tesseract)
│   ├── Image Processor (Sharp)
│   ├── Screenshot Capture
│   ├── Comparison Engine
│   └── Optimization Pipeline
├── ElementDetector
│   ├── Page-based Detection
│   ├── OCR-based Detection
│   ├── Element Grouping
│   ├── Accessibility Info
│   └── Modal Handling
├── InteractionEngine
│   ├── Click Handler
│   ├── Type Handler
│   ├── Keyboard Handler
│   ├── Plan Executor
│   └── Session Manager
└── Orchestrator
    ├── Task Executor
    ├── Design Iteration Manager
    ├── Code Generator
    ├── Plan Generator
    └── Session Tracker
```

## Configuration

```typescript
interface DetectionConfig {
  enableOCR: boolean; // default: true
  enableElementDetection: boolean; // default: true
  enableAccessibilityInfo: boolean; // default: true
  confidenceThreshold: number; // 0-1, default: 0.7
  maxElements: number; // default: 1000
  ignoreInvisibleElements: boolean; // default: true
  detectImages: boolean; // default: true
  detectButtons: boolean; // default: true
  detectInputs: boolean; // default: true
  detectText: boolean; // default: true
  customSelectors?: string[]; // custom CSS selectors
}
```

## API Reference

### ComputerUseOrchestrator

```typescript
// Lifecycle
await orchestrator.initialize();
await orchestrator.terminate();

// Interaction
const { screenshot, elements } = await orchestrator.captureAndDetect(page);
const plan = await orchestrator.generateInteractionPlan(objective, elements);
const session = await orchestrator.executeTask(task, page);

// Design & Code
const iteration = await orchestrator.automateDesignIteration(design, page);
const generation = await orchestrator.automateCodeGeneration(code, page);

// Session info
const session = orchestrator.getSession(sessionId);
const allSessions = orchestrator.getAllSessions();
const stats = orchestrator.getStats();
```

### ScreenshotEngine

```typescript
// Lifecycle
await engine.initialize();
await engine.terminate();

// Screenshot operations
const screenshot = await engine.processScreenshot(buffer, appName);
const comparison = await engine.compareScreenshots(before, after);
const cropped = await engine.cropScreenshot(buffer, x, y, w, h);
const highlighted = await engine.highlightRegions(buffer, regions);
const hash = await engine.getScreenshotHash(buffer);
const optimized = await engine.optimizeScreenshot(buffer, quality);
```

### ElementDetector

```typescript
// Detection
const elements = await detector.detectElementsFromPage(page);
const elements = await detector.detectElementsFromScreenshot(ocrBlocks);

// Searching
const element = await detector.findElementByText(elements, "Click me");
const element = await detector.findElementAtCoordinates(elements, x, y);
const element = await detector.findClosestElement(elements, x, y, maxDistance);

// Filtering
const clickable = detector.getClickableElements(elements);
const visible = detector.getVisibleElements(elements);
const high = detector.getElementsByConfidence(elements, 0.8);
const forms = detector.getFormFields(elements);
const buttons = detector.getButtons(elements);
const links = detector.getLinks(elements);

// Utilities
const grouped = detector.groupElementsByType(elements);
const description = detector.generateElementDescriptor(element);
const summary = detector.generateClickableSummary(elements);
```

### InteractionEngine

```typescript
// Session management
const session = await engine.initializeSession(name, app, page);
await engine.click(element, page);
await engine.type(element, text, page);
await engine.pressKey(key, page);
const result = await engine.executePlan(plan, page, elements);
const session = await engine.endSession();

// Accessors
const history = engine.getInteractionHistory();
engine.clearHistory();
const current = engine.getCurrentSession();
engine.addError(error);
engine.addWarning(warning);
```

## Supported Applications

| Application | Support | Status |
| --- | --- | --- |
| Chrome/Chromium | Full | ✅ Supported |
| Firefox | Full | ✅ Supported |
| Safari | Full | ✅ Supported |
| Figma | Partial | ✅ API-based |
| VSCode | Full | ✅ Supported |
| Slack | Partial | ✅ Web-based |
| Adobe XD | Partial | ✅ API-based |
| Desktop Apps | Limited | ⚠️ Via screenshots |

## Use Cases

### 1. E-Commerce Testing
Automate end-to-end testing:
```typescript
// Checkout flow automation
const task = {
  name: "Complete Checkout",
  steps: [
    { task: "Add item to cart" },
    { task: "Navigate to checkout" },
    { task: "Fill shipping address" },
    { task: "Complete payment" },
  ],
};
```

### 2. Data Extraction
Extract data from websites:
```typescript
const { screenshot, elements } = await orchestrator.captureAndDetect(page);
const prices = await orchestrator.extractData(elements, "price");
const links = detector.getLinks(elements);
```

### 3. Design System Update
Automate design changes across Figma:
```typescript
const iteration = {
  projectName: "Design System Update",
  requirements: [
    { description: "Update primary color" },
    { description: "Adjust typography scale" },
  ],
};

const result = await orchestrator.automateDesignIteration(iteration, page);
```

### 4. Code Generation
Generate code from designs:
```typescript
const generation = {
  projectName: "React Components",
  sourceLanguage: "figma",
  targetLanguage: "typescript",
  requirements: ["Create button", "Create card"],
};

const result = await orchestrator.automateCodeGeneration(generation, page);
```

### 5. Cross-Browser Testing
Test on multiple browsers:
```typescript
for (const browser of ["chrome", "firefox", "safari"]) {
  const { page } = /* launch browser */;
  await orchestrator.executeTask(task, page);
}
```

## Performance Tips

### Optimize Element Detection
```typescript
// Use specific selectors
const config: DetectionConfig = {
  enableOCR: false, // Skip if not needed
  maxElements: 100, // Limit detections
  ignoreInvisibleElements: true,
  customSelectors: [".important-btn", ".action-item"],
};
```

### Batch Screenshot Processing
```typescript
// Process screenshots in batches
const screenshots = [];
for (let i = 0; i < 100; i++) {
  screenshots.push(await engine.processScreenshot(buffer));
  if (screenshots.length === 10) {
    await processAndClear(screenshots);
    screenshots.length = 0;
  }
}
```

### Error Handling
```typescript
try {
  await orchestrator.executeTask(task, page);
} catch (error) {
  if (error.message.includes("timeout")) {
    // Handle timeout
  } else if (error.message.includes("not found")) {
    // Handle element not found
  }
}
```

## Limitations

- OCR works best with high-quality images
- Element detection limited to visible elements
- Design tool integration requires API access
- Some desktop apps may require native integration
- Performance depends on browser capabilities

## Troubleshooting

### Elements Not Detected
- Ensure page has fully loaded
- Check confidence threshold setting
- Verify elements are visible
- Use OCR as fallback

### OCR Accuracy Low
- Improve image quality
- Use higher resolution screenshots
- Pre-process images
- Use custom language configs

### Interactions Failing
- Add delays between actions
- Verify element coordinates
- Use keyboard alternative
- Check element visibility

## Contributing

Issues and PRs welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

Proprietary - SaaS Factory © 2024
