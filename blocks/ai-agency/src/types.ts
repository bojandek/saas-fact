/**
 * AI Agency Type Definitions
 * Division hierarchies and specialization models
 */

import { z } from 'zod'

export const DivisionSchema = z.enum([
  'engineering',
  'design',
  'marketing',
  'operations',
  'executive',
])
export type Division = z.infer<typeof DivisionSchema>

export const SpecializationSchema = z.enum([
  'backend',
  'frontend',
  'devops',
  'qa',
  'security',
  'performance',
  'product-design',
  'visual-design',
  'ux-research',
  'motion',
  'content',
  'copywriting',
  'growth',
  'sales-eng',
  'social',
  'product',
  'analytics',
  'customer-success',
  'finance',
  'hr',
  'ceo',
  'cto',
  'cfo',
  'coo',
  'head-product',
  'head-marketing',
  'head-people',
])
export type Specialization = z.infer<typeof SpecializationSchema>

export interface DivisionAgent {
  id: string
  name: string
  division: Division
  specialization: Specialization
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'director'
  capabilities: string[]
  systemPrompt: string
}

export interface SprintPlan {
  features: string[]
  timeline: string
  breakdown: {
    feature: string
    engineer: string
    estimatedDays: number
    dependencies: string[]
  }[]
  risks: string[]
  resources: string[]
}

export interface DesignSpec {
  componentLibrary: any[]
  colorSystem: Record<string, string>
  typography: Record<string, any>
  spacing: Record<string, number>
  guidelines: string[]
}

export interface MarketingCampaign {
  type: string
  target: string
  budget: number
  channels: string[]
  messaging: string
  timeline: string
  expectedROI: number
}

export interface StrategicDecision {
  context: string
  options: string[]
  selectedOption: string
  reasoning: string
  implementation: string[]
  timeline: string
}
