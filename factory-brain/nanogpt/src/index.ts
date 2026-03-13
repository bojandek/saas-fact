export { NanoGPTModel } from './model';
export { NanoGPTTrainer } from './trainer';
export { NanoGPTInference } from './inference';

export type {
  ModelConfig,
  TrainingData,
  FineTuneConfig,
  TrainingResults,
  InferenceInput,
  InferenceOutput,
  ModelPerformance,
  ModelRegistry
} from './types';

export {
  ModelConfigSchema,
  TrainingDataSchema,
  FineTuneConfigSchema,
  TrainingResultsSchema,
  InferenceInputSchema,
  InferenceOutputSchema,
  ModelPerformanceSchema,
  ModelRegistrySchema
} from './types';

/**
 * nanoGPT Integration Module
 *
 * Custom AI model training and inference engine based on Karpathy's nanoGPT.
 * Provides production-grade features:
 * - Model training from scratch
 * - Fine-tuning with LoRA support
 * - Efficient inference with streaming
 * - Batch processing capabilities
 * - Performance monitoring and metrics
 */
