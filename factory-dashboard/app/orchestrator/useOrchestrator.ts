'use client'

/**
 * useOrchestrator
 *
 * Custom React hook that encapsulates all state management and API call logic
 * for the SaaS Factory Orchestrator pipeline.
 *
 * Extracted from the monolithic orchestrator/page.tsx (was 1,297 lines) to
 * improve testability, readability, and maintainability.
 */

import { useState, useCallback } from 'react'
import type {
  Step,
  OrchestratorState,
  GeneratedTheme,
  ArchitectBlueprint,
  LandingPageContent,
  GrowthPlan,
  ComplianceCheckResult,
  LegalDocument,
  AgentMessage,
} from './types'

// ─── API Helper ───────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message ?? errorData.error ?? `Request to ${path} failed with status ${response.status}`
    )
  }

  return response.json() as Promise<T>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrchestrator() {
  const [state, setState] = useState<OrchestratorState>({
    currentStep: 'description',
    saasDescription: '',
    appName: '',
    theme: null,
    blueprint: null,
    landingPage: null,
    growthPlan: null,
    complianceChecks: null,
    qaResults: null,
    legalDocs: null,
    deploymentResult: null,
    warRoomMessages: [],
    loading: false,
    error: null,
  })

  // ─── State Helpers ──────────────────────────────────────────────────────────

  const setLoading = (loading: boolean) =>
    setState((s) => ({ ...s, loading, error: loading ? null : s.error }))

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error, loading: false }))

  const addMessages = (messages: AgentMessage[]) =>
    setState((s) => ({ ...s, warRoomMessages: [...s.warRoomMessages, ...messages] }))

  const goToStep = (step: Step) =>
    setState((s) => ({ ...s, currentStep: step }))

  // ─── Public Setters ─────────────────────────────────────────────────────────

  const setSaasDescription = useCallback((description: string) =>
    setState((s) => ({ ...s, saasDescription: description })), [])

  const setAppName = useCallback((appName: string) =>
    setState((s) => ({ ...s, appName })), [])

  const reset = useCallback(() =>
    setState({
      currentStep: 'description',
      saasDescription: '',
      appName: '',
      theme: null,
      blueprint: null,
      landingPage: null,
      growthPlan: null,
      complianceChecks: null,
      qaResults: null,
      legalDocs: null,
      deploymentResult: null,
      warRoomMessages: [],
      loading: false,
      error: null,
    }), [])

  // ─── Step Handlers ──────────────────────────────────────────────────────────

  const handleGenerateTheme = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ theme: GeneratedTheme; messages?: AgentMessage[] }>(
        '/api/generate-theme',
        { description: state.saasDescription, appName: state.appName }
      )
      setState((s) => ({
        ...s,
        theme: data.theme ?? (data as unknown as GeneratedTheme),
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'blueprint',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate theme')
    }
  }, [state.saasDescription, state.appName])

  const handleGenerateBlueprint = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ blueprint: ArchitectBlueprint; messages?: AgentMessage[] }>(
        '/api/architect-blueprint',
        { description: state.saasDescription, appName: state.appName }
      )
      setState((s) => ({
        ...s,
        blueprint: data.blueprint ?? (data as unknown as ArchitectBlueprint),
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'landing',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blueprint')
    }
  }, [state.saasDescription, state.appName])

  const handleGenerateLandingPage = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ landingPage?: LandingPageContent; messages?: AgentMessage[] }>(
        '/api/generate-landing-page',
        { description: state.saasDescription, appName: state.appName }
      )
      setState((s) => ({
        ...s,
        landingPage: data.landingPage ?? (data as unknown as LandingPageContent),
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'growth',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate landing page')
    }
  }, [state.saasDescription, state.appName])

  const handleGenerateGrowthPlan = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ growthPlan?: GrowthPlan; messages?: AgentMessage[] }>(
        '/api/generate-growth-plan',
        { description: state.saasDescription, appName: state.appName }
      )
      setState((s) => ({
        ...s,
        growthPlan: data.growthPlan ?? (data as unknown as GrowthPlan),
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'compliance',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate growth plan')
    }
  }, [state.saasDescription, state.appName])

  const handleRunComplianceChecks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ checks?: ComplianceCheckResult[]; messages?: AgentMessage[] }>(
        '/api/check-compliance',
        {
          saasDescription: state.saasDescription,
          generatedTheme: state.theme,
          generatedBlueprint: state.blueprint,
          generatedLandingPage: state.landingPage,
          generatedGrowthPlan: state.growthPlan,
        }
      )
      setState((s) => ({
        ...s,
        complianceChecks: data.checks ?? (data as unknown as ComplianceCheckResult[]),
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'qa',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run compliance checks')
    }
  }, [state.saasDescription, state.theme, state.blueprint, state.landingPage, state.growthPlan])

  const handleRunQaTests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ tests: unknown; messages?: AgentMessage[] }>(
        '/api/generate-qa-tests',
        {
          saasDescription: state.saasDescription,
          appName: state.appName,
          generatedTheme: state.theme,
          generatedBlueprint: state.blueprint,
          generatedLandingPage: state.landingPage,
          generatedGrowthPlan: state.growthPlan,
        }
      )
      setState((s) => ({
        ...s,
        qaResults: data.tests,
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'legal',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run QA tests')
    }
  }, [state.saasDescription, state.appName, state.theme, state.blueprint, state.landingPage, state.growthPlan])

  const handleGenerateLegalDocs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiPost<{ success: boolean; documents: LegalDocument[]; messages?: AgentMessage[]; error?: string }>(
        '/api/generate-legal-documents',
        {
          companyName: 'SaaS Factory Inc.',
          companyEmail: 'contact@saasfactory.com',
          companyAddress: '123 SaaS Lane, Innovation City',
          appName: state.appName,
          appDescription: state.saasDescription,
          dataProcessing: ['user_emails', 'payment_info', 'usage_analytics'],
          thirdPartyServices: ['stripe', 'supabase', 'google_analytics'],
          jurisdiction: 'EU',
        }
      )
      if (!data.success) throw new Error(data.error ?? 'Failed to generate legal documents')
      setState((s) => ({
        ...s,
        legalDocs: data.documents,
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'deploy',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate legal documents')
    }
  }, [state.appName, state.saasDescription])

  const handleDeploy = useCallback(async () => {
    if (!state.theme || !state.blueprint) {
      setError('Theme and blueprint must be generated first')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost<{ message: string; messages?: AgentMessage[] }>(
        '/api/deploy-coolify',
        {
          appName: state.appName.toLowerCase().replace(/\s/g, '-'),
          gitRepository: 'https://github.com/bojandek/saas-fact',
          branch: 'main',
          environment: 'production',
          domain: `${state.appName.toLowerCase().replace(/\s/g, '-')}.saas-factory.dev`,
        }
      )
      setState((s) => ({
        ...s,
        deploymentResult: data.message,
        warRoomMessages: [...s.warRoomMessages, ...(data.messages ?? [])],
        loading: false,
        currentStep: 'complete',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy')
    }
  }, [state.appName, state.theme, state.blueprint])

  return {
    state,
    setSaasDescription,
    setAppName,
    goToStep,
    reset,
    handleGenerateTheme,
    handleGenerateBlueprint,
    handleGenerateLandingPage,
    handleGenerateGrowthPlan,
    handleRunComplianceChecks,
    handleRunQaTests,
    handleGenerateLegalDocs,
    handleDeploy,
  }
}
