/**
 * Factory CLI — Autonomous command-line interface for SaaS Factory OS
 *
 * The `generate` command now runs agents DIRECTLY (no HTTP dependency).
 * The `create` command scaffolds apps locally with schema provisioning.
 *
 * Usage:
 *   factory generate --niche "teretana-crm" --name my-gym
 *   factory generate --desc "Booking SaaS for salons" --name salon-sync
 *   factory create --name salon-sync --blocks auth,payments,calendar
 *   factory status --job <jobId>
 *   factory deploy --app salon-sync
 *   factory memory query --q "What do we know about booking systems?"
 *   factory simulate --desc "Booking SaaS" --users 1000
 *   factory costs
 *   factory fleet
 *   factory migrate --app salon-sync
 *   factory niche-list
 *   factory niche-map --niche "teretana-crm"
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'

const program = new Command()

// ── Helpers ───────────────────────────────────────────────────────────────────

const DASHBOARD_URL = process.env.FACTORY_DASHBOARD_URL || 'http://localhost:3000'
const API_TOKEN = process.env.FACTORY_API_TOKEN || ''

async function apiCall(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown
): Promise<unknown> {
  const url = `${DASHBOARD_URL}/api/${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': API_TOKEN || 'cli-user',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`)
  }

  return res.json()
}

function printTable(rows: Record<string, unknown>[]): void {
  if (!rows.length) {
    console.log(chalk.dim('  (no results)'))
    return
  }
  const keys = Object.keys(rows[0])
  const widths = keys.map(k =>
    Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length))
  )
  const header = keys.map((k, i) => k.padEnd(widths[i])).join('  ')
  const divider = widths.map(w => '─'.repeat(w)).join('  ')
  console.log(chalk.bold('  ' + header))
  console.log(chalk.dim('  ' + divider))
  rows.forEach(r => {
    console.log('  ' + keys.map((k, i) => String(r[k] ?? '').padEnd(widths[i])).join('  '))
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

async function pollJobStatus(jobId: string): Promise<void> {
  const spinner = ora('Waiting for job to complete...').start()
  let lastStatus = ''

  while (true) {
    await new Promise(r => setTimeout(r, 3000))

    try {
      const result = await apiCall(`queue/status?jobId=${jobId}`, 'GET') as Record<string, unknown>
      const status = result.status as string

      if (status !== lastStatus) {
        lastStatus = status
        if (status === 'queued') {
          spinner.text = chalk.yellow(`⏳ Queued — position ${result.queuePosition}, ~${result.estimatedWaitMinutes}min wait`)
        } else if (status === 'running') {
          spinner.text = chalk.blue('🔄 Running — War Room agents are working...')
        } else if (status === 'retrying') {
          spinner.text = chalk.yellow(`⚠️  Retrying (attempt ${result.attempts})...`)
        }
      }

      if (status === 'completed') {
        spinner.succeed(chalk.green('✅ Generation complete!'))
        console.log(chalk.bold('\n📦 Result:'))
        console.log(JSON.stringify(result.result, null, 2))
        return
      }

      if (status === 'failed') {
        spinner.fail(chalk.red(`❌ Job failed: ${result.error}`))
        process.exit(1)
      }

      if (status === 'cancelled') {
        spinner.warn(chalk.yellow('⚠️  Job was cancelled'))
        return
      }
    } catch (err) {
      spinner.text = chalk.dim(`Polling... (${err instanceof Error ? err.message : 'network error'})`)
    }
  }
}

// ── Program ───────────────────────────────────────────────────────────────────

program
  .name('factory')
  .description('🏭 SaaS Factory OS — Build AI-powered SaaS applications automatically')
  .version('2.0.0')

// ── generate (AUTONOMOUS — no HTTP required) ──────────────────────────────────

program
  .command('generate')
  .description('Generate a new SaaS application (runs agents directly — no server required)')
  .option('--niche <niche>', 'Niche shorthand (e.g. "teretana-crm", "salon-booking")')
  .option('--desc <description>', 'Free-form SaaS description')
  .requiredOption('--name <appName>', 'App name (lowercase, hyphens only, e.g. my-gym)')
  .option('--org <orgId>', 'Organization ID (UUID)', 'cli-org-default')
  .option('--skip-deploy', 'Skip deployment step')
  .option('--skip-qa', 'Skip QA testing step')
  .option('--style <style>', 'Visual style preset: minimalist | corporate | cyberpunk | playful | elegant | brutalism')
  .option('--color <hex>', 'Primary brand color (hex, e.g. #3b82f6)')
  .option('--export <platform>', 'Export to no-code platform (bubble, flutterflow, webflow, retool, zapier)')
  .option('--api', 'Use API mode (requires factory-dashboard to be running)')
  .option('--priority <1-10>', 'Queue priority for API mode (1=low, 10=high)', '5')
  .option('--wait', 'Wait for job to complete in API mode')
  .action(async (opts) => {
    if (!/^[a-z0-9-]+$/.test(opts.name)) {
      console.error(chalk.red('✗ App name must be lowercase alphanumeric with hyphens only'))
      process.exit(1)
    }

    if (!opts.niche && !opts.desc) {
      console.error(chalk.red('✗ Either --niche or --desc is required'))
      console.error(chalk.dim('  Examples:'))
      console.error(chalk.dim('    factory generate --niche "teretana-crm" --name my-gym'))
      console.error(chalk.dim('    factory generate --desc "A booking app for yoga studios" --name yoga-sync'))
      process.exit(1)
    }

    // ── API mode (legacy, requires dashboard running) ──────────────────────
    if (opts.api) {
      const spinner = ora('Enqueueing generation job...').start()
      try {
        const result = await apiCall('queue/enqueue', 'POST', {
          saasDescription: opts.desc || `A ${opts.niche?.replace(/-/g, ' ')} SaaS application`,
          appName: opts.name,
          orgId: opts.org,
          priority: parseInt(opts.priority),
          options: {
            skipDeploy: opts.skipDeploy || false,
            skipQA: opts.skipQa || false,
          },
        }) as Record<string, unknown>

        spinner.succeed(chalk.green(`✅ Job enqueued: ${result.jobId}`))
        console.log(chalk.bold('\n📋 Job Details:'))
        console.log(`  Job ID:        ${chalk.cyan(result.jobId as string)}`)
        console.log(`  Status:        ${chalk.yellow(result.status as string)}`)
        console.log(`  Queue pos:     ${result.queuePosition}`)
        console.log(`  Est. wait:     ~${result.estimatedWaitMinutes} minutes`)
        const qs = result.queueStats as Record<string, unknown>
        console.log(`  Queue size:    ${qs?.queued} queued, ${qs?.running} running`)
        console.log(chalk.dim(`\n  Track status: factory status --job ${result.jobId}`))

        if (opts.wait) {
          console.log()
          await pollJobStatus(result.jobId as string)
        }
      } catch (err) {
        spinner.fail(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
        process.exit(1)
      }
      return
    }

    // ── Autonomous mode (default — runs agents directly) ───────────────────
    console.log(chalk.bold(`\n🏭 SaaS Factory — Autonomous Generation\n`))
    console.log(`  App:    ${chalk.cyan(opts.name)}`)
    if (opts.niche) console.log(`  Niche:  ${chalk.cyan(opts.niche)}`)
    if (opts.desc) console.log(`  Desc:   ${chalk.dim(opts.desc)}`)
    if (opts.style) console.log(`  Style:  ${chalk.magenta(opts.style)}`)
    if (opts.color) console.log(`  Color:  ${chalk.hex(opts.color || '#6366f1')(opts.color || 'auto')}`)
    console.log(`  Org:    ${chalk.dim(opts.org)}`)
    console.log()

    // Dynamically import factory-brain to avoid loading it if not needed
    let AutonomousGenerator: typeof import('../../factory-brain/src/autonomous-generator.js').AutonomousGenerator
    try {
      const mod = await import('../../factory-brain/src/autonomous-generator.js')
      AutonomousGenerator = mod.AutonomousGenerator
    } catch {
      // Try relative path from monorepo root
      try {
        const mod = await import('../../../factory-brain/src/autonomous-generator.js')
        AutonomousGenerator = mod.AutonomousGenerator
      } catch (err2) {
        console.error(chalk.red('✗ Could not load factory-brain. Make sure you run from the monorepo root.'))
        console.error(chalk.dim(`  Error: ${err2 instanceof Error ? err2.message : String(err2)}`))
        process.exit(1)
      }
    }

    const stepSpinners: Record<string, ReturnType<typeof ora>> = {}

    const generator = new AutonomousGenerator()
    const result = await generator.generate({
      niche: opts.niche,
      description: opts.desc,
      appName: opts.name,
      orgId: opts.org,
      skipDeploy: opts.skipDeploy || false,
      skipQA: opts.skipQa || false,
      style: opts.style,
      themeColor: opts.color,
      exportPlatform: opts.export,
      onProgress: (event) => {
        const stepLabel = event.step.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const key = event.step

        if (event.status === 'started') {
          stepSpinners[key] = ora(`  ${stepLabel}...`).start()
        } else if (event.status === 'completed') {
          stepSpinners[key]?.succeed(chalk.green(`  ✅ ${stepLabel} — ${event.message}`))
        } else if (event.status === 'failed') {
          stepSpinners[key]?.warn(chalk.yellow(`  ⚠️  ${stepLabel} — ${event.message}`))
        }
      },
    })

    console.log()

    if (result.success) {
      console.log(chalk.bold.green('🎉 Generation Complete!\n'))
      console.log(`  App:          ${chalk.cyan(result.appName)}`)
      console.log(`  Niche:        ${chalk.dim(result.niche)}`)
      console.log(`  Path:         ${chalk.cyan(result.appPath)}`)
      if (opts.style || opts.color) {
        console.log(`  Design:       ${chalk.magenta(opts.style || 'auto')} ${opts.color ? chalk.hex(opts.color)(opts.color) : ''}`)
      }
      if (result.deployUrl) {
        console.log(`  Live URL:     ${chalk.cyan(result.deployUrl)}`)
      }
      console.log(`  Duration:     ${chalk.dim(formatDuration(result.totalDurationMs))}`)
      if (result.totalCostUsd > 0) {
        console.log(`  AI Cost:      ${chalk.dim(`$${result.totalCostUsd.toFixed(4)}`)}`)
      }

      if (result.blueprint?.blocks?.length) {
        console.log(`\n  Blocks:       ${chalk.dim(result.blueprint.blocks.join(', '))}`)
      }
      if (result.blueprint?.coreFeatures?.length) {
        console.log(`\n  Features:`)
        result.blueprint.coreFeatures.slice(0, 5).forEach(f => {
          console.log(`    ${chalk.dim('•')} ${f}`)
        })
      }

      console.log(chalk.bold('\n  Next steps:\n'))
      console.log(`  ${chalk.dim('1.')} Edit ${chalk.cyan(`${result.appPath}/.env.local`)} with your Supabase + Stripe keys`)
      console.log(`  ${chalk.dim('2.')} Run ${chalk.cyan(`cd ${result.appPath} && pnpm dev`)} to start development`)
      if (!opts.skipDeploy && !result.deployUrl) {
        console.log(`  ${chalk.dim('3.')} Set ${chalk.cyan('COOLIFY_TOKEN')} env var and run ${chalk.cyan(`factory deploy --app ${opts.name}`)}`)
      }
      console.log()
    } else {
      console.log(chalk.bold.red('❌ Generation Failed\n'))
      console.log(`  Error: ${chalk.red(result.error || 'Unknown error')}`)
      console.log()
      process.exit(1)
    }
  })

// ── niche-list ────────────────────────────────────────────────────────────────

program
  .command('niche-list')
  .description('List all built-in niche templates')
  .action(async () => {
    const { NicheMapper } = await import('../../factory-brain/src/niche-mapper.js').catch(
      () => import('../../../factory-brain/src/niche-mapper.js')
    )

    console.log(chalk.bold('\n📋 Built-in Niche Templates:\n'))

    const niches = [
      { niche: 'teretana-crm', category: 'Fitness & Wellness', complexity: 'medium' },
      { niche: 'gym-crm', category: 'Fitness & Wellness', complexity: 'medium' },
      { niche: 'yoga-studio', category: 'Fitness & Wellness', complexity: 'simple' },
      { niche: 'salon-booking', category: 'Hospitality & Booking', complexity: 'medium' },
      { niche: 'restaurant-management', category: 'Hospitality & Booking', complexity: 'complex' },
      { niche: 'hotel-management', category: 'Hospitality & Booking', complexity: 'complex' },
      { niche: 'online-store', category: 'E-commerce & Retail', complexity: 'complex' },
      { niche: 'subscription-box', category: 'E-commerce & Retail', complexity: 'medium' },
      { niche: 'freelancer-crm', category: 'Professional Services', complexity: 'medium' },
      { niche: 'law-firm-crm', category: 'Professional Services', complexity: 'complex' },
      { niche: 'accounting-saas', category: 'Finance & Accounting', complexity: 'complex' },
      { niche: 'online-course-platform', category: 'Education & Learning', complexity: 'complex' },
      { niche: 'tutoring-platform', category: 'Education & Learning', complexity: 'medium' },
      { niche: 'clinic-management', category: 'Healthcare', complexity: 'complex' },
      { niche: 'property-management', category: 'Real Estate', complexity: 'complex' },
      { niche: 'hr-management', category: 'HR & Recruitment', complexity: 'complex' },
      { niche: 'ats-recruiting', category: 'HR & Recruitment', complexity: 'complex' },
      { niche: 'email-marketing', category: 'Marketing & Analytics', complexity: 'complex' },
      { niche: 'project-management', category: 'Project Management', complexity: 'complex' },
    ]

    printTable(niches.map(n => ({
      'Niche': n.niche,
      'Category': n.category,
      'Complexity': n.complexity,
    })))

    console.log(chalk.dim('\n  For any other niche, the LLM will auto-map it.'))
    console.log(chalk.dim('  Example: factory generate --niche "pet-grooming-crm" --name pet-app\n'))
  })

// ── niche-map ─────────────────────────────────────────────────────────────────

program
  .command('niche-map')
  .description('Preview the blueprint for a niche without generating')
  .requiredOption('--niche <niche>', 'Niche to map (e.g. "teretana-crm")')
  .action(async (opts) => {
    const spinner = ora(`Mapping niche: ${opts.niche}...`).start()

    try {
      const { NicheMapper } = await import('../../factory-brain/src/niche-mapper.js').catch(
        () => import('../../../factory-brain/src/niche-mapper.js')
      )
      const mapper = new NicheMapper()
      const blueprint = await mapper.mapNiche(opts.niche)
      spinner.stop()

      console.log(chalk.bold(`\n🗺️  Niche Blueprint: ${chalk.cyan(blueprint.niche)}\n`))
      console.log(`  Category:     ${chalk.dim(blueprint.category)}`)
      console.log(`  App Name:     ${chalk.cyan(blueprint.suggestedAppName)}`)
      console.log(`  Tagline:      ${chalk.dim(blueprint.suggestedTagline)}`)
      console.log(`  Pricing:      ${chalk.dim(blueprint.pricingModel)}`)
      console.log(`  Complexity:   ${chalk.dim(blueprint.estimatedComplexity)}`)
      console.log(`  Persona:      ${chalk.dim(blueprint.targetPersona)}`)
      console.log(`  Confidence:   ${chalk.dim(`${(blueprint.confidence * 100).toFixed(0)}%`)}`)
      console.log(`\n  Blocks:`)
      blueprint.blocks.forEach(b => console.log(`    ${chalk.dim('•')} ${b}`))
      console.log(`\n  Core Features:`)
      blueprint.coreFeatures.forEach(f => console.log(`    ${chalk.dim('•')} ${f}`))
      console.log(`\n  Database Tables:`)
      blueprint.databaseTables.forEach(t => console.log(`    ${chalk.dim('•')} ${t}`))
      console.log()
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── status ────────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check job status or overall queue stats (requires factory-dashboard)')
  .option('--job <jobId>', 'Specific job ID to check')
  .option('--watch', 'Watch job until completion')
  .action(async (opts) => {
    if (opts.job) {
      const spinner = ora('Fetching job status...').start()
      try {
        const result = await apiCall(`queue/status?jobId=${opts.job}`, 'GET') as Record<string, unknown>
        spinner.stop()

        const statusColor: Record<string, (s: string) => string> = {
          queued: chalk.yellow,
          running: chalk.blue,
          completed: chalk.green,
          failed: chalk.red,
          retrying: chalk.yellow,
          cancelled: chalk.dim,
        }
        const colorFn = statusColor[result.status as string] || chalk.white

        console.log(chalk.bold('\n📋 Job Status:'))
        console.log(`  Job ID:     ${chalk.cyan(result.jobId as string)}`)
        console.log(`  Status:     ${colorFn(result.status as string)}`)
        if (result.queuePosition) console.log(`  Position:   ${result.queuePosition}`)
        if (result.estimatedWaitMs) console.log(`  Est. wait:  ~${Math.ceil((result.estimatedWaitMs as number) / 60000)} min`)
        if (result.attempts) console.log(`  Attempts:   ${result.attempts}`)
        if (result.durationMs) console.log(`  Duration:   ${formatDuration(result.durationMs as number)}`)
        if (result.error) console.log(`  Error:      ${chalk.red(result.error as string)}`)
        if (result.result) {
          console.log(chalk.bold('\n📦 Result:'))
          console.log(JSON.stringify(result.result, null, 2))
        }

        if (opts.watch && !['completed', 'failed', 'cancelled'].includes(result.status as string)) {
          console.log()
          await pollJobStatus(opts.job)
        }
      } catch (err) {
        spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
        process.exit(1)
      }
    } else {
      const spinner = ora('Fetching queue stats...').start()
      try {
        const stats = await apiCall('queue/stats', 'GET') as Record<string, unknown>
        spinner.stop()
        console.log(chalk.bold('\n📊 SaaS Factory Queue Stats:\n'))
        printTable([{
          'Queued': stats.queued,
          'Running': stats.running,
          'Completed': stats.completed,
          'Failed': stats.failed,
          'Avg Processing': `${stats.avgProcessingMinutes}min`,
          'Throughput/hr': stats.throughputPerHour,
        }])
        console.log()
      } catch (err) {
        spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
        process.exit(1)
      }
    }
  })

// ── cancel ────────────────────────────────────────────────────────────────────

program
  .command('cancel <jobId>')
  .description('Cancel a queued job')
  .action(async (jobId: string) => {
    const spinner = ora(`Cancelling job ${jobId}...`).start()
    try {
      const result = await apiCall('queue/cancel', 'POST', { jobId }) as Record<string, unknown>
      if (result.success) {
        spinner.succeed(chalk.green(`✅ Job ${jobId} cancelled`))
      } else {
        spinner.fail(chalk.red('✗ Could not cancel job (may already be running)'))
      }
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── deploy ────────────────────────────────────────────────────────────────────

program
  .command('deploy')
  .description('Deploy a generated SaaS app to Coolify')
  .requiredOption('--app <appName>', 'App name to deploy')
  .option('--env <environment>', 'Target environment', 'production')
  .option('--repo <repoUrl>', 'Git repository URL')
  .action(async (opts) => {
    const spinner = ora(`Deploying ${opts.app} to ${opts.env}...`).start()
    try {
      const result = await apiCall('deploy-coolify', 'POST', {
        appName: opts.app,
        environment: opts.env,
        gitRepository: opts.repo || `https://github.com/your-org/${opts.app}`,
      }) as Record<string, unknown>

      spinner.succeed(chalk.green(`✅ Deployment initiated for ${opts.app}`))
      if (result.deploymentUrl) {
        console.log(`  🌐 URL: ${chalk.cyan(result.deploymentUrl as string)}`)
      }
    } catch (err) {
      spinner.fail(chalk.red(`✗ Deploy failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── memory ────────────────────────────────────────────────────────────────────

program
  .command('memory')
  .description('Interact with the Always-On Memory system')
  .argument('<action>', 'Action: query | ingest | stats | list')
  .option('--q <question>', 'Question to ask the memory system')
  .option('--text <content>', 'Text content to ingest')
  .option('--source <source>', 'Source label for ingested content', 'cli')
  .option('--limit <n>', 'Number of results to return', '5')
  .action(async (action: string, opts) => {
    const spinner = ora(`Memory: ${action}...`).start()

    try {
      if (action === 'query') {
        if (!opts.q) { spinner.fail(chalk.red('✗ --q required')); process.exit(1) }
        const result = await apiCall('memory/query', 'POST', { query: opts.q, limit: parseInt(opts.limit) }) as Record<string, unknown>
        spinner.stop()
        console.log(chalk.bold('\n🧠 Memory Answer:\n'))
        console.log(result.answer as string)
        if (Array.isArray(result.sources) && result.sources.length > 0) {
          console.log(chalk.dim(`\n  Sources: ${result.sources.join(', ')}`))
        }
        if (result.confidence) {
          console.log(chalk.dim(`  Confidence: ${((result.confidence as number) * 100).toFixed(0)}%`))
        }
      } else if (action === 'ingest') {
        if (!opts.text) { spinner.fail(chalk.red('✗ --text required')); process.exit(1) }
        const result = await apiCall('memory/ingest', 'POST', { content: opts.text, source: opts.source, contentType: 'text' }) as Record<string, unknown>
        spinner.succeed(chalk.green(`✅ Ingested memory: ${result.memoryId}`))
      } else if (action === 'stats') {
        const result = await apiCall('memory/stats', 'GET') as Record<string, unknown>
        spinner.stop()
        console.log(chalk.bold('\n📊 Memory Stats:\n'))
        printTable([result])
        console.log()
      } else if (action === 'list') {
        const result = await apiCall('memory/memories', 'GET') as Record<string, unknown>
        spinner.stop()
        const memories = result.memories as Record<string, unknown>[]
        console.log(chalk.bold(`\n🧠 Memories (${memories?.length || 0}):\n`))
        memories?.slice(0, parseInt(opts.limit)).forEach((m, i) => {
          console.log(`  ${chalk.cyan(String(i + 1))}. [${m.source_type}] ${String(m.content).slice(0, 80)}...`)
        })
      } else {
        spinner.fail(chalk.red(`✗ Unknown action: ${action}. Use: query | ingest | stats | list`))
        process.exit(1)
      }
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── simulate ──────────────────────────────────────────────────────────────────

program
  .command('simulate')
  .description('Run MiroFish market simulation for a SaaS idea')
  .requiredOption('--desc <description>', 'SaaS description to simulate')
  .option('--users <count>', 'Number of simulated users', '500')
  .option('--rounds <n>', 'Simulation rounds', '10')
  .action(async (opts) => {
    const spinner = ora(`Simulating market with ${opts.users} agents...`).start()
    try {
      const result = await apiCall('simulate-market', 'POST', {
        saasDescription: opts.desc,
        userCount: parseInt(opts.users),
        rounds: parseInt(opts.rounds),
      }) as Record<string, unknown>
      spinner.succeed(chalk.green('✅ Simulation complete!'))
      console.log(chalk.bold('\n📈 Simulation Results:\n'))
      console.log(result.summary ? result.summary as string : JSON.stringify(result, null, 2))
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── costs ─────────────────────────────────────────────────────────────────────

program
  .command('costs')
  .description('Show AI API cost summary')
  .option('--since <date>', 'Start date (YYYY-MM-DD)')
  .action(async (opts) => {
    const spinner = ora('Fetching cost summary...').start()
    try {
      const url = opts.since ? `cost-summary?since=${opts.since}` : 'cost-summary'
      const result = await apiCall(url, 'GET') as Record<string, unknown>
      spinner.stop()
      console.log(chalk.bold('\n💰 AI API Cost Summary:\n'))
      if (result.summary) printTable([result.summary as Record<string, unknown>])
      else console.log(JSON.stringify(result, null, 2))
      console.log()
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── create ───────────────────────────────────────────────────────────────────

program
  .command('create')
  .description('Scaffold a new SaaS app locally from blocks (no AI, instant) with schema provisioning')
  .requiredOption('--name <appName>', 'App name (lowercase, hyphens only, e.g. salon-sync)')
  .option('--niche <niche>', 'Auto-select blocks from niche (e.g. "teretana-crm")')
  .option('--blocks <list>', 'Comma-separated blocks to include', 'auth,payments,analytics')
  .option('--template <name>', 'Base template to use', 'saas-001-booking')
  .option('--org <orgId>', 'Organization ID', 'my-org')
  .option('--schema <name>', 'PostgreSQL schema name (default: derived from app name)')
  .option('--provision-schema', 'Provision a new PostgreSQL schema for this app')
  .option('--skip-install', 'Skip pnpm install after scaffolding')
  .action(async (opts) => {
    if (!/^[a-z0-9-]+$/.test(opts.name)) {
      console.error(chalk.red('✗ App name must be lowercase alphanumeric with hyphens only'))
      process.exit(1)
    }

    // Auto-select blocks from niche if provided
    let blocks: string[]
    if (opts.niche) {
      const spinner0 = ora(`Mapping niche ${opts.niche}...`).start()
      try {
        const { NicheMapper } = await import('../../factory-brain/src/niche-mapper.js').catch(
          () => import('../../../factory-brain/src/niche-mapper.js')
        )
        const mapper = new NicheMapper()
        const blueprint = await mapper.mapNiche(opts.niche)
        blocks = blueprint.blocks
        spinner0.succeed(chalk.green(`✅ Niche mapped: ${blueprint.blocks.length} blocks selected`))
      } catch {
        spinner0.warn(chalk.yellow('⚠️  Niche mapping failed, using default blocks'))
        blocks = opts.blocks.split(',').map((b: string) => b.trim()).filter(Boolean)
      }
    } else {
      blocks = opts.blocks.split(',').map((b: string) => b.trim()).filter(Boolean)
    }

    const schemaName = opts.schema || opts.name.replace(/-/g, '_')
    const appDir = `apps/${opts.name}`

    console.log(chalk.bold(`\n🏭 SaaS Factory — Creating ${chalk.cyan(opts.name)}\n`))
    console.log(`  Template:  ${chalk.dim(opts.template)}`)
    console.log(`  Blocks:    ${chalk.dim(blocks.join(', '))}`)
    console.log(`  Schema:    ${chalk.dim(schemaName)}`)
    console.log(`  Output:    ${chalk.dim(appDir)}\n`)

    const { execSync, spawnSync } = await import('child_process')
    const fs = await import('fs')
    const path = await import('path')
    const rootDir = process.cwd()
    const targetDir = path.join(rootDir, appDir)

    // Step 1: Copy template
    const spinner1 = ora('Copying base template...').start()
    try {
      const templateDir = path.join(rootDir, 'apps', opts.template)
      if (!fs.existsSync(templateDir)) {
        spinner1.warn(chalk.yellow(`⚠️  Template not found: apps/${opts.template} — creating from scratch`))
        fs.mkdirSync(targetDir, { recursive: true })
        fs.mkdirSync(path.join(targetDir, 'src', 'app'), { recursive: true })
        fs.mkdirSync(path.join(targetDir, 'src', 'components'), { recursive: true })
      } else {
        if (fs.existsSync(targetDir)) {
          spinner1.fail(chalk.red(`✗ App already exists: ${appDir}`))
          process.exit(1)
        }
        execSync(`cp -r "${templateDir}" "${targetDir}"`, { stdio: 'pipe' })
      }
      // Update package.json name
      const pkgPath = path.join(targetDir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        pkg.name = `@saas-factory/${opts.name}`
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      }
      spinner1.succeed(chalk.green(`✅ App directory created → ${appDir}`))
    } catch (err) {
      spinner1.fail(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }

    // Step 2: Create .env file with schema config
    const spinner2 = ora('Generating .env file...').start()
    try {
      const envContent = [
        `# Auto-generated by factory create — ${new Date().toISOString()}`,
        `APP_NAME=${opts.name}`,
        `ORG_ID=${opts.org}`,
        `NEXT_PUBLIC_APP_NAME="${opts.name.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}"`,
        `NEXT_PUBLIC_ORG_ID=${opts.org}`,
        ``,
        `# Database (Supabase — Shared Instance with Schema Isolation)`,
        `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`,
        `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`,
        `SUPABASE_SCHEMA=${schemaName}`,
        ``,
        `# Payments (Stripe)`,
        `STRIPE_SECRET_KEY=sk_test_your-key`,
        `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key`,
        `STRIPE_WEBHOOK_SECRET=whsec_your-secret`,
        ``,
        `# AI (OpenAI)`,
        `OPENAI_API_KEY=sk-your-key`,
        ``,
        `# Blocks: ${blocks.join(', ')}`,
        ...blocks.map((b: string) => `NEXT_PUBLIC_BLOCK_${b.toUpperCase().replace(/-/g, '_')}_ENABLED=true`),
      ].join('\n')
      fs.writeFileSync(path.join(targetDir, '.env.local'), envContent + '\n')
      fs.writeFileSync(path.join(targetDir, '.env.example'), envContent + '\n')
      spinner2.succeed(chalk.green('✅ .env.local and .env.example generated'))
    } catch (err) {
      spinner2.fail(chalk.red(`✗ .env generation failed: ${err instanceof Error ? err.message : String(err)}`))
    }

    // Step 3: Generate block imports manifest
    const spinner3 = ora('Wiring blocks...').start()
    try {
      const blocksManifest = {
        appName: opts.name,
        orgId: opts.org,
        template: opts.template,
        schemaName,
        niche: opts.niche || null,
        blocks: blocks.reduce((acc: Record<string, { enabled: boolean; package: string }>, b: string) => {
          acc[b] = { enabled: true, package: `@saas-factory/block-${b}` }
          return acc
        }, {}),
        createdAt: new Date().toISOString(),
        createdBy: 'factory-cli',
      }
      const manifestPath = path.join(targetDir, 'factory.manifest.json')
      fs.writeFileSync(manifestPath, JSON.stringify(blocksManifest, null, 2) + '\n')

      // Update tailwind.config.ts to include block paths
      const tailwindPath = path.join(targetDir, 'tailwind.config.ts')
      if (fs.existsSync(tailwindPath)) {
        let tailwind = fs.readFileSync(tailwindPath, 'utf-8')
        const blockPaths = blocks.map((b: string) => `'../../blocks/${b}/src/**/*.{ts,tsx}'`).join(',\n      ')
        tailwind = tailwind.replace(
          /content:\s*\[/,
          `content: [\n      ${blockPaths},`
        )
        fs.writeFileSync(tailwindPath, tailwind)
      }
      spinner3.succeed(chalk.green(`✅ Blocks wired: ${blocks.join(', ')}`))
    } catch (err) {
      spinner3.fail(chalk.red(`✗ Block wiring failed: ${err instanceof Error ? err.message : String(err)}`))
    }

    // Step 4: Generate SQL migration with schema provisioning
    const spinner4 = ora('Generating database migration with schema provisioning...').start()
    try {
      const migrationsDir = path.join(targetDir, 'supabase', 'migrations')
      fs.mkdirSync(migrationsDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)

      const migrationContent = [
        `-- Migration for ${opts.name}`,
        `-- Generated by factory create on ${new Date().toISOString()}`,
        `-- Schema: ${schemaName}`,
        `-- Blocks: ${blocks.join(', ')}`,
        ``,
        `-- ─── Schema Provisioning ────────────────────────────────────────────────────`,
        `-- Creates an isolated PostgreSQL schema for this SaaS app.`,
        `-- All tables live in this schema, sharing one Supabase project.`,
        ``,
        `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
        ``,
        `-- Grant usage to authenticated users`,
        `GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;`,
        `GRANT USAGE ON SCHEMA ${schemaName} TO service_role;`,
        ``,
        `-- ─── Shared Auth (public schema) ────────────────────────────────────────────`,
        `-- Auth tables stay in public schema (shared across all SaaS apps)`,
        `-- Business data is isolated in the ${schemaName} schema`,
        ``,
        `-- ─── App Config Table ────────────────────────────────────────────────────────`,
        `CREATE TABLE IF NOT EXISTS ${schemaName}.config (`,
        `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
        `  org_id      uuid NOT NULL,`,
        `  key         text NOT NULL,`,
        `  value       jsonb,`,
        `  created_at  timestamptz DEFAULT now(),`,
        `  UNIQUE(org_id, key)`,
        `);`,
        ``,
        `ALTER TABLE ${schemaName}.config ENABLE ROW LEVEL SECURITY;`,
        ``,
        `CREATE POLICY "${schemaName}_config_org_isolation" ON ${schemaName}.config`,
        `  USING (org_id IN (`,
        `    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()`,
        `  ));`,
        ``,
        `-- ─── Block-specific Tables ───────────────────────────────────────────────────`,
        ...blocks.flatMap((b: string) => generateBlockSQL(b, schemaName)),
        ``,
        `-- ─── Search Path ─────────────────────────────────────────────────────────────`,
        `-- Set default search path for this app's connections`,
        `ALTER DATABASE postgres SET search_path TO ${schemaName}, public;`,
      ].join('\n')

      fs.writeFileSync(path.join(migrationsDir, `${timestamp}_init_${schemaName}.sql`), migrationContent + '\n')
      spinner4.succeed(chalk.green(`✅ Schema migration generated: ${schemaName}`))
    } catch (err) {
      spinner4.fail(chalk.red(`✗ Migration generation failed: ${err instanceof Error ? err.message : String(err)}`))
    }

    // Step 5: pnpm install
    if (!opts.skipInstall) {
      const spinner5 = ora('Installing dependencies (pnpm install)...').start()
      try {
        spawnSync('pnpm', ['install'], { cwd: targetDir, stdio: 'pipe' })
        spinner5.succeed(chalk.green('✅ Dependencies installed'))
      } catch {
        spinner5.warn(chalk.yellow(`⚠️  Install failed (run manually): pnpm install in ${appDir}`))
      }
    }

    // Done!
    console.log(chalk.bold(`\n🎉 App created successfully!\n`))
    console.log(`  📁 Location:   ${chalk.cyan(appDir)}`)
    console.log(`  📋 Manifest:   ${chalk.cyan(`${appDir}/factory.manifest.json`)}`)
    console.log(`  🗄️  Migration:  ${chalk.cyan(`${appDir}/supabase/migrations/`)}`)
    console.log(`  🔑 Env file:   ${chalk.cyan(`${appDir}/.env.local`)} ${chalk.dim('(fill in your keys)')}`)
    console.log(`  🏗️  Schema:     ${chalk.cyan(schemaName)} ${chalk.dim('(PostgreSQL schema isolation)')}`)
    console.log(chalk.bold(`\n  Next steps:\n`))
    console.log(`  ${chalk.dim('1.')} Edit ${chalk.cyan(`${appDir}/.env.local`)} with your Supabase + Stripe keys`)
    console.log(`  ${chalk.dim('2.')} Run ${chalk.cyan(`supabase db push`)} to provision the ${schemaName} schema`)
    console.log(`  ${chalk.dim('3.')} Run ${chalk.cyan(`cd ${appDir} && pnpm dev`)} to start development`)
    console.log(`  ${chalk.dim('4.')} Run ${chalk.cyan(`factory deploy --app ${opts.name}`)} to deploy to Coolify`)
    console.log(`  ${chalk.dim('5.')} Run ${chalk.cyan(`factory generate --niche "${opts.niche || 'your-niche'}" --name ${opts.name} --wait`)} to AI-enhance\n`)
  })

// Helper: generate block-specific SQL tables
function generateBlockSQL(block: string, schema: string): string[] {
  const blockTables: Record<string, string[]> = {
    payments: [
      `CREATE TABLE IF NOT EXISTS ${schema}.subscriptions (`,
      `  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
      `  org_id          uuid NOT NULL,`,
      `  stripe_sub_id   text,`,
      `  plan            text NOT NULL DEFAULT 'free',`,
      `  status          text NOT NULL DEFAULT 'active',`,
      `  current_period_end timestamptz,`,
      `  created_at      timestamptz DEFAULT now()`,
      `);`,
      `ALTER TABLE ${schema}.subscriptions ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "${schema}_subscriptions_isolation" ON ${schema}.subscriptions`,
      `  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));`,
      ``,
    ],
    calendar: [
      `CREATE TABLE IF NOT EXISTS ${schema}.events (`,
      `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
      `  org_id      uuid NOT NULL,`,
      `  title       text NOT NULL,`,
      `  start_at    timestamptz NOT NULL,`,
      `  end_at      timestamptz NOT NULL,`,
      `  created_by  uuid REFERENCES auth.users(id),`,
      `  created_at  timestamptz DEFAULT now()`,
      `);`,
      `ALTER TABLE ${schema}.events ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "${schema}_events_isolation" ON ${schema}.events`,
      `  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));`,
      ``,
    ],
    notifications: [
      `CREATE TABLE IF NOT EXISTS ${schema}.notifications (`,
      `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
      `  org_id      uuid NOT NULL,`,
      `  user_id     uuid REFERENCES auth.users(id),`,
      `  title       text NOT NULL,`,
      `  body        text,`,
      `  read        boolean DEFAULT false,`,
      `  created_at  timestamptz DEFAULT now()`,
      `);`,
      `ALTER TABLE ${schema}.notifications ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "${schema}_notifications_isolation" ON ${schema}.notifications`,
      `  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));`,
      ``,
    ],
    analytics: [
      `CREATE TABLE IF NOT EXISTS ${schema}.events_log (`,
      `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
      `  org_id      uuid NOT NULL,`,
      `  event_name  text NOT NULL,`,
      `  properties  jsonb,`,
      `  user_id     uuid,`,
      `  created_at  timestamptz DEFAULT now()`,
      `);`,
      `ALTER TABLE ${schema}.events_log ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "${schema}_events_log_isolation" ON ${schema}.events_log`,
      `  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));`,
      ``,
    ],
    storage: [
      `CREATE TABLE IF NOT EXISTS ${schema}.files (`,
      `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
      `  org_id      uuid NOT NULL,`,
      `  name        text NOT NULL,`,
      `  path        text NOT NULL,`,
      `  size        bigint,`,
      `  mime_type   text,`,
      `  uploaded_by uuid REFERENCES auth.users(id),`,
      `  created_at  timestamptz DEFAULT now()`,
      `);`,
      `ALTER TABLE ${schema}.files ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "${schema}_files_isolation" ON ${schema}.files`,
      `  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));`,
      ``,
    ],
  }
  return blockTables[block] || []
}

// ── fleet ─────────────────────────────────────────────────────────────────────

program
  .command('fleet')
  .description('Show status of all deployed SaaS applications')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const spinner = ora('Fetching fleet status...').start()
    try {
      const result = await apiCall('fleet/status', 'GET') as Record<string, unknown>
      spinner.stop()
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      const apps = result.apps as Record<string, unknown>[]
      console.log(chalk.bold(`\n🚀 Fleet Status (${apps?.length || 0} apps):\n`))
      apps?.forEach(app => {
        const statusIcon = app.status === 'healthy' ? chalk.green('●') :
          app.status === 'degraded' ? chalk.yellow('●') : chalk.red('●')
        console.log(`  ${statusIcon} ${chalk.bold(app.name as string).padEnd(25)} ${String(app.url || '').padEnd(40)} ${chalk.dim(app.lastDeploy as string || 'never')}`)
      })
      console.log()
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── migrate ───────────────────────────────────────────────────────────────────

program
  .command('migrate')
  .description('Run database migrations for one or all apps')
  .option('--app <appName>', 'Specific app to migrate (default: all)')
  .option('--dry-run', 'Show what would be migrated without running')
  .action(async (opts) => {
    const spinner = ora(opts.app ? `Migrating ${opts.app}...` : 'Migrating all apps...').start()
    try {
      const result = await apiCall('fleet/migrate', 'POST', {
        appName: opts.app || null,
        dryRun: opts.dryRun || false,
      }) as Record<string, unknown>
      spinner.stop()
      const results = result.results as Record<string, unknown>[]
      console.log(chalk.bold(`\n🗄️  Migration Results:\n`))
      results?.forEach(r => {
        const icon = r.status === 'success' ? chalk.green('✅') :
          r.status === 'skipped' ? chalk.dim('⏭️ ') : chalk.red('❌')
        console.log(`  ${icon} ${String(r.app).padEnd(30)} ${chalk.dim(r.message as string)}`)
      })
      console.log()
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── agents ───────────────────────────────────────────────────────────────────

program
  .command('agents')
  .description('List all available Agency Agents (26 specialized AI experts)')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    try {
      const { listAgents } = await import('../../factory-brain/src/agency-agent-loader.js').catch(
        () => import('../../../factory-brain/src/agency-agent-loader.js')
      )
      const agents = listAgents()

      if (opts.json) {
        console.log(JSON.stringify(agents, null, 2))
        return
      }

      console.log(chalk.bold(`\n🏢 SaaS Factory Agency Team (${agents.length} agents):\n`))

      const groups: Record<string, typeof agents> = {}
      for (const a of agents) {
        const prefix = a.filename.split('-')[0]
        if (!groups[prefix]) groups[prefix] = []
        groups[prefix].push(a)
      }

      for (const [group, groupAgents] of Object.entries(groups)) {
        console.log(chalk.bold(`  ${group.charAt(0).toUpperCase() + group.slice(1)}:`))
        for (const a of groupAgents) {
          console.log(`    ${a.emoji}  ${chalk.cyan(a.filename.padEnd(40))} ${chalk.dim(a.vibe)}`)
        }
        console.log()
      }
    } catch (err) {
      console.error(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── agent ─────────────────────────────────────────────────────────────────────

program
  .command('agent')
  .description('Run a specific Agency Agent on a task')
  .requiredOption('--name <agentName>', 'Agent filename (e.g. marketing-growth-hacker)')
  .requiredOption('--task <task>', 'Task description for the agent')
  .option('--context <context>', 'Additional context to provide')
  .option('--app <appName>', 'App name for context')
  .action(async (opts) => {
    const spinner = ora(`Running ${opts.name}...`).start()
    try {
      const { runAgentTask } = await import('../../factory-brain/src/agency-agent-loader.js').catch(
        () => import('../../../factory-brain/src/agency-agent-loader.js')
      )

      const context = opts.context || (opts.app ? `App: ${opts.app}` : undefined)
      const result = await runAgentTask(opts.name, opts.task, context)

      if (result.success) {
        spinner.succeed(chalk.green(`✅ ${result.agent}`))
        console.log(chalk.bold('\n📋 Output:\n'))
        console.log(result.output)
        console.log()
      } else {
        spinner.fail(chalk.red(`✗ ${result.output}`))
        process.exit(1)
      }
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// ── Parse ─────────────────────────────────────────────────────────────────────

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
