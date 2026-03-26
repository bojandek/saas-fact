// @ts-nocheck
import { getLLMClient, CLAUDE_MODELS } from './llm/client';
import { WarRoomOrchestrator } from './war-room-orchestrator';
import { logger } from './utils/logger';
import { RAGSystem } from './rag';

export interface PricingTier {
  name: string;
  price: number | 'custom';
  annualDiscount: number;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

export interface PricingStrategy {
  niche: string;
  model: string;
  rationale: string;
  tiers: PricingTier[];
  freemiumRecommended: boolean;
  trialDays: number;
  insights: string[];
}

export class PricingIntelligenceAgent {
  private llm = getLLMClient();
  private ragSystem: RAGSystem;
  private orchestrator?: WarRoomOrchestrator;

  constructor(orchestrator?: WarRoomOrchestrator) {
    this.llm = getLLMClient();
    this.ragSystem = new RAGSystem();
    this.orchestrator = orchestrator;
  }

  async generatePricingStrategy(niche: string, description: string): Promise<PricingStrategy> {
    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'Pricing Intelligence Agent',
        recipient: 'Orchestrator',
        type: 'info',
        content: `Analyzing optimal pricing strategy for niche: ${niche}...`,
      });
    }

    // Retrieve pricing knowledge from RAG
    const knowledge = await this.ragSystem.query(`pricing strategy for ${niche} saas`, 3);
    const contextStr = knowledge.map(k => k.content).join('\n\n');

    const prompt = `You are an expert SaaS Pricing Strategist.
Based on the niche "${niche}" and description "${description}", generate an optimal pricing strategy.

Consider the following knowledge base context if relevant:
${contextStr}

Return a JSON object with the following structure:
{
  "niche": "string",
  "model": "string (e.g., Freemium → Subscription, Revenue Share, Usage-based)",
  "rationale": "string (Why this model works for this niche)",
  "freemiumRecommended": boolean,
  "trialDays": number (0 if no trial),
  "tiers": [
    {
      "name": "string",
      "price": number | "custom",
      "annualDiscount": number (percentage, e.g., 20),
      "description": "string",
      "features": ["string"],
      "highlighted": boolean,
      "cta": "string"
    }
  ],
  "insights": ["string (Competitive intelligence or pricing psychology insights)"]
}

Ensure the pricing tiers make logical sense (e.g., higher tiers have more features and higher prices).
Limit to 3-4 tiers.`;

    try {
      const response = await this.llm.chat({
        model: CLAUDE_MODELS.SONNET,
        messages: [
          { role: "system", content: "You are a world-class SaaS pricing expert. Output valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const strategyJson = response.content;
      if (!strategyJson) {
        throw new Error("Failed to generate pricing strategy.");
      }

      const strategy: PricingStrategy = JSON.parse(strategyJson);

      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'Pricing Intelligence Agent',
          recipient: 'Orchestrator',
          type: 'response',
          content: 'Pricing strategy generated successfully.',
          payload: strategy,
        });
        this.orchestrator.updateContext({ pricingStrategy: strategy } as any);
      }

      return strategy;
    } catch (error) {
      logger.error("Failed to generate pricing strategy:", error);
      // Fallback strategy
      return {
        niche,
        model: 'Standard Subscription',
        rationale: 'Fallback pricing strategy due to generation error.',
        freemiumRecommended: false,
        trialDays: 14,
        tiers: [
          {
            name: 'Starter',
            price: 29,
            annualDiscount: 20,
            description: 'For individuals',
            features: ['Basic features'],
            highlighted: false,
            cta: 'Start Trial'
          },
          {
            name: 'Pro',
            price: 79,
            annualDiscount: 20,
            description: 'For professionals',
            features: ['Advanced features', 'Priority support'],
            highlighted: true,
            cta: 'Start Trial'
          }
        ],
        insights: ['Standard 14-day trial is recommended.']
      };
    }
  }
}
