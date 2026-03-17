'use client'

/**
 * SaaS Factory Orchestrator Page
 *
 * Refactored from a 1,297-line monolithic component into a clean composition
 * of focused, reusable components:
 *
 *  - useOrchestrator()   — all state and API call logic (custom hook)
 *  - <StepIndicator />   — progress bar at the top
 *  - <StepPanels />      — step-specific UI panels
 *  - <WarRoomLog />      — live agent communication feed
 *
 * This page is now ~50 lines, down from 1,297.
 */

import { useOrchestrator } from './useOrchestrator'
import { StepIndicator } from './components/StepIndicator'
import { StepPanels } from './components/StepPanels'
import { WarRoomLog } from './components/WarRoomLog'

export default function OrchestratorPage() {
  const {
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
  } = useOrchestrator()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">SaaS Factory Orchestrator</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Describe → Theme → Blueprint → Landing → Growth → Compliance → QA → Legal → Deploy
        </p>
      </header>

      {/* Progress */}
      <StepIndicator currentStep={state.currentStep} />

      {/* Error Banner */}
      {state.error && (
        <div
          role="alert"
          className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9v4a1 1 0 102 0V9a1 1 0 10-2 0zm0-4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Step Content */}
      <StepPanels
        currentStep={state.currentStep}
        saasDescription={state.saasDescription}
        appName={state.appName}
        theme={state.theme}
        blueprint={state.blueprint}
        landingPage={state.landingPage}
        growthPlan={state.growthPlan}
        complianceChecks={state.complianceChecks}
        qaResults={state.qaResults}
        legalDocs={state.legalDocs}
        deploymentResult={state.deploymentResult}
        loading={state.loading}
        onDescriptionChange={setSaasDescription}
        onAppNameChange={setAppName}
        onGoToStep={goToStep}
        onGenerateTheme={handleGenerateTheme}
        onGenerateBlueprint={handleGenerateBlueprint}
        onGenerateLandingPage={handleGenerateLandingPage}
        onGenerateGrowthPlan={handleGenerateGrowthPlan}
        onRunComplianceChecks={handleRunComplianceChecks}
        onRunQaTests={handleRunQaTests}
        onGenerateLegalDocs={handleGenerateLegalDocs}
        onDeploy={handleDeploy}
        onReset={reset}
      />

      {/* War Room Log */}
      <WarRoomLog messages={state.warRoomMessages} />
    </div>
  )
}
