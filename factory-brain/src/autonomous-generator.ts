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
          const orchestrator = new WarRoomOrchestrator()
          return orchestrator.runFullPipeline({
            description,
            appName: opts.appName,
            orgId: opts.orgId || 'cli-default',
            blueprint: architectResult,
            skipQA: opts.skipQA,
          })
        })
        this.emit(opts, 'war-room', 'completed',
          `War Room complete: ${(warRoomResult as any).agentsRun || 5} agents finished`)
      } catch (err) {
        this.log.warn({ err }, 'WarRoom failed, continuing with assembly')
        warRoomResult = { growthPlan: null, legalDocs: null, qaTests: null }
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
          await loop.recordGeneration({
            appName: opts.appName,
            niche: blueprint.niche,
            blocks: blueprint.blocks,
            success: true,
            durationMs: Date.now() - this.startTime,
          })
        })
        this.emit(opts, 'learning', 'completed', 'Generation stored in memory for future learning')
      } catch {
        // Learning failure is always non-fatal
      }

      const totalCostUsd = costTracker.getSessionCost(sessionId)
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
