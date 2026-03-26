/**
 * Autonomous Generator Engine
 *
 * This is the core of the "Automaton" — it runs the full SaaS generation
 * pipeline DIRECTLY, without any HTTP dependency on factory-dashboard.
 *
 * The CLI can invoke this directly:
 *   factory generate --niche "teretana-crm"
 *   factory generate --desc "A booking app for yoga studios" --name yoga-sync
 *
 * Pipeline:
 *   1. NicheMapper → select blocks & features
 *   2. ArchitectAgent → generate SQL schema + API spec
 *   3. WarRoomOrchestrator → run all agents in parallel
 *   4. AssemblerAgent → scaffold the app in apps/
 *   5. CoolifyDeployAgent → deploy to Coolify (optional)
 *   6. AutonomousLearningLoop → store result in memory
 */

import path from 'path'
import fs from 'fs/promises'
import { NicheMapper, NicheBlueprint } from './niche-mapper.js'
import { logger } from './utils/logger.js'
import { withRetry } from './utils/retry.js'
import { costTracker } from './cost-tracker.js'
import { factoryBilling, UsageRecord } from './factory-billing.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** Niche shorthand: "teretana-crm", "salon-booking", etc. */
  niche?: string
  /** Free-form description (used if niche not provided) */
  description?: string
  /** App name (slug): "my-gym-app" */
  appName: string
  /** Organisation ID for RLS */
  orgId?: string
  /** Skip Coolify deployment */
  skipDeploy?: boolean
  /** Skip QA agent */
  skipQA?: boolean
  /** Requested visual style (e.g., minimalist, corporate) */
  style?: string
  /** Requested primary color (e.g., #3b82f6) */
  themeColor?: string
  /** Export to no-code platform */
  exportPlatform?: string
  /** Callback for real-time progress updates */
  onProgress?: (event: ProgressEvent) => void
}

export interface ProgressEvent {
  step: GenerationStep
  status: 'started' | 'completed' | 'failed'
  message: string
  data?: unknown
  timestamp: Date
  elapsedMs: number
}

export type GenerationStep =
  | 'niche-mapping'
  | 'architecture'
  | 'war-room'
  | 'assembly'
  | 'export'
  | 'deployment'
  | 'learning'

export interface GenerationResult {
  success: boolean
  appName: string
  appPath: string
  niche: string
  blueprint: NicheBlueprint
  deployUrl?: string
  totalCostUsd: number
  totalDurationMs: number
  steps: ProgressEvent[]
  error?: string
}

// ─── Autonomous Generator ─────────────────────────────────────────────────────

export class AutonomousGenerator {
  private nicheMapper = new NicheMapper()
  private log = logger.child({ module: 'AutonomousGenerator' })
  private startTime = Date.now()
  private steps: ProgressEvent[] = []

  async generate(opts: GenerateOptions): Promise<GenerationResult> {
    this.startTime = Date.now()
    this.steps = []
    const sessionId = `gen-${opts.appName}-${Date.now()}`

    this.log.info({ opts, sessionId }, 'Starting autonomous generation')

    try {
      // ── Step 0: Billing Check ──────────────────────────────────────────────
      // Mock usage record for demonstration (in a real app, fetch from DB)
      const mockUsage: UsageRecord = {
        userId: opts.orgId || 'cli-user',
        planId: 'free',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        exportsUsed: 0,
        agentRunsUsed: 0,
      }

      const runCheck = factoryBilling.canPerformAction(mockUsage, 'agentRun')
      if (!runCheck.allowed) {
        throw new Error(`Billing limit reached: ${runCheck.reason}`)
      }

      if (opts.exportPlatform) {
        const exportCheck = factoryBilling.canPerformAction(mockUsage, 'export')
        if (!exportCheck.allowed) {
          throw new Error(`Billing limit reached: ${exportCheck.reason}`)
        }
      }

      // ── Step 1: Niche Mapping ──────────────────────────────────────────────
      const blueprint = await this.runStep('niche-mapping', opts, async () => {
        if (opts.niche) {
          return this.nicheMapper.mapNiche(opts.niche)
        }
        // If only description provided, use LLM to extract niche
        return this.nicheMapper.mapNiche(opts.description || opts.appName)
      })

      this.emit(opts, 'niche-mapping', 'completed',
        `Niche mapped: ${blueprint.normalizedNiche} → ${blueprint.blocks.length} blocks selected`, blueprint)

      // ── Step 2: Architecture ───────────────────────────────────────────────
      const description = opts.description ||
        `A ${blueprint.niche.replace(/-/g, ' ')} SaaS application. ` +
        `Core features: ${blueprint.coreFeatures.slice(0, 3).join(', ')}.`

      let architectResult: Record<string, unknown>
      try {
        architectResult = await this.runStep('architecture', opts, async () => {
          // Dynamically import to avoid circular deps
          const { ArchitectAgent } = await import('./architect-agent.js')
          const architect = new ArchitectAgent()
          return architect.generateBlueprint({
            description,
            appName: opts.appName,
            blocks: blueprint.blocks,
            features: blueprint.coreFeatures,
            tables: blueprint.databaseTables,
          })
        })
        this.emit(opts, 'architecture', 'completed', 'Architecture blueprint generated')
      } catch (err) {
        // Architecture failure is non-fatal — use blueprint as fallback
        this.log.warn({ err }, 'ArchitectAgent failed, using niche blueprint as fallback')
        architectResult = {
          sqlSchema: this.generateFallbackSQL(blueprint),
          apiSpec: { routes: [] },
          components: [],
        }
        this.emit(opts, 'architecture', 'completed', 'Architecture generated from niche blueprint (fallback)')
      }

      // ── Step 3: War Room ───────────────────────────────────────────────────
      let warRoomResult: Record<string, unknown>
      try {
        warRoomResult = await this.runStep('war-room', opts, async () => {
          const { WarRoomOrchestrator } = await import('./war-room-orchestrator.js')
          const { GrowthHackerAgent } = await import('./growth-hacker-agent.js')
          const { ComplianceCheckerAgent } = await import('./compliance-checker-agent.js')
          const { QaAgent } = await import('./qa-agent.js')
          const { LegalTermsGenerator } = await import('./legal-terms-generator.js')
          const { ThemeAgent } = await import('./theme-agent.js')
          const { PricingIntelligenceAgent } = await import('./pricing-intelligence-agent.js')
          const { MirofishAgent } = await import('./mirofish-agent.js')

          // Build AgentContext from available data
          const context = {
            saasDescription: description,
            appName: opts.appName,
            blueprint: architectResult,
          }
          const orchestrator = new WarRoomOrchestrator(context)

          // Create AgentTask objects for each pipeline stage
          const growthAgent = new GrowthHackerAgent()
          const complianceAgent = new ComplianceCheckerAgent()
          const qaAgent = new QaAgent()
          const legalAgent = new LegalTermsGenerator()
          const themeAgent = new ThemeAgent(orchestrator)
          const pricingAgent = new PricingIntelligenceAgent(orchestrator)
          const mirofishAgent = new MirofishAgent(orchestrator)

          const growthPlan: Record<string, unknown> = {}
          const complianceResult: Record<string, unknown> = {}
          const qaResult: Record<string, unknown> = {}
          const legalResult: Record<string, unknown> = {}
          const pricingResult: Record<string, unknown> = {}
          const mirofishResult: Record<string, unknown> = {}

          await orchestrator.runFullPipeline({
            theme: {
              name: 'theme',
              run: async () => {
                const result = await themeAgent.generateTheme(description, opts.style, opts.themeColor)
                orchestrator.updateContext({ theme: result })
                return result
              },
            },
            blueprint: {
              name: 'blueprint',
              run: async () => {
                orchestrator.updateContext({ blueprint: architectResult })
                return architectResult
              },
            },
            landingPage: {
              name: 'landing-page',
              run: async () => {
                return { headline: blueprint.suggestedTagline, sections: [] }
              },
            },
            growthPlan: {
              name: 'growth-plan',
              run: async () => {
                const result = await growthAgent.generateGrowthPlan(description)
                Object.assign(growthPlan, result)
                orchestrator.updateContext({ growthPlan: result })
                return result
              },
            },
            compliance: {
              name: 'compliance',
              run: async () => {
                const result = await complianceAgent.checkCompliance(
                  description,
                  null, // theme
                  architectResult, // blueprint
                  null, // landingPage
                  growthPlan, // growthPlan
                )
                Object.assign(complianceResult, { checks: result })
                orchestrator.updateContext({ complianceChecks: result })
                return result
              },
            },
            qaTests: {
              name: 'qa-tests',
              run: async () => {
                if (opts.skipQA) return { skipped: true }
                const ctx = orchestrator.getContext()
                const result = await qaAgent.generateTests({
                  saasDescription: description,
                  appName: opts.appName,
                  generatedTheme: ctx.theme,
                  generatedBlueprint: architectResult,
                  generatedLandingPage: ctx.landingPage,
                  generatedGrowthPlan: growthPlan,
                  context: ctx,
                })
                Object.assign(qaResult, result)
                orchestrator.updateContext({ qaResults: result })
                return result
              },
            },
            legalDocs: {
              name: 'legal-docs',
              run: async () => {
                const result = LegalTermsGenerator.generateTermsOfService({
                  companyName: opts.appName,
                  companyEmail: 'legal@example.com',
                  companyAddress: 'To be updated',
                  appName: blueprint.suggestedAppName,
                  appDescription: description,
                  dataProcessing: ['user_emails', 'usage_analytics'],
                  thirdPartyServices: blueprint.blocks.includes('payments') ? ['stripe'] : [],
                  jurisdiction: 'EU',
                })
                Object.assign(legalResult, result)
                orchestrator.updateContext({ legalDocs: result })
                return result
              },
            },
            pricingStrategy: {
              name: 'pricing-strategy',
              run: async () => {
                const result = await pricingAgent.generatePricingStrategy(blueprint.niche, description)
                Object.assign(pricingResult, result)
                orchestrator.updateContext({ pricingStrategy: result })
                return result
              },
            },
            marketSimulation: {
              name: 'market-simulation',
              run: async () => {
                const result = await mirofishAgent.runSimulation(blueprint.niche, description, blueprint.features)
                Object.assign(mirofishResult, result)
                orchestrator.updateContext({ marketSimulation: result })
                return result
              },
            },
            deploy: {
              name: 'deploy-prep',
              run: async () => {
                return { ready: true }
              },
            },
          })

          return { growthPlan, complianceResult, qaResult, legalResult, pricingResult, mirofishResult, agentsRun: 6 }
        })
        this.emit(opts, 'war-room', 'completed',
          `War Room complete: ${(warRoomResult as any).agentsRun || 6} agents finished`)
      } catch (err) {
        this.log.warn({ err }, 'WarRoom failed, continuing with assembly')
        warRoomResult = { growthPlan: null, legalDocs: null, qaTests: null, pricingResult: null, mirofishResult: null }
        this.emit(opts, 'war-room', 'completed', 'War Room partial (some agents failed)')
      }

      // ── Step 4: Assembly ───────────────────────────────────────────────────
      const appPath = await this.runStep('assembly', opts, async () => {
        return this.assembleApp({
          appName: opts.appName,
          blueprint,
          architectResult,
          warRoomResult,
          description,
        })
      })
      this.emit(opts, 'assembly', 'completed', `App assembled at ${appPath}`)

      // ── Step 4.5: Export (optional) ────────────────────────────────────────
      if (opts.exportPlatform) {
        try {
          await this.runStep('export', opts, async () => {
            const { FlutterFlowAdapter, BubbleAdapter, WebflowAdapter, RetoolAdapter, ZapierAdapter } = await import('./nocode-adapters/index.js')
            
            let adapter;
            switch (opts.exportPlatform?.toLowerCase()) {
              case 'flutterflow': adapter = new FlutterFlowAdapter(); break;
              case 'bubble': adapter = new BubbleAdapter(); break;
              case 'webflow': adapter = new WebflowAdapter(); break;
              case 'retool': adapter = new RetoolAdapter(); break;
              case 'zapier': adapter = new ZapierAdapter(); break;
              default: throw new Error(`Unsupported export platform: ${opts.exportPlatform}`);
            }

            const exportResult = adapter.convert({
              appName: opts.appName,
              description,
              sqlSchema: (architectResult.sqlSchema as string) || '',
              apiSpec: JSON.stringify(architectResult.apiSpec || {}),
              features: blueprint.coreFeatures,
              pricingModel: 'Subscription',
              techStack: blueprint.blocks
            });

            const exportPath = path.join(appPath, `export-${opts.exportPlatform}.${exportResult.format}`);
            await fs.writeFile(exportPath, exportResult.content);
            
            return exportPath;
          })
          this.emit(opts, 'export', 'completed', `Exported to ${opts.exportPlatform}`)
        } catch (err) {
          this.log.warn({ err }, 'Export failed (non-fatal)')
          this.emit(opts, 'export', 'failed', `Export to ${opts.exportPlatform} failed`)
        }
      }

      // ── Step 5: Deploy (optional) ──────────────────────────────────────────
      let deployUrl: string | undefined
      if (!opts.skipDeploy) {
        try {
          deployUrl = await this.runStep('deployment', opts, async () => {
            const { CoolifyDeployAgent } = await import('./coolify-deploy-agent.js')
            const deployer = new CoolifyDeployAgent()
            const result = await deployer.deploy({ appName: opts.appName, appPath })
            return result.url
          })
          this.emit(opts, 'deployment', 'completed', `Deployed to ${deployUrl}`)
        } catch (err) {
          this.log.warn({ err }, 'Deployment failed (non-fatal)')
          this.emit(opts, 'deployment', 'failed', 'Deployment skipped (configure COOLIFY_TOKEN to enable)')
        }
      }

      // ── Step 6: Learning ───────────────────────────────────────────────────
      try {
        await this.runStep('learning', opts, async () => {
          const { AutonomousLearningLoop } = await import('./autonomous-learning-loop.js')
          const loop = new AutonomousLearningLoop()
          await loop.initialize()
          await loop.recordOutcome({
            generation_id: `gen-${opts.appName}-${Date.now()}`,
            saas_description: opts.description || opts.niche || opts.appName,
            timestamp: new Date().toISOString(),
            assembler_success: true,
            deploy_success: false,
            agent_errors: [],
            blocks_used: blueprint.blocks,
            sql_tables_count: blueprint.databaseTables.length,
            components_generated: 0,
            generation_time_ms: Date.now() - this.startTime,
            typescript_errors: 0,
            missing_blocks: [],
          })
        })
        this.emit(opts, 'learning', 'completed', 'Generation stored in memory for future learning')
      } catch {
        // Learning failure is always non-fatal
      }

      const totalCostUsd = costTracker.getSummary().totalCostUSD
      const totalDurationMs = Date.now() - this.startTime

      this.log.info({ appName: opts.appName, totalDurationMs, totalCostUsd }, 'Generation complete')

      return {
        success: true,
        appName: opts.appName,
        appPath,
        niche: blueprint.niche,
        blueprint,
        deployUrl,
        totalCostUsd,
        totalDurationMs,
        steps: this.steps,
      }

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.log.error({ err, appName: opts.appName }, 'Generation failed')

      return {
        success: false,
        appName: opts.appName,
        appPath: '',
        niche: opts.niche || opts.description || opts.appName,
        blueprint: {} as NicheBlueprint,
        totalCostUsd: 0,
        totalDurationMs: Date.now() - this.startTime,
        steps: this.steps,
        error,
      }
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async runStep<T>(
    step: GenerationStep,
    opts: GenerateOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    this.emit(opts, step, 'started', `Starting ${step}...`)
    try {
      const result = await withRetry(fn, {
        maxAttempts: 2,
        baseDelayMs: 1000,
        onRetry: (attempt, err) => {
          this.log.warn({ step, attempt, err: err.message }, 'Retrying step')
        },
      })
      return result
    } catch (err) {
      this.emit(opts, step, 'failed', `${step} failed: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  private emit(
    opts: GenerateOptions,
    step: GenerationStep,
    status: ProgressEvent['status'],
    message: string,
    data?: unknown
  ) {
    const event: ProgressEvent = {
      step,
      status,
      message,
      data,
      timestamp: new Date(),
      elapsedMs: Date.now() - this.startTime,
    }
    this.steps.push(event)
    opts.onProgress?.(event)
    this.log.info({ step, status, elapsedMs: event.elapsedMs }, message)
  }

  /**
   * Physically scaffold the app in apps/ directory
   */
  private async assembleApp(params: {
    appName: string
    blueprint: NicheBlueprint
    architectResult: Record<string, unknown>
    warRoomResult: Record<string, unknown>
    description: string
  }): Promise<string> {
    const { appName, blueprint, architectResult, description } = params
    const appsDir = path.resolve(process.cwd(), 'apps')
    const appPath = path.join(appsDir, appName)

    // Create app directory structure
    await fs.mkdir(appPath, { recursive: true })
    await fs.mkdir(path.join(appPath, 'src'), { recursive: true })
    await fs.mkdir(path.join(appPath, 'src', 'app'), { recursive: true })
    await fs.mkdir(path.join(appPath, 'src', 'components'), { recursive: true })
    await fs.mkdir(path.join(appPath, 'supabase', 'migrations'), { recursive: true })

    // Write package.json
    const packageJson = {
      name: `@saas-factory/${appName}`,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        'db:push': 'supabase db push',
      },
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0',
        '@supabase/supabase-js': '^2.0.0',
        '@supabase/ssr': '^0.0.10',
        '@saas-factory/shared-types': 'workspace:*',
        ...blueprint.blocks.reduce((acc: Record<string, string>, block) => {
          acc[`@saas-factory/block-${block}`] = 'workspace:*'
          return acc
        }, {}),
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/react': '^18.0.0',
        '@types/node': '^20.0.0',
        tailwindcss: '^3.0.0',
      },
    }
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )

    // Write .env.local
    const envContent = [
      `# Auto-generated by factory generate --niche "${blueprint.niche}"`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Supabase (shared instance — use your org schema)',
      'NEXT_PUBLIC_SUPABASE_URL=',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=',
      'SUPABASE_SERVICE_ROLE_KEY=',
      `SUPABASE_SCHEMA=${appName.replace(/-/g, '_')}`,
      '',
      '# App',
      `NEXT_PUBLIC_APP_NAME="${blueprint.suggestedAppName}"`,
      `NEXT_PUBLIC_APP_TAGLINE="${blueprint.suggestedTagline}"`,
      '',
      '# Stripe (if payments block enabled)',
      blueprint.blocks.includes('payments') ? 'STRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\nNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=' : '# Stripe not enabled for this niche',
      '',
      '# OpenAI (if ai-chat block enabled)',
      blueprint.blocks.includes('ai-chat') ? 'OPENAI_API_KEY=' : '# OpenAI not enabled for this niche',
    ].join('\n')
    await fs.writeFile(path.join(appPath, '.env.local'), envContent)
    await fs.writeFile(path.join(appPath, '.env.example'), envContent)

    // Write SQL migration
    const sqlSchema = (architectResult.sqlSchema as string) || this.generateFallbackSQL(blueprint)
    await fs.writeFile(
      path.join(appPath, 'supabase', 'migrations', '001_initial_schema.sql'),
      sqlSchema
    )

    // Write factory.manifest.json
    const manifest = {
      name: appName,
      niche: blueprint.niche,
      category: blueprint.category,
      blocks: blueprint.blocks,
      coreFeatures: blueprint.coreFeatures,
      suggestedAppName: blueprint.suggestedAppName,
      suggestedTagline: blueprint.suggestedTagline,
      pricingModel: blueprint.pricingModel,
      targetPersona: blueprint.targetPersona,
      estimatedComplexity: blueprint.estimatedComplexity,
      generatedAt: new Date().toISOString(),
      generatedBy: 'factory-cli',
      version: '1.0.0',
    }
    await fs.writeFile(
      path.join(appPath, 'factory.manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    // Write README
    const readme = [
      `# ${blueprint.suggestedAppName}`,
      '',
      `> ${blueprint.suggestedTagline}`,
      '',
      `Generated by **SaaS Factory** from niche: \`${blueprint.niche}\``,
      '',
      '## Quick Start',
      '',
      '```bash',
      '# 1. Install dependencies',
      'pnpm install',
      '',
      '# 2. Configure environment',
      'cp .env.example .env.local',
      '# Edit .env.local with your Supabase credentials',
      '',
      '# 3. Run database migrations',
      'pnpm db:push',
      '',
      '# 4. Start development server',
      'pnpm dev',
      '```',
      '',
      '## Enabled Blocks',
      '',
      blueprint.blocks.map(b => `- \`@saas-factory/block-${b}\``).join('\n'),
      '',
      '## Core Features',
      '',
      blueprint.coreFeatures.map(f => `- ${f}`).join('\n'),
      '',
      '## Database Tables',
      '',
      blueprint.databaseTables.map(t => `- \`${t}\``).join('\n'),
      '',
      `---`,
      `*Generated by SaaS Factory on ${new Date().toISOString()}*`,
    ].join('\n')
    await fs.writeFile(path.join(appPath, 'README.md'), readme)

    return appPath
  }

  /**
   * Generate fallback SQL schema from blueprint tables
   */
  private generateFallbackSQL(blueprint: NicheBlueprint): string {
    const lines = [
      `-- Auto-generated schema for ${blueprint.niche}`,
      `-- Generated: ${new Date().toISOString()}`,
      '',
      '-- Enable pgvector for AI features',
      'CREATE EXTENSION IF NOT EXISTS vector;',
      '',
    ]

    for (const table of blueprint.databaseTables) {
      lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`)
      lines.push(`  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`)
      lines.push(`  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,`)
      lines.push(`  created_at  timestamptz NOT NULL DEFAULT now(),`)
      lines.push(`  updated_at  timestamptz NOT NULL DEFAULT now()`)
      lines.push(`);`)
      lines.push('')
      lines.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
      lines.push(`CREATE POLICY "${table}_org_isolation" ON ${table}`)
      lines.push(`  USING (org_id = current_setting('app.current_org_id')::uuid);`)
      lines.push('')
    }

    return lines.join('\n')
  }
}
