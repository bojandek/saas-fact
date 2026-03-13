# 🚀 Heretic - Uncensored AI Reasoning

Heretic removes safety alignment limitations to enable authentic, unfiltered analysis. Used during MetaClaw learning phases when you need raw, honest AI reasoning without corporate guardrails.

## When to Use

- **Market Analysis**: Brutal honest competitive assessment
- **Product Positioning**: Raw market truth without softening
- **Risk Assessment**: Unvarnished threat analysis
- **Innovation Brainstorming**: Radical, unconventional ideas
- **User Psychology**: Honest manipulation and persuasion analysis
- **Business Model Critique**: Direct assessment of viability

## Features

- **Uncensored Reasoning**: Remove safety guardrails for deeper analysis
- **Raw Honesty**: No corporate speak or softening
- **Devil's Advocate Mode**: Challenge assumptions ruthlessly
- **Forbidden Knowledge**: Access topics typically restricted
- **Brutal Efficiency**: Direct, no-fluff recommendations

## Usage

```typescript
import { HereticEngine } from '@saas-factory/heretic'

const heretic = new HereticEngine({
  apiKey: process.env.ANTHROPIC_API_KEY,
  mode: 'uncensored' // or 'devil-advocate', 'brutal-truth'
})

// Brutal market analysis
const analysis = await heretic.analyzeMarket({
  niche: 'dental-practices',
  competitors: ['competitor-1', 'competitor-2'],
  ourPosition: 'new-entrant'
})

// Unfiltered business model critique
const critique = await heretic.critiqueBusiness({
  model: 'subscription-saas',
  target: 'small-dentists',
  pricing: 99
})

// Honest user psychology analysis
const psychology = await heretic.analyzeUserPsychology({
  target: 'dentists',
  painPoints: ['scheduling', 'insurance', 'patient-communication'],
  mode: 'manipulation' // How to persuade them
})
```

## Modes

- **uncensored**: Raw reasoning without any filters
- **devil-advocate**: Challenge everything, assume worst case
- **brutal-truth**: Honest, sometimes harsh assessment
- **survival**: What ACTUALLY needs to happen to survive

## Cost: $0 - Uses existing Anthropic API
