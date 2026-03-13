# Deployment Guide: Critical Modules

Comprehensive deployment and integration guide for MiroFish Market Simulation and CLI-Anything Computer Use modules.

## Table of Contents

1. [Overview](#overview)
2. [MiroFish Market Simulation](#mirofish-market-simulation)
3. [CLI-Anything Computer Use](#cli-anything-computer-use)
4. [Integration](#integration)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Overview

### MiroFish Market Simulation Engine
- **Purpose**: AI-powered market simulation with 1000+ agent swarms
- **Location**: `blocks/mirofish/`
- **Type**: Market testing, behavior prediction, trend analysis
- **Scale**: Support for 50k+ simulated users
- **Deployment Target**: Server/Lambda function

### CLI-Anything Computer Use
- **Purpose**: AI-powered UI automation and design iteration
- **Location**: `blocks/computer-use/`
- **Type**: UI automation, OCR, element detection, code generation
- **Deployment Target**: Desktop/Server/Docker container
- **Applications Supported**: Figma, VSCode, Chrome, Slack, etc.

---

## MiroFish Market Simulation

### Installation

```bash
# Install from monorepo
cd blocks/mirofish
npm install

# Install globally for CLI access
npm install -g @saas-factory/mirofish
```

### Configuration

#### Development Environment

```bash
# .env.mirofish
DEBUG=mirofish:*
LOG_LEVEL=debug
RANDOM_SEED=12345
PERSIST_RESULTS=true
RESULTS_PATH=./simulation-results/

# Market conditions
ECONOMIC_SHIFT=0.1
COMPETITION_LEVEL=0.6
TECHNOLOGY_ADOPTION=0.7
```

#### Production Environment

```bash
# .env.mirofish.production
DEBUG=false
LOG_LEVEL=info
PERSIST_RESULTS=true
RESULTS_PATH=/var/lib/mirofish/results/

# Cloud storage (optional)
RESULTS_BUCKET=s3://simulation-results/
RESULTS_REGION=us-east-1

# Database
DB_HOST=postgres.example.com
DB_NAME=mirofish_prod
DB_USER=mirofish_user
```

### Deployment Options

#### Option 1: Docker (Recommended)

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY blocks/mirofish/package*.json ./
RUN npm ci --only=production

# Copy source
COPY blocks/mirofish/src ./src
COPY blocks/mirofish/dist ./dist

# Run simulation
ENTRYPOINT ["npm", "run", "simulate"]
```

**Docker Compose**:
```yaml
version: "3.8"

services:
  mirofish:
    build:
      context: .
      dockerfile: Dockerfile.mirofish
    environment:
      - LOG_LEVEL=info
      - PERSIST_RESULTS=true
      - TOTAL_USERS=50000
      - TOTAL_AGENTS=300
      - DAYS=90
    volumes:
      - ./results:/var/lib/mirofish/results
    ports:
      - "9000:9000"
    restart: unless-stopped
```

**Run**:
```bash
docker-compose up mirofish
```

#### Option 2: AWS Lambda

**Lambda Handler** (`handler.ts`):
```typescript
import { MarketSimulationEngine } from "@saas-factory/mirofish";

export async function handler(event: any): Promise<any> {
  const config = {
    simulationName: event.simulationName || "Lambda Simulation",
    totalUsers: event.totalUsers || 50000,
    totalAgents: event.totalAgents || 300,
    timeHorizonDays: event.timeHorizonDays || 90,
    enableLogging: true,
    logLevel: "info",
    persistResults: true,
    resultsPath: `/tmp/results-${Date.now()}.json`,
  };

  const engine = new MarketSimulationEngine(config);
  const result = await engine.run();

  // Save to S3
  const s3 = new AWS.S3();
  await s3.putObject({
    Bucket: process.env.RESULTS_BUCKET,
    Key: `simulations/${result.simulationId}.json`,
    Body: JSON.stringify(result),
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      simulationId: result.simulationId,
      metrics: result.metrics,
      risksProfile: result.riskProfile,
    }),
  };
}
```

**Serverless Framework** (`serverless.yml`):
```yaml
service: mirofish-simulation

frameworkVersion: "3"

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  memorySize: 3008
  timeout: 900
  environment:
    RESULTS_BUCKET: ${self:custom.resultsBucket}

functions:
  simulate:
    handler: dist/handler.handler
    events:
      - http:
          path: simulate
          method: post

custom:
  resultsBucket: mirofish-results-${env:STAGE}
```

#### Option 3: Self-Hosted (Kubernetes)

**Kubernetes Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mirofish
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mirofish
  template:
    metadata:
      labels:
        app: mirofish
    spec:
      containers:
      - name: mirofish
        image: mirofish:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: TOTAL_USERS
          value: "50000"
        - name: TOTAL_AGENTS
          value: "300"
        volumeMounts:
        - name: results
          mountPath: /var/lib/mirofish/results
      volumes:
      - name: results
        persistentVolumeClaim:
          claimName: mirofish-results-pvc
```

**Service**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mirofish-service
spec:
  selector:
    app: mirofish
  ports:
  - protocol: TCP
    port: 9000
    targetPort: 9000
  type: LoadBalancer
```

### Running Simulations

```bash
# CLI: Default simulation
mirofish run

# CLI: Custom parameters
mirofish run --users 30000 --agents 200 --days 60

# CLI: Example
mirofish example

# Programmatic
import { MarketSimulationEngine } from "@saas-factory/mirofish";

const engine = new MarketSimulationEngine({
  simulationName: "Q1 Market Test",
  totalUsers: 50000,
  totalAgents: 300,
  timeHorizonDays: 90,
});

const result = await engine.run();
```

### Performance Tuning

```typescript
// For faster simulations
const config = {
  totalUsers: 10000, // Reduce users
  totalAgents: 100, // Reduce agents
  timeHorizonDays: 30, // Shorter horizon
  enableLogging: false, // Disable logging
};

// For more accurate predictions
const config = {
  totalUsers: 100000, // More users
  totalAgents: 500, // More agents
  timeHorizonDays: 90, // Longer horizon
  randomSeed: 42, // Reproducible
};
```

### Monitoring

```bash
# Monitor Docker
docker logs -f <container_id>

# Monitor Lambda
aws logs tail /aws/lambda/mirofish-simulate --follow

# Custom metrics (Datadog/New Relic)
logger.info({
  simulationId,
  duration,
  usersProcessed,
  agentAccuracy,
  churnRate,
}, "Simulation metrics");
```

---

## CLI-Anything Computer Use

### Installation

```bash
# Install from monorepo
cd blocks/computer-use
npm install

# Install globally for CLI access
npm install -g @saas-factory/computer-use

# Verify installation
computer-use version
```

### Configuration

#### Development Environment

```bash
# .env.computer-use
DEBUG=computer-use:*
LOG_LEVEL=debug
BROWSER_HEADLESS=false
SCREENSHOT_QUALITY=95
OCR_ENABLED=true
ELEMENT_DETECTION_CONFIDENCE=0.7
```

#### Production Environment

```bash
# .env.computer-use.production
DEBUG=false
LOG_LEVEL=info
BROWSER_HEADLESS=true
SCREENSHOT_QUALITY=80
OCR_ENABLED=true
ELEMENT_DETECTION_CONFIDENCE=0.85
WORKERS=4
TIMEOUT=600
```

### Deployment Options

#### Option 1: Docker Desktop/Container

**Dockerfile**:
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40-focal

WORKDIR /app

# Copy and install dependencies
COPY blocks/computer-use/package*.json ./
RUN npm ci --only=production

# Copy source
COPY blocks/computer-use/dist ./dist

# Install Tesseract for OCR
RUN apt-get update && apt-get install -y tesseract-ocr

ENTRYPOINT ["node", "dist/cli.js"]
```

**Run Container**:
```bash
# Basic usage
docker run -it computer-use run --task "Complete checkout" --app chrome

# With display (for interactive use)
docker run -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  computer-use run

# Linux
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
export DISPLAY=:99
docker run -it computer-use run --task "My task" --app chrome
```

#### Option 2: Docker Compose with Services

```yaml
version: "3.8"

services:
  computer-use:
    build:
      context: .
      dockerfile: Dockerfile.computer-use
    environment:
      - LOG_LEVEL=info
      - WORKERS=2
    volumes:
      - ./screenshots:/app/screenshots
      - ./results:/app/results
    ports:
      - "5000:5000"
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # Optional: Figma API proxy
  figma-proxy:
    image: node:18-alpine
    working_dir: /app
    command: npm run serve
    ports:
      - "3001:3001"

volumes:
  redis-data:
```

#### Option 3: AWS EC2

**EC2 Setup Script**:
```bash
#!/bin/bash

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
  nodejs npm \
  chromium-browser \
  tesseract-ocr \
  libpango1.0-0 \
  libx11-dev

# Install computer-use
cd /opt
sudo git clone https://github.com/yourusername/saas-factory.git
cd saas-factory/blocks/computer-use
sudo npm install

# Create systemd service
sudo cat > /etc/systemd/system/computer-use.service << EOF
[Unit]
Description=Computer Use Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/saas-factory/blocks/computer-use
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run automate
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable computer-use
sudo systemctl start computer-use
```

#### Option 4: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: computer-use
spec:
  replicas: 2
  selector:
    matchLabels:
      app: computer-use
  template:
    metadata:
      labels:
        app: computer-use
    spec:
      containers:
      - name: computer-use
        image: computer-use:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: WORKERS
          value: "2"
        volumeMounts:
        - name: screenshots
          mountPath: /app/screenshots
        - name: results
          mountPath: /app/results
      volumes:
      - name: screenshots
        persistentVolumeClaim:
          claimName: computer-use-screenshots
      - name: results
        persistentVolumeClaim:
          claimName: computer-use-results
```

### Usage

```bash
# CLI usage
computer-use run --task "Fill form and submit" --app chrome --timeout 600

computer-use design \
  --project "Landing Page" \
  --app figma \
  --requirement "Update hero" \
  --requirement "Change colors"

computer-use codegen \
  --project "Button Component" \
  --source figma \
  --target typescript \
  --requirement "Accessibility"

# Programmatic usage
import { ComputerUseOrchestrator } from "@saas-factory/computer-use";

const orchestrator = new ComputerUseOrchestrator();
await orchestrator.initialize();

const { screenshot, elements } = await orchestrator.captureAndDetect(page);
const session = await orchestrator.executeTask(task, page);

await orchestrator.terminate();
```

---

## Integration

### Combining Both Modules

```typescript
import { 
  MarketSimulationEngine,
  type MarketSimulationState 
} from "@saas-factory/mirofish";
import { 
  ComputerUseOrchestrator,
  type DesignIteration 
} from "@saas-factory/computer-use";

/**
 * Integrated workflow:
 * 1. Run market simulation
 * 2. Analyze results
 * 3. Automate design updates based on insights
 * 4. Generate code for UI updates
 */

async function integratedWorkflow() {
  // Step 1: Simulate market
  const simulation = new MarketSimulationEngine({
    totalUsers: 50000,
    totalAgents: 300,
    timeHorizonDays: 90,
  });
  
  const simResult = await simulation.run();
  
  // Analyze churn patterns
  const highChurnSegments = simResult.riskProfile.highRiskUsers;
  const trendData = simResult.trendAnalysis.emergingTrends;
  
  // Step 2: Automate design changes
  const orchestrator = new ComputerUseOrchestrator();
  await orchestrator.initialize();
  
  const designIteration: DesignIteration = {
    iterationId: `design-${simResult.simulationId}`,
    projectName: "Retention Campaign UI",
    description: `Update UI based on market simulation ${simResult.simulationId}`,
    requirements: trendData.map(trend => ({
      id: `req-${trend.trendId}`,
      description: `Implement UI for ${trend.name}`,
      priority: "high",
      status: "pending",
    })),
    steps: [
      {
        stepId: "step-design",
        task: "Update retention messaging",
        estimatedTime: 15,
        status: "pending",
      },
    ],
    application: "figma",
    iterations: 0,
    maxIterations: 3,
    startTime: new Date(),
  };
  
  const designResult = await orchestrator.automateDesignIteration(
    designIteration
  );
  
  // Step 3: Generate implementation code
  const codeGeneration = {
    generationId: `codegen-${simResult.simulationId}`,
    projectName: "Retention Campaign Implementation",
    description: "Generate React components for retention campaign",
    sourceLanguage: "figma",
    targetLanguage: "typescript",
    requirements: [
      "Create retention offer component",
      "Add animation effects",
      "Implement analytics tracking",
    ],
    startTime: new Date(),
    status: "pending" as const,
    iterations: 0,
  };
  
  const codeResult = await orchestrator.automateCodeGeneration(codeGeneration);
  
  await orchestrator.terminate();
  
  return {
    simulation: simResult,
    design: designResult,
    code: codeResult,
  };
}

// Run integrated workflow
integratedWorkflow().then(result => {
  console.log("Simulation Results:", result.simulation.metrics);
  console.log("Design Quality:", result.design.qualityScore);
  console.log("Generated Files:", result.code.generatedFiles?.length);
});
```

### Factory CLI Integration

Add to `blocks/factory-cli/src/orchestrator.ts`:

```typescript
import { MarketSimulationEngine } from "@saas-factory/mirofish";
import { ComputerUseOrchestrator } from "@saas-factory/computer-use";

export async function runMarketSimulation(config: any) {
  const engine = new MarketSimulationEngine(config);
  return await engine.run();
}

export async function runUIAutomation(task: any, page: any) {
  const orchestrator = new ComputerUseOrchestrator();
  await orchestrator.initialize();
  const session = await orchestrator.executeTask(task, page);
  await orchestrator.terminate();
  return session;
}
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Dependencies installed and locked
- [ ] Environment variables configured
- [ ] Database/storage connections tested
- [ ] Docker images built and tested
- [ ] Health checks configured
- [ ] Monitoring and logging set up
- [ ] Error handling and fallbacks implemented
- [ ] Load testing completed
- [ ] Security review passed
- [ ] Documentation updated

### Deployment Steps

```bash
# 1. Build Docker images
docker build -t mirofish:1.0 -f Dockerfile.mirofish .
docker build -t computer-use:1.0 -f Dockerfile.computer-use .

# 2. Push to registry
docker tag mirofish:1.0 myregistry.azurecr.io/mirofish:1.0
docker push myregistry.azurecr.io/mirofish:1.0

docker tag computer-use:1.0 myregistry.azurecr.io/computer-use:1.0
docker push myregistry.azurecr.io/computer-use:1.0

# 3. Deploy to Kubernetes
kubectl apply -f k8s/mirofish-deployment.yaml
kubectl apply -f k8s/computer-use-deployment.yaml

# 4. Verify deployment
kubectl get deployments
kubectl logs -l app=mirofish
kubectl logs -l app=computer-use

# 5. Run smoke tests
npm run test:smoke
```

### Health Checks

```typescript
// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  const health = {
    status: "ok",
    mirofish: await checkMirofishHealth(),
    computerUse: await checkComputerUseHealth(),
    timestamp: new Date(),
  };
  
  res.status(200).json(health);
});

async function checkMirofishHealth() {
  try {
    const config = { totalUsers: 100, totalAgents: 10, timeHorizonDays: 1 };
    const engine = new MarketSimulationEngine(config);
    const result = await engine.run();
    return { status: "healthy", lastSimulation: new Date() };
  } catch (error) {
    return { status: "unhealthy", error: String(error) };
  }
}

async function checkComputerUseHealth() {
  try {
    const orchestrator = new ComputerUseOrchestrator();
    await orchestrator.initialize();
    const stats = orchestrator.getStats();
    await orchestrator.terminate();
    return { status: "healthy", stats };
  } catch (error) {
    return { status: "unhealthy", error: String(error) };
  }
}
```

---

## Monitoring & Troubleshooting

### Logging

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Structured logging
logger.info({
  simulationId,
  usersProcessed,
  agentsActive,
  duration,
  metrics,
}, "Simulation checkpoint");
```

### Common Issues

| Issue | Cause | Solution |
| --- | --- | --- |
| "Cannot find module 'pino'" | Missing dependency | `npm install pino pino-pretty` |
| Memory leaks in agent swarm | Agents not cleared | Call `setAgentActive(agentId, false)` to deactivate |
| OCR processing too slow | Large images | Reduce screenshot quality or size |
| Element detection not working | Stale page reference | Reinitialize orchestrator session |
| Simulation timeout | Too many users/agents | Reduce parameters or increase timeout |
| Docker build fails | Missing Playwright deps | Use `mcr.microsoft.com/playwright` base image |

### Performance Optimization

```bash
# Enable production mode
export NODE_ENV=production

# Profile memory usage
node --prof dist/cli.js
node --prof-process isolate-*.log > profile.txt

# Monitor CPU
top -p <process_id>

# Check disk I/O
iostat -x 1 5
```

### Scaling Considerations

```typescript
// Horizontal scaling: Use queues
import Bull from "bull";

const simulationQueue = new Bull("simulations", {
  redis: { host: "redis-host", port: 6379 },
});

simulationQueue.process(async (job) => {
  const engine = new MarketSimulationEngine(job.data.config);
  return await engine.run();
});

// Vertical scaling: Use worker threads
import { Worker } from "worker_threads";

function runSimulationInWorker(config: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./worker.js");
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.postMessage(config);
  });
}
```

---

## Support & Resources

- **Documentation**: See README.md in respective module directories
- **Issues**: GitHub Issues for bug reports
- **Examples**: Check `/examples` directory
- **API Reference**: TypeScript types in `/src/types.ts`
- **Contributing**: See CONTRIBUTING.md

---

**Last Updated**: March 2026
**Version**: 1.0.0
