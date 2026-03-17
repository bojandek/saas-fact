'use client'

import type {
  Step,
  GeneratedTheme,
  ArchitectBlueprint,
  LandingPageContent,
  GrowthPlan,
  ComplianceCheckResult,
  LegalDocument,
} from '../types'

interface StepPanelsProps {
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
  loading: boolean
  onDescriptionChange: (v: string) => void
  onAppNameChange: (v: string) => void
  onGoToStep: (step: Step) => void
  onGenerateTheme: () => void
  onGenerateBlueprint: () => void
  onGenerateLandingPage: () => void
  onGenerateGrowthPlan: () => void
  onRunComplianceChecks: () => void
  onRunQaTests: () => void
  onGenerateLegalDocs: () => void
  onDeploy: () => void
  onReset: () => void
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  children,
  variant = 'primary',
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-5 py-2 rounded-lg font-semibold text-sm transition-all',
        variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50',
        'disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {disabled && variant === 'primary' ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  )
}

function ResultCard({ title, children, color = 'gray' }: { title: string; children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'border-gray-200 bg-gray-50',
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
  }
  return (
    <div className={`mt-4 p-4 border rounded-lg ${colorMap[color] ?? colorMap.gray}`}>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}

// ─── Step Panels ──────────────────────────────────────────────────────────────

export function StepPanels({
  currentStep,
  saasDescription,
  appName,
  theme,
  blueprint,
  landingPage,
  growthPlan,
  complianceChecks,
  qaResults,
  legalDocs,
  deploymentResult,
  loading,
  onDescriptionChange,
  onAppNameChange,
  onGoToStep,
  onGenerateTheme,
  onGenerateBlueprint,
  onGenerateLandingPage,
  onGenerateGrowthPlan,
  onRunComplianceChecks,
  onRunQaTests,
  onGenerateLegalDocs,
  onDeploy,
  onReset,
}: StepPanelsProps) {
  return (
    <div className="min-h-64">
      {/* Step 1: Description */}
      {currentStep === 'description' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Describe Your SaaS Idea</h2>
          <p className="text-gray-500 text-sm">Tell us what you want to build. Be as detailed as possible!</p>
          <textarea
            rows={4}
            placeholder="e.g., A CRM for small businesses with AI-powered lead scoring and automated follow-up emails"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={saasDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
          <input
            type="text"
            placeholder="App Name (e.g., LeadFlow CRM)"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={appName}
            onChange={(e) => onAppNameChange(e.target.value)}
          />
          <ActionButton
            onClick={() => onGoToStep('theme')}
            disabled={saasDescription.length < 10 || !appName}
          >
            Next: Generate Theme →
          </ActionButton>
        </div>
      )}

      {/* Step 2: Theme */}
      {currentStep === 'theme' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 2: Generate UI Theme</h2>
          <p className="text-gray-500 text-sm">AI will create a unique design system for your SaaS.</p>
          <ActionButton onClick={onGenerateTheme} disabled={loading}>
            Generate Theme
          </ActionButton>
          {theme && (
            <ResultCard title="Generated Theme" color="green">
              <div className="flex gap-3 mb-2">
                {[theme.primaryColor, theme.secondaryColor, theme.accentColor].map((color, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded border" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600">{color}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">Font: <strong>{theme.fontFamily}</strong> · Radius: {theme.borderRadius}</p>
              <ActionButton onClick={() => onGoToStep('blueprint')} variant="secondary">
                Next: Architect Blueprint →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 3: Blueprint */}
      {currentStep === 'blueprint' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 3: Architect Database & API</h2>
          <p className="text-gray-500 text-sm">Architect Agent will design your database schema and API structure.</p>
          <ActionButton onClick={onGenerateBlueprint} disabled={loading}>
            Generate Blueprint
          </ActionButton>
          {blueprint && (
            <ResultCard title="Generated Blueprint" color="blue">
              <p className="text-sm text-gray-600 mb-2">SQL Schema and API spec generated successfully.</p>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:underline">View SQL Schema</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto text-gray-700">{blueprint.sqlSchema}</pre>
              </details>
              <ActionButton onClick={() => onGoToStep('landing')} variant="secondary">
                Next: Landing Page →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 4: Landing Page */}
      {currentStep === 'landing' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 4: Generate Landing Page</h2>
          <p className="text-gray-500 text-sm">AI will create a compelling marketing landing page for your SaaS.</p>
          <ActionButton onClick={onGenerateLandingPage} disabled={loading}>
            Generate Landing Page
          </ActionButton>
          {landingPage && (
            <ResultCard title="Landing Page Generated!" color="green">
              <p className="text-sm text-gray-700 font-medium">{landingPage.hero.headline}</p>
              <p className="text-xs text-gray-500">{landingPage.features.length} features · {landingPage.pricing.length} pricing tiers</p>
              <ActionButton onClick={() => onGoToStep('growth')} variant="secondary">
                Next: Growth Plan →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 5: Growth Plan */}
      {currentStep === 'growth' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 5: Generate Growth Plan</h2>
          <p className="text-gray-500 text-sm">Growth Hacker Agent will create SEO, social media, and email strategies.</p>
          <ActionButton onClick={onGenerateGrowthPlan} disabled={loading}>
            Generate Growth Plan
          </ActionButton>
          {growthPlan && (
            <ResultCard title="Growth Plan Generated!" color="blue">
              <p className="text-sm text-gray-700">{growthPlan.seo.metaTitle}</p>
              <p className="text-xs text-gray-500">{growthPlan.socialMediaPosts.length} social posts · {growthPlan.emailCampaign.length} email templates</p>
              <ActionButton onClick={() => onGoToStep('compliance')} variant="secondary">
                Next: Compliance →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 6: Compliance */}
      {currentStep === 'compliance' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 6: Compliance Checks</h2>
          <p className="text-gray-500 text-sm">Verify GDPR, SOC2, and other regulatory requirements.</p>
          <ActionButton onClick={onRunComplianceChecks} disabled={loading}>
            Run Compliance Checks
          </ActionButton>
          {complianceChecks && (
            <ResultCard title="Compliance Results" color="yellow">
              <ul className="space-y-1">
                {complianceChecks.map((check, i) => (
                  <li key={i} className={`text-sm flex items-start gap-2 ${
                    check.status === 'fail' ? 'text-red-700' :
                    check.status === 'warning' ? 'text-orange-700' : 'text-green-700'
                  }`}>
                    <span className="font-bold shrink-0">[{check.status.toUpperCase()}]</span>
                    <span>{check.rule}: {check.message}</span>
                  </li>
                ))}
              </ul>
              <ActionButton onClick={() => onGoToStep('qa')} variant="secondary">
                Next: QA Tests →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 7: QA Tests */}
      {currentStep === 'qa' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 7: Generate QA Tests</h2>
          <p className="text-gray-500 text-sm">QA Agent will generate Playwright end-to-end tests for your SaaS.</p>
          <ActionButton onClick={onRunQaTests} disabled={loading || !appName}>
            Generate QA Tests
          </ActionButton>
          {qaResults && (
            <ResultCard title="QA Tests Generated!" color="purple">
              <details className="text-xs">
                <summary className="cursor-pointer text-purple-600 hover:underline">View Test Output</summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto text-gray-700">
                  {JSON.stringify(qaResults, null, 2)}
                </pre>
              </details>
              <ActionButton onClick={() => onGoToStep('legal')} variant="secondary">
                Next: Legal Documents →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 8: Legal Documents */}
      {currentStep === 'legal' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 8: Generate Legal Documents</h2>
          <p className="text-gray-500 text-sm">Generate GDPR-compliant Privacy Policy, Terms of Service, and DPA.</p>
          <ActionButton onClick={onGenerateLegalDocs} disabled={loading || !appName}>
            Generate Legal Docs
          </ActionButton>
          {legalDocs && (
            <ResultCard title="Legal Documents Generated!" color="orange">
              <ul className="space-y-1">
                {legalDocs.map((doc, i) => (
                  <li key={i} className="text-sm text-orange-700">
                    <strong>{doc.type.toUpperCase()}</strong> · Updated: {new Date(doc.lastUpdated).toLocaleDateString()}
                  </li>
                ))}
              </ul>
              <ActionButton onClick={() => onGoToStep('deploy')} variant="secondary">
                Next: Deploy →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 9: Deploy */}
      {currentStep === 'deploy' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 9: Deploy to Production</h2>
          <p className="text-gray-500 text-sm">Coolify Agent will deploy your SaaS to your production environment.</p>
          <ActionButton onClick={onDeploy} disabled={loading || !theme || !blueprint}>
            Deploy SaaS
          </ActionButton>
          {deploymentResult && (
            <ResultCard title="Deployment Result" color="green">
              <p className="text-sm text-green-800">{deploymentResult}</p>
              <ActionButton onClick={() => onGoToStep('complete')} variant="secondary">
                Finish →
              </ActionButton>
            </ResultCard>
          )}
        </div>
      )}

      {/* Step 10: Complete */}
      {currentStep === 'complete' && (
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-green-600">SaaS Generation Complete!</h2>
          <p className="text-gray-600">Your SaaS has been successfully built, tested, and deployed.</p>
          <p className="text-sm text-gray-400">Check your Coolify dashboard for the live application.</p>
          <ActionButton onClick={onReset}>
            Build Another SaaS
          </ActionButton>
        </div>
      )}
    </div>
  )
}
