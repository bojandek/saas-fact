import { z } from 'zod';

// Model Configuration Schema
export const ModelConfigSchema = z.object({
  modelName: z.string().describe('Model identifier (e.g., gpt2, distilbert)'),
  modelType: z.enum(['gpt', 'bert', 'custom']).describe('Type of model architecture'),
  vocabSize: z.number().positive().default(50257),
  maxTokens: z.number().positive().default(1024),
  nLayers: z.number().positive().default(12),
  nHeads: z.number().positive().default(12),
  dModel: z.number().positive().default(768),
  dFF: z.number().positive().default(3072),
  dropout: z.number().min(0).max(1).default(0.1),
  learningRate: z.number().positive().default(0.0001),
  warmupSteps: z.number().nonnegative().default(1000),
  batchSize: z.number().positive().default(32),
  epochs: z.number().positive().default(3),
  saveInterval: z.number().positive().default(1000),
  evalInterval: z.number().positive().default(500)
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Training Data Schema
export const TrainingDataSchema = z.object({
  datasetPath: z.string(),
  splitRatios: z.object({
    train: z.number().min(0).max(1),
    validation: z.number().min(0).max(1),
    test: z.number().min(0).max(1)
  }).refine((data: any) => data.train + data.validation + data.test === 1, {
    message: 'Split ratios must sum to 1'
  }),
  maxSamples: z.number().positive().optional(),
  tokenizer: z.enum(['bpe', 'wordpiece', 'sentencepiece']).default('bpe'),
  preprocessingSteps: z.array(z.string()).optional()
});

export type TrainingData = z.infer<typeof TrainingDataSchema>;

// Fine-tuning Schema
export const FineTuneConfigSchema = z.object({
  baseModel: z.string().describe('Base model to fine-tune'),
  taskType: z.enum(['classification', 'generation', 'qa', 'translation']),
  numLabels: z.number().positive().optional(),
  lora: z.object({
    rank: z.number().positive().default(8),
    alpha: z.number().positive().default(16),
    dropout: z.number().min(0).max(1).default(0.05)
  }).optional(),
  quantization: z.boolean().default(false),
  mixedPrecision: z.boolean().default(true)
});

export type FineTuneConfig = z.infer<typeof FineTuneConfigSchema>;

// Training Results Schema
export const TrainingResultsSchema = z.object({
  modelId: z.string().uuid(),
  modelName: z.string(),
  timestamp: z.date(),
  config: ModelConfigSchema,
  metrics: z.object({
    finalTrainLoss: z.number(),
    finalValLoss: z.number(),
    trainAccuracy: z.number().optional(),
    valAccuracy: z.number().optional(),
    trainDuration: z.number().positive(),
    gpuMemoryUsed: z.number().optional(),
    tokensPerSecond: z.number().positive()
  }),
  checkpoints: z.array(z.object({
    step: z.number(),
    path: z.string(),
    loss: z.number(),
    timestamp: z.date()
  })),
  bestModel: z.object({
    path: z.string(),
    step: z.number(),
    loss: z.number()
  })
});

export type TrainingResults = z.infer<typeof TrainingResultsSchema>;

// Inference Schema
export const InferenceInputSchema = z.object({
  inputs: z.string().or(z.array(z.string())),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().positive().optional(),
  repetitionPenalty: z.number().positive().default(1.0),
  doSample: z.boolean().default(true),
  numReturnSequences: z.number().positive().default(1)
});

export type InferenceInput = z.infer<typeof InferenceInputSchema>;

export const InferenceOutputSchema = z.object({
  input: z.string(),
  output: z.string(),
  tokens: z.number(),
  inferenceTime: z.number().positive(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional()
});

export type InferenceOutput = z.infer<typeof InferenceOutputSchema>;

// Model Performance Schema
export const ModelPerformanceSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  timestamp: z.date(),
  metrics: z.object({
    throughput: z.number().positive().describe('Tokens per second'),
    latency: z.number().positive().describe('Average inference time in ms'),
    memoryUsage: z.number().positive().describe('Peak memory in MB'),
    p95Latency: z.number().positive(),
    p99Latency: z.number().positive(),
    errorRate: z.number().min(0).max(1)
  }),
  test: z.string().optional()
});

export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;

// Model Registry Schema
export const ModelRegistrySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  version: z.string().semver(),
  baseModel: z.string(),
  taskType: z.string(),
  accuracy: z.number().min(0).max(1),
  size: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  author: z.string(),
  tags: z.array(z.string()),
  modelPath: z.string(),
  isProduction: z.boolean().default(false),
  deployments: z.array(z.object({
    environment: z.string(),
    deployedAt: z.date(),
    version: z.string()
  })).default([])
});

export type ModelRegistry = z.infer<typeof ModelRegistrySchema>;
