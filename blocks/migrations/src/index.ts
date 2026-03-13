/**
 * Database Migrations Manager
 * Zero-downtime schema updates with Drizzle
 */

import { createClient } from '@supabase/supabase-js'

export interface Migration {
  name: string
  up: (supabase: ReturnType<typeof createClient>) => Promise<void>
  down: (supabase: ReturnType<typeof createClient>) => Promise<void>
}

export class MigrationManager {
  private supabase: ReturnType<typeof createClient>
  private migrations: Map<string, Migration> = new Map()

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Register migration
   */
  registerMigration(name: string, migration: Migration): void {
    this.migrations.set(name, migration)
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<void> {
    // Create migrations table if not exists
    await this.initMigrationsTable()

    // Get applied migrations
    const { data: applied } = await this.supabase
      .from('_migrations')
      .select('name')

    const appliedNames = new Set(applied?.map((m) => m.name) || [])

    // Run pending migrations in order
    for (const [name, migration] of this.migrations) {
      if (!appliedNames.has(name)) {
        console.log(`Running migration: ${name}`)
        await migration.up(this.supabase)

        // Record migration
        await this.supabase.from('_migrations').insert({
          name,
          applied_at: new Date(),
        })

        console.log(`✓ ${name}`)
      }
    }
  }

  /**
   * Rollback last migration
   */
  async rollback(): Promise<void> {
    const { data: last } = await this.supabase
      .from('_migrations')
      .select('name')
      .order('applied_at', { ascending: false })
      .limit(1)

    if (!last || last.length === 0) {
      console.log('No migrations to rollback')
      return
    }

    const migrationName = last[0].name
    const migration = this.migrations.get(migrationName)

    if (!migration) {
      throw new Error(`Migration not found: ${migrationName}`)
    }

    console.log(`Rolling back: ${migrationName}`)
    await migration.down(this.supabase)

    await this.supabase
      .from('_migrations')
      .delete()
      .eq('name', migrationName)

    console.log(`✓ Rolled back ${migrationName}`)
  }

  /**
   * Get migration status
   */
  async status() {
    await this.initMigrationsTable()

    const { data: applied } = await this.supabase
      .from('_migrations')
      .select('*')
      .order('applied_at', { ascending: false })

    const appliedNames = new Set(applied?.map((m) => m.name) || [])

    console.log('\nMigration Status:')
    console.log('================\n')

    for (const name of this.migrations.keys()) {
      const status = appliedNames.has(name) ? '✓' : '○'
      console.log(`${status} ${name}`)
    }

    console.log(`\nApplied: ${appliedNames.size} / ${this.migrations.size}`)
  }

  /**
   * Initialize migrations tracking table
   */
  private async initMigrationsTable(): Promise<void> {
    const { error } = await this.supabase
      .from('_migrations')
      .select('*')
      .limit(1)

    if (error?.code === 'PGRST116') {
      // Table doesn't exist, create it
      await this.supabase.rpc('create_migrations_table')
    }
  }
}

export const migrationManager = new MigrationManager()
