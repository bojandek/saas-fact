/**
 * factory-brain-types.ts
 * Shared type definitions and constants for factory-dashboard.
 * Mirrors types from factory-brain without creating a circular dependency.
 */

export interface FactoryPlan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  agentRunsPerMonth: number | 'unlimited'
  exportsPerMonth: number | 'unlimited'
  features: string[]
}

export const FACTORY_PLANS: FactoryPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    agentRunsPerMonth: 10,
    exportsPerMonth: 3,
    features: ['3 SaaS exports/month', '10 AI agent runs/month', 'Community blocks', 'Single user'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 290,
    agentRunsPerMonth: 500,
    exportsPerMonth: 'unlimited',
    features: ['Unlimited exports', '500 AI agent runs/month', 'All premium blocks', 'Priority queue', 'No watermark'],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 99,
    yearlyPrice: 990,
    agentRunsPerMonth: 'unlimited',
    exportsPerMonth: 'unlimited',
    features: ['Everything in Pro', 'Unlimited AI agent runs', 'White-label output', 'Team collaboration', 'Priority support'],
  },
]
