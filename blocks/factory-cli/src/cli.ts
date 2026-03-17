#!/usr/bin/env node
/**
 * Factory CLI — Real command-line interface for SaaS Factory OS
 *
 * All commands make actual HTTP calls to the factory-dashboard API
 * or invoke factory-brain agents directly via TypeScript imports.
 *
 * Usage:
 *   factory generate --desc "Booking SaaS for salons" --name salon-sync
 *   factory status --job <jobId>
 *   factory deploy --app salon-sync
 *   factory memory query --q "What do we know about booking systems?"
 *   factory simulate --desc "Booking SaaS" --users 1000
 *   factory costs
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
  .version('1.0.0')

// ── generate ──────────────────────────────────────────────────────────────────

program
  .command('generate')
  .description('Generate a new SaaS application from a description')
  .requiredOption('--desc <description>', 'SaaS description (min 10 chars)')
  .requiredOption('--name <appName>', 'App name (lowercase, hyphens only, e.g. salon-sync)')
  .option('--org <orgId>', 'Organization ID (UUID)', 'cli-org-default')
  .option('--priority <1-10>', 'Queue priority (1=low, 10=high)', '5')
  .option('--skip-deploy', 'Skip deployment step')
  .option('--skip-qa', 'Skip QA testing step')
  .option('--wait', 'Wait for job to complete (polls status)')
  .action(async (opts) => {
    if (!/^[a-z0-9-]+$/.test(opts.name)) {
      console.error(chalk.red('✗ App name must be lowercase alphanumeric with hyphens only'))
      process.exit(1)
    }

    const spinner = ora('Enqueueing generation job...').start()

    try {
      const result = await apiCall('queue/enqueue', 'POST', {
        saasDescription: opts.desc,
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
  })

// ── status ────────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check job status or overall queue stats')
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
        if (result.durationMs) console.log(`  Duration:   ${((result.durationMs as number) / 1000).toFixed(1)}s`)
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
  .description('Scaffold a new SaaS app locally from blocks (no AI, instant)')
  .requiredOption('--name <appName>', 'App name (lowercase, hyphens only, e.g. salon-sync)')
  .option('--blocks <list>', 'Comma-separated blocks to include', 'auth,payments,analytics')
  .option('--template <name>', 'Base template to use', 'saas-001-booking')
  .option('--org <orgId>', 'Organization ID', 'my-org')
  .option('--skip-install', 'Skip pnpm install after scaffolding')
  .action(async (opts) => {
    if (!/^[a-z0-9-]+$/.test(opts.name)) {
      console.error(chalk.red('✗ App name must be lowercase alphanumeric with hyphens only'))
      process.exit(1)
    }

    const blocks: string[] = opts.blocks.split(',').map((b: string) => b.trim()).filter(Boolean)
    const appDir = `apps/${opts.name}`

    console.log(chalk.bold(`\n🏭 SaaS Factory — Creating ${chalk.cyan(opts.name)}\n`))
    console.log(`  Template:  ${chalk.dim(opts.template)}`)
    console.log(`  Blocks:    ${chalk.dim(blocks.join(', '))}`)
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
        spinner1.fail(chalk.red(`✗ Template not found: apps/${opts.template}`))
        process.exit(1)
      }
      if (fs.existsSync(targetDir)) {
        spinner1.fail(chalk.red(`✗ App already exists: ${appDir}`))
        process.exit(1)
      }
      execSync(`cp -r "${templateDir}" "${targetDir}"`, { stdio: 'pipe' })
      // Update package.json name
      const pkgPath = path.join(targetDir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        pkg.name = `@saas-factory/${opts.name}`
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      }
      spinner1.succeed(chalk.green(`✅ Template copied → ${appDir}`))
    } catch (err) {
      spinner1.fail(chalk.red(`✗ Copy failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }

    // Step 2: Create .env file
    const spinner2 = ora('Generating .env file...').start()
    try {
      const envContent = [
        `# Auto-generated by factory create — ${new Date().toISOString()}`,
        `APP_NAME=${opts.name}`,
        `ORG_ID=${opts.org}`,
        `NEXT_PUBLIC_APP_NAME="${opts.name.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}"`,
        `NEXT_PUBLIC_ORG_ID=${opts.org}`,
        ``,
        `# Database (Supabase)`,
        `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`,
        `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`,
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

    // Step 4: Generate SQL migration for this app
    const spinner4 = ora('Generating database migration...').start()
    try {
      const migrationsDir = path.join(targetDir, 'supabase', 'migrations')
      fs.mkdirSync(migrationsDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
      const migrationContent = [
        `-- Migration for ${opts.name}`,
        `-- Generated by factory create on ${new Date().toISOString()}`,
        `-- Blocks: ${blocks.join(', ')}`,
        ``,
        `-- Enable RLS on all tables (shared database model)`,
        `-- saas_id column isolates data per SaaS application`,
        ``,
        `CREATE TABLE IF NOT EXISTS public.${opts.name.replace(/-/g, '_')}_config (`,
        `  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),`,
        `  saas_id     text NOT NULL DEFAULT '${opts.name}',`,
        `  org_id      uuid NOT NULL,`,
        `  key         text NOT NULL,`,
        `  value       jsonb,`,
        `  created_at  timestamptz DEFAULT now(),`,
        `  UNIQUE(saas_id, org_id, key)`,
        `);`,
        ``,
        `ALTER TABLE public.${opts.name.replace(/-/g, '_')}_config ENABLE ROW LEVEL SECURITY;`,
        ``,
        `CREATE POLICY "${opts.name}_config_isolation" ON public.${opts.name.replace(/-/g, '_')}_config`,
        `  USING (saas_id = '${opts.name}' AND org_id IN (`,
        `    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()`,
        `  ));`,
      ].join('\n')
      fs.writeFileSync(path.join(migrationsDir, `${timestamp}_init_${opts.name.replace(/-/g, '_')}.sql`), migrationContent + '\n')
      spinner4.succeed(chalk.green('✅ Database migration generated'))
    } catch (err) {
      spinner4.fail(chalk.red(`✗ Migration generation failed: ${err instanceof Error ? err.message : String(err)}`))
    }

    // Step 5: pnpm install
    if (!opts.skipInstall) {
      const spinner5 = ora('Installing dependencies (pnpm install)...').start()
      try {
        spawnSync('pnpm', ['install'], { cwd: targetDir, stdio: 'pipe' })
        spinner5.succeed(chalk.green('✅ Dependencies installed'))
      } catch (err) {
        spinner5.warn(chalk.yellow(`⚠️  Install failed (run manually): pnpm install in ${appDir}`))
      }
    }

    // Done!
    console.log(chalk.bold(`\n🎉 App created successfully!\n`))
    console.log(`  📁 Location:   ${chalk.cyan(appDir)}`)
    console.log(`  📋 Manifest:   ${chalk.cyan(`${appDir}/factory.manifest.json`)}`)
    console.log(`  🗄️  Migration:  ${chalk.cyan(`${appDir}/supabase/migrations/`)}`)
    console.log(`  🔑 Env file:   ${chalk.cyan(`${appDir}/.env.local`)} ${chalk.dim('(fill in your keys)')}`)
    console.log(chalk.bold(`\n  Next steps:\n`))
    console.log(`  ${chalk.dim('1.')} Edit ${chalk.cyan(`${appDir}/.env.local`)} with your Supabase + Stripe keys`)
    console.log(`  ${chalk.dim('2.')} Run ${chalk.cyan(`cd ${appDir} && pnpm dev`)} to start development`)
    console.log(`  ${chalk.dim('3.')} Run ${chalk.cyan(`factory deploy --app ${opts.name}`)} to deploy to Coolify`)
    console.log(`  ${chalk.dim('4.')} Run ${chalk.cyan(`factory generate --desc "..." --name ${opts.name} --wait`)} to AI-enhance\n`)
  })

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

// ── Parse ─────────────────────────────────────────────────────────────────────

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
