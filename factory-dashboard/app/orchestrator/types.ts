/**
 * Shared types for the Orchestrator feature.
 * Extracted from the monolithic page.tsx to enable component reuse.
 */

export type Step =
  | 'description'
  | 'theme'
  | 'blueprint'
  | 'landing'
  | 'growth'
  | 'compliance'
  | 'qa'
  | 'legal'
  | 'deploy'
  | 'complete'

export const STEPS: Step[] = [
  'description',
  'theme',
  'blueprint',
  'landing',
  'growth',
  'compliance',
  'qa',
  'legal',
  'deploy',
  'complete',
]

export interface GeneratedTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  borderRadius: string
}

export interface ArchitectBlueprint {
  sqlSchema: string
  apiSpec: string
  rlsPolicies: string
}

export interface LandingPageContent {
  hero: {
    headline: string
    subheadline: string
    callToAction: string
  }
  features: Array<{
    title: string
    description: string
  }>
  pricing: Array<{
    planName: string
    price: string
    features: string[]
    callToAction: string
  }>
  testimonials: Array<{
    quote: string
    author: string
    company: string
  }>
}

export interface GrowthPlan {
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string[]
  }
  socialMediaPosts: Array<{
    platform: string
    content: string
    hashtags: string[]
  }>
  emailCampaign: Array<{
    subject: string
    body: string
  }>
}

export interface ComplianceCheckResult {
  rule: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

export interface LegalDocument {
  type: string
  content: string
  lastUpdated: string
}

export interface AgentMessage {
  agent: string
  message: string
  timestamp?: string
}

export interface OrchestratorState {
  currentStep: Step
  saasDescription: string
  appName: string
  theme: GeneratedTheme | null
  blueprint: ArchitectBlueprint | null
  landingPage: LandingPageContent | null
  growthPlan: GrowthPlan | null
  complianceChecks: ComplianceCheckResult[] | null
  qaResults: unknown | null
  legalDocs: LegalDocument[] | null
  deploymentResult: string | null
  warRoomMessages: AgentMessage[]
  loading: boolean
  error: string | null
}
