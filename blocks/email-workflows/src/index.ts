/**
 * Email Workflows Block
 * Automated sequences, triggers, lifecycle management
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export interface EmailStep {
  id: string
  delay: number // seconds
  template: string
  condition?: (user: any) => boolean
  variables?: Record<string, any>
}

export interface EmailWorkflow {
  id: string
  name: string
  trigger: 'signup' | 'purchase' | 'inactivity' | 'churn' | 'custom'
  steps: EmailStep[]
  enabled: boolean
  created_at: string
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  user_id: string
  current_step: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
}

export class EmailWorkflowEngine {
  private supabase: ReturnType<typeof createClient>
  private resend: Resend

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  /**
   * Enroll user in workflow
   */
  async enrollUser(
    userId: string,
    workflowId: string,
    variables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        current_step: 0,
        status: 'pending',
        variables,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Execute next step in workflow
   */
  async executeStep(executionId: string): Promise<void> {
    // Get execution
    const { data: execution, error: execError } = await this.supabase
      .from('workflow_executions')
      .select('*, workflows(*), users(*)')
      .eq('id', executionId)
      .single()

    if (execError) throw execError

    const workflow: EmailWorkflow = execution.workflows
    const step = workflow.steps[execution.current_step]

    if (!step) {
      // Workflow complete
      await this.supabase
        .from('workflow_executions')
        .update({ status: 'completed', completed_at: new Date() })
        .eq('id', executionId)
      return
    }

    // Check condition
    if (step.condition && !step.condition(execution.users)) {
      // Skip to next step
      await this.supabase
        .from('workflow_executions')
        .update({ current_step: execution.current_step + 1 })
        .eq('id', executionId)
      return
    }

    // Send email
    await this.sendEmail(
      execution.users.email,
      step.template,
      step.variables || {}
    )

    // Move to next step
    const nextStep = execution.current_step + 1
    const isComplete = nextStep >= workflow.steps.length

    await this.supabase
      .from('workflow_executions')
      .update({
        current_step: nextStep,
        status: isComplete ? 'completed' : 'running',
        completed_at: isComplete ? new Date() : null,
      })
      .eq('id', executionId)

    // Schedule next step
    if (!isComplete && workflow.steps[nextStep]) {
      const nextStepDelay = workflow.steps[nextStep].delay
      this.scheduleStep(executionId, nextStepDelay)
    }
  }

  /**
   * Send email via Resend
   */
  private async sendEmail(
    to: string,
    template: string,
    variables: Record<string, any>
  ): Promise<string> {
    const { data, error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@saas-factory.com',
      to,
      template,
      react: undefined, // Template should be pre-rendered
    })

    if (error) throw error
    return data?.id || ''
  }

  /**
   * Schedule step execution
   */
  private scheduleStep(executionId: string, delaySeconds: number): void {
    setTimeout(() => {
      this.executeStep(executionId).catch((error) => {
        console.error('Workflow step failed:', error)
      })
    }, delaySeconds * 1000)
  }

  /**
   * Trigger workflow based on events
   */
  async triggerWorkflow(
    userId: string,
    triggerEvent: string,
    context?: Record<string, any>
  ): Promise<void> {
    // Find workflows matching trigger
    const { data: workflows, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('trigger', triggerEvent)
      .eq('enabled', true)

    if (error) throw error

    // Enroll user in each matching workflow
    for (const workflow of workflows) {
      await this.enrollUser(userId, workflow.id, context)
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string) {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select('status')
      .eq('workflow_id', workflowId)

    if (error) throw error

    const total = data.length
    const completed = data.filter((e) => e.status === 'completed').length
    const failed = data.filter((e) => e.status === 'failed').length

    return {
      total,
      completed,
      failed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    }
  }
}

export const emailWorkflows = new EmailWorkflowEngine()
