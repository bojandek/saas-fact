# nanoGPT Integration Module

Custom AI model training and inference engine for SaaS Factory, based on Karpathy's nanoGPT architecture.

## Features

- **Model Training**: Train custom language models from scratch
- **Fine-tuning**: Adapt pre-trained models with LoRA and quantization
- **Efficient Inference**: Streaming and batch generation support
- **Performance Monitoring**: Track throughput, latency, and resource usage
- **Model Registry**: Version and deploy multiple models

## Installation

```bash
pnpm install @saas-factory/nanogpt
```

## Quick Start

### Train a Custom Model

```typescript
import { NanoGPTModel, NanoGPTTrainer } from '@saas-factory/nanogpt';

const modelConfig = {
  modelName: 'my-custom-gpt',
  modelType: 'gpt' as const,
  nLayers: 8,
  nHeads: 8,
  dModel: 512,
  epochs: 10,
  batchSize: 64
};

const trainingData = {
  datasetPath: './data/training.txt',
  splitRatios: {
    train: 0.8,
    validation: 0.1,
    test: 0.1
  }
};

const trainer = new NanoGPTTrainer(modelConfig, trainingData);
const results = await trainer.train();

console.log('Model trained!');
console.log(`Final loss: ${results.metrics.finalTrainLoss}`);
console.log(`Tokens/sec: ${results.metrics.tokensPerSecond}`);
```

### Fine-tune a Model

```typescript
import { NanoGPTTrainer } from '@saas-factory/nanogpt';

const finetuneConfig = {
  baseModel: 'gpt2',
  taskType: 'classification' as const,
  lora: {
    rank: 8,
    alpha: 16,
    dropout: 0.05
  },
  quantization: true,
  mixedPrecision: true
};

const trainer = new NanoGPTTrainer(modelConfig, trainingData);
const results = await trainer.fineTune('./models/gpt2', finetuneConfig);
```

### Use for Inference

```typescript
import { NanoGPTInference } from '@saas-factory/nanogpt';

const inference = new NanoGPTInference('./models/my-custom-gpt');
await inference.initialize();

// Generate text
const result = await inference.generate({
  inputs: 'Once upon a time',
  maxTokens: 100,
  temperature: 0.8,
  topP: 0.9,
  doSample: true
});

console.log(result.output);
console.log(`Generated in ${result.inferenceTime}ms`);
```

### Batch Processing

```typescript
const prompts = [
  'The future of AI is',
  'Machine learning enables',
  'Deep learning revolutionizes'
];

const outputs = await inference.batchGenerate(prompts, {
  temperature: 0.7,
  topP: 0.95
});

outputs.forEach((output, i) => {
  console.log(`Prompt ${i}: ${output.output}`);
});
```

### Streaming Generation

```typescript
for await (const token of inference.streamGenerate('Hello')) {
  process.stdout.write(token + ' ');
}
console.log('\n[Complete]');
```

## API Reference

### NanoGPTModel

- `load()` - Load pre-trained model
- `initializeTokenizer(vocabPath)` - Initialize tokenizer
- `export(outputPath, format)` - Export model to file
- `getConfig()` - Get model configuration
- `getInfo()` - Get model information

### NanoGPTTrainer

- `train()` - Train model from scratch
- `fineTune(baseModelPath, config)` - Fine-tune pre-trained model
- `evaluate()` - Evaluate model on validation set

### NanoGPTInference

- `initialize()` - Load model for inference
- `generate(input)` - Generate text from prompt
- `batchGenerate(prompts, config)` - Generate from multiple prompts
- `streamGenerate(prompt, config)` - Stream token generation
- `cleanup()` - Release resources

## Configuration

### Model Config

```typescript
interface ModelConfig {
  modelName: string;
  modelType: 'gpt' | 'bert' | 'custom';
  vocabSize: number;
  nLayers: number;
  nHeads: number;
  dModel: number;
  dFF: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
  warmupSteps: number;
  // ... more options
}
```

## Performance Tuning

- **Batch Size**: Increase for throughput, decrease for memory
- **Quantization**: Enable for 4x inference speedup
- **Mixed Precision**: Use fp16 for faster training/inference
- **LoRA Rank**: Lower rank = faster, higher rank = better accuracy

## Production Guidelines

- Always validate input with Zod schemas
- Monitor GPU memory usage
- Save checkpoints regularly during training
- Use quantization for deployment
- Implement rate limiting for inference
- Log all inference requests and latencies
- Test fine-tuned models before production

## Benchmarks

On NVIDIA A100 GPU:
- Training: ~2000 tokens/sec (batch size 64)
- Inference: ~5000 tokens/sec (batch size 1)
- Latency: 0.2ms per token average

## References

- [nanoGPT by Andrej Karpathy](https://github.com/karpathy/nanoGPT)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [LoRA: Low-Rank Adaptation](https://arxiv.org/abs/2106.09685)
