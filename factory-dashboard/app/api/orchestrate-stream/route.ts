/**
 * Orchestrate Stream API Route
 *
 * Implements Server-Sent Events (SSE) for real-time streaming of agent output.
 * Clients receive live updates as each agent completes its work, instead of
 * waiting for the entire pipeline to finish.
 *
 * Usage (client-side):
 *   const es = new EventSource('/api/orchestrate-stream?description=...')
 *   es.addEventListener('agent-update', (e) => console.log(JSON.parse(e.data)))
 *   es.addEventListener('complete', (e) => { es.close(); ... })
 *   es.addEventListener('error-event', (e) => { es.close(); ... })
 */

import { applyRateLimit } from '../../../lib/rate-limit'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SSE helper: format a named event
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// Agent pipeline step definition
interface AgentStep {
  id: string
  name: string
  description: string
  apiPath: string
  bodyBuilder: (ctx: Record<string, unknown>) => Record<string, unknown>
  contextKey: string
}

const AGENT_PIPELINE: AgentStep[] = [
  {
    id: 'theme',
    name: 'Nano Banana UI Engine',
    description: 'Generating unique color palette, typography and UI components...',
    apiPath: '/api/generate-theme',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription }),
    contextKey: 'theme',
  },
  {
    id: 'blueprint',
    name: 'Architect Agent',
    description: 'Designing SQL schema, API specification and RLS policies...',
    apiPath: '/api/architect-blueprint',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription, theme: ctx.theme }),
    contextKey: 'blueprint',
  },
  {
    id: 'landing',
    name: 'Landing Page Generator',
    description: 'Creating marketing landing page with pricing and features...',
    apiPath: '/api/generate-landing-page',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription, theme: ctx.theme }),
    contextKey: 'landingPage',
  },
  {
    id: 'growth',
    name: 'Growth Hacker Agent',
    description: 'Planning SEO, social media and email campaigns...',
    apiPath: '/api/generate-growth-plan',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription }),
    contextKey: 'growthPlan',
  },
  {
    id: 'compliance',
    name: 'Compliance Checker',
    description: 'Verifying GDPR and regulatory compliance...',
    apiPath: '/api/check-compliance',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription, blueprint: ctx.blueprint }),
    contextKey: 'complianceChecks',
  },
  {
    id: 'legal',
    name: 'Legal & Terms Generator',
    description: 'Generating Terms of Service and Privacy Policy...',
    apiPath: '/api/generate-legal-documents',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription, complianceChecks: ctx.complianceChecks }),
    contextKey: 'legalDocs',
  },
  {
    id: 'qa',
    name: 'QA Agent',
    description: 'Generating Playwright end-to-end tests...',
    apiPath: '/api/generate-qa-tests',
    bodyBuilder: (ctx) => ({ description: ctx.saasDescription, blueprint: ctx.blueprint }),
    contextKey: 'qaTests',
  },
]

export async function GET(request: NextRequest) {
  // Rate limit: 5 orchestration requests per minute per IP (expensive pipeline)
  const limited = applyRateLimit(request, { limit: 5, window: 60 })
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const saasDescription = searchParams.get('description')
  const appName = searchParams.get('appName') || 'my-saas'

  if (!saasDescription) {
    return new Response('Missing description parameter', { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3001}`

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s)

      // Send initial connection event
      controller.enqueue(
        encode(
          sseEvent('connected', {
            message: 'War Room Orchestrator connected. Starting agent pipeline...',
            totalSteps: AGENT_PIPELINE.length,
            appName,
          })
        )
      )

      const context: Record<string, unknown> = { saasDescription, appName }

      for (let i = 0; i < AGENT_PIPELINE.length; i++) {
        const step = AGENT_PIPELINE[i]

        // Notify client that this agent is starting
        controller.enqueue(
          encode(
            sseEvent('agent-start', {
              stepIndex: i,
              totalSteps: AGENT_PIPELINE.length,
              agentId: step.id,
              agentName: step.name,
              description: step.description,
            })
          )
        )

        try {
          const body = step.bodyBuilder(context)
          const response = await fetch(`${baseUrl}${step.apiPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            throw new Error(`${step.name} returned ${response.status}`)
          }

          const result = await response.json()
          context[step.contextKey] = result

          // Notify client that this agent completed successfully
          controller.enqueue(
            encode(
              sseEvent('agent-update', {
                stepIndex: i,
                totalSteps: AGENT_PIPELINE.length,
                agentId: step.id,
                agentName: step.name,
                status: 'completed',
                result,
              })
            )
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'

          controller.enqueue(
            encode(
              sseEvent('agent-update', {
                stepIndex: i,
                totalSteps: AGENT_PIPELINE.length,
                agentId: step.id,
                agentName: step.name,
                status: 'failed',
                error: message,
              })
            )
          )

          // Non-blocking: continue pipeline even if one agent fails
        }
      }

      // Pipeline complete
      controller.enqueue(
        encode(
          sseEvent('complete', {
            message: 'All agents completed. Your SaaS is ready!',
            appName,
            context,
          })
        )
      )

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}
