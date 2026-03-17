/**
 * Schema Provisioner
 *
 * Manages PostgreSQL schema lifecycle for the multi-schema Shared Auth model.
 * Each SaaS app gets its own PostgreSQL schema within a single Supabase project.
 *
 * Architecture:
 *   - public schema: shared auth (organizations, org_members, saas_schemas)
 *   - {app_name} schema: isolated business data per SaaS app
 *
 * Usage:
 *   const provisioner = new SchemaProvisioner(supabaseClient)
 *   await provisioner.provision('teretana_crm', orgId, blocks)
 *   await provisioner.runMigrations('teretana_crm', migrationSQL)
 *   await provisioner.teardown('teretana_crm')
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from './utils/logger.js'
import { withRetry } from './utils/retry.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProvisionOptions {
  schemaName: string
  appName: string
  orgId?: string
  niche?: string
  blocks?: string[]
  migrationSQL?: string
}

export interface ProvisionResult {
  success: boolean
  schemaName: string
  appName: string
  provisionedAt?: Date
  error?: string
  migrationsRun?: number
}

export interface SchemaInfo {
  schemaName: string
  appName: string
  niche?: string
  status: 'provisioning' | 'active' | 'suspended' | 'deleted'
  blocks: string[]
  provisionedAt?: Date
}

// ─── Schema Provisioner ───────────────────────────────────────────────────────

export class SchemaProvisioner {
  private supabase: SupabaseClient
  private log = logger.child({ module: 'SchemaProvisioner' })

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || this.createDefaultClient()
  }

  private createDefaultClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      )
    }

    return createClient(url, key, {
      auth: { persistSession: false },
    })
  }

  /**
   * Provision a new PostgreSQL schema for a SaaS app.
   * Calls the provision_saas_schema() PostgreSQL function.
   */
  async provision(opts: ProvisionOptions): Promise<ProvisionResult> {
    const { schemaName, appName, orgId, niche, blocks = [], migrationSQL } = opts

    // Validate schema name
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
      return {
        success: false,
        schemaName,
        appName,
        error: 'Invalid schema name. Must match ^[a-z][a-z0-9_]{0,62}$',
      }
    }

    this.log.info({ schemaName, appName, orgId }, 'Provisioning schema')

    try {
      // 1. Call PostgreSQL provision function
      const { data, error } = await withRetry(
        () => this.supabase.rpc('provision_saas_schema', {
          p_schema_name: schemaName,
          p_org_id: orgId || null,
        }),
        { maxAttempts: 3, baseDelayMs: 1000 }
      )

      if (error) {
        this.log.error({ error, schemaName }, 'Schema provisioning failed')
        return { success: false, schemaName, appName, error: error.message }
      }

      const result = data as { success: boolean; error?: string; provisioned_at?: string }

      if (!result.success) {
        return { success: false, schemaName, appName, error: result.error }
      }

      // 2. Update schema registry with niche and blocks
      if (niche || blocks.length > 0) {
        await this.supabase
          .from('saas_schemas')
          .update({ niche, blocks, app_name: appName })
          .eq('schema_name', schemaName)
      }

      // 3. Run custom migrations if provided
      let migrationsRun = 0
      if (migrationSQL) {
        migrationsRun = await this.runMigrations(schemaName, migrationSQL)
      }

      this.log.info({ schemaName, appName, migrationsRun }, 'Schema provisioned successfully')

      return {
        success: true,
        schemaName,
        appName,
        provisionedAt: new Date(),
        migrationsRun,
      }

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.log.error({ err, schemaName }, 'Unexpected error during schema provisioning')
      return { success: false, schemaName, appName, error }
    }
  }

  /**
   * Run SQL migrations in a specific schema.
   * Splits on semicolons and runs each statement.
   */
  async runMigrations(schemaName: string, sql: string): Promise<number> {
    this.log.info({ schemaName }, 'Running migrations')

    // Set search path to target schema
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let count = 0
    for (const stmt of statements) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', {
          sql: `SET search_path TO ${schemaName}, public; ${stmt};`,
        })
        if (error) {
          this.log.warn({ error, stmt: stmt.slice(0, 100) }, 'Migration statement failed')
        } else {
          count++
        }
      } catch (err) {
        this.log.warn({ err, stmt: stmt.slice(0, 100) }, 'Migration statement error')
      }
    }

    this.log.info({ schemaName, count, total: statements.length }, 'Migrations complete')
    return count
  }

  /**
   * Tear down a schema and all its data.
   */
  async teardown(schemaName: string): Promise<{ success: boolean; error?: string }> {
    this.log.warn({ schemaName }, 'Tearing down schema')

    const { data, error } = await this.supabase.rpc('teardown_saas_schema', {
      p_schema_name: schemaName,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string }
    return result
  }

  /**
   * List all provisioned schemas for an org.
   */
  async listSchemas(orgId?: string): Promise<SchemaInfo[]> {
    const { data, error } = await this.supabase.rpc('list_saas_schemas', {
      p_org_id: orgId || null,
    })

    if (error) {
      this.log.error({ error }, 'Failed to list schemas')
      return []
    }

    return (data as SchemaInfo[]) || []
  }

  /**
   * Check if a schema exists and is active.
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('saas_schemas')
      .select('status')
      .eq('schema_name', schemaName)
      .single()

    return data?.status === 'active'
  }

  /**
   * Get a Supabase client configured for a specific schema.
   * Used by generated SaaS apps to query their isolated schema.
   */
  getSchemaClient(schemaName: string): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    return createClient(url, key, {
      auth: { persistSession: false },
      db: { schema: schemaName },
    })
  }

  /**
   * Normalize an app name to a valid PostgreSQL schema name.
   * "teretana-crm" → "teretana_crm"
   * "My Gym App" → "my_gym_app"
   */
  static normalizeSchemaName(appName: string): string {
    return appName
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^[^a-z]/, 'app_$&') // Ensure starts with letter
      .slice(0, 63) // PostgreSQL max identifier length
  }
}
