'use client'

import { STEPS, type Step } from '../types'

interface StepIndicatorProps {
  currentStep: Step
}

const STEP_LABELS: Record<Step, string> = {
  description: 'Describe',
  theme: 'Theme',
  blueprint: 'Blueprint',
  landing: 'Landing',
  growth: 'Growth',
  compliance: 'Compliance',
  qa: 'QA',
  legal: 'Legal',
  deploy: 'Deploy',
  complete: 'Complete',
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = STEPS.indexOf(currentStep)

  return (
    <nav aria-label="Orchestrator progress" className="flex justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => {
        const isActive = step === currentStep
        const isCompleted = idx < currentIndex

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors',
                  isActive ? 'bg-blue-600 text-white ring-2 ring-blue-300' : '',
                  isCompleted ? 'bg-green-500 text-white' : '',
                  !isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : '',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={[
                  'mt-1 text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-blue-600' : 'text-gray-500',
                ].join(' ')}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'h-0.5 w-8 mx-1 mt-0 mb-4 transition-colors',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
