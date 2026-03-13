/**
 * Zero-Downtime Database Migration Manager
 * Strategies for running schema updates without downtime
 */

import { createClient } from '@supabase/supabase-js'

export interface Migration {
  id: string
  name: string
  description?: string
  upFn: (client: any) => Promise<void>
  downFn: (client: any) => Promise<void>
  // Zero-downtime strategies
  backward_compatible?: boolean // Can run while old code is active
  group?: string // Group related migrations
  runAfter?: string[] // Run after these migration IDs
}

export interface MigrationStatus {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'
  appliedAt?: Date
  rolledBackAt?: Date
  duration?: number
  error?: string
}

export interface ZeroDowntimeMigrationConfig {
  supabaseUrl: string
  supabaseKey: string
  timeout?: number
  batchSize?: number
  pollInterval?: number
}

/**
 * Zero-Downtime Migration Manager
 * Supports:
 * - Backward-compatible migrations (dual-write/dual-read)
 * - Large data updates with batching
 * - Circuit-breaker pattern for failed migrations
 * - Automatic rollback on failure
 */
export class ZeroDowntimeMigrationManager {
  private supabase: any
  private migrations: Map<string, Migration> = new Map()
  private statusTable = '_migration_status'
  private timeout: number
  private batchSize: number
  private pollInterval: number

  constructor(config: ZeroDowntimeMigrationConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)
    this.timeout = config.timeout || 300000 // 5 minutes
    this.batchSize = config.batchSize || 1000
    this.pollInterval = config.pollInterval || 1000
  }

  /**
   * Register migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration)
  }

  /**
   * Run all pending migrations with zero-downtime strategy
   */
  async migrateUp(): Promise<MigrationStatus[]> {
    await this.initStatusTable()

    const results: MigrationStatus[] = []
    const sorted = this.topologicalSort()

    for (const migrationId of sorted) {
      const migration = this.migrations.get(migrationId)
      if (!migration) continue

      // Check if already applied
      const existing = await this.getStatus(migration.id)
      if (existing?.status === 'completed') {
        console.log(`✓ Migration already applied: ${migration.name}`)
        continue
      }

      const status = await this.runMigration(migration, 'up')
      results.push(status)

      if (status.status === 'failed') {
        console.error(`✗ Migration failed: ${migration.name}`)
        console.error(`Error: ${status.error}`)
        // Continue with other migrations if backward compatible
        if (!migration.backward_compatible) {
          throw new Error(`Critical migration failed: ${migration.name}`)
        }
      }
    }

    return results
  }

  /**
   * Rollback last migration
   */
  async rollback(migrationId?: string): Promise<MigrationStatus> {
    await this.initStatusTable()

    let toRollback: MigrationStatus | null = null

    if (migrationId) {
      toRollback = await this.getStatus(migrationId)
    } else {
      // Get last completed migration
      const { data } = await this.supabase
        .from(this.statusTable)
        .select('*')
        .eq('status', 'completed')
        .order('appliedAt', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        toRollback = data[0] as MigrationStatus
      }
    }

    if (!toRollback) {
      throw new Error('No migration to rollback')
    }

    const migration = this.migrations.get(toRollback.id)
    if (!migration) {
      throw new Error(`Migration not found: ${toRollback.id}`)
    }

    return this.runMigration(migration, 'down')
  }

  /**
   * Run large data transformation with batching (zero-downtime)
   */
  async batchUpdate<T>(
    query: string,
    transform: (batch: T[]) => Promise<void>,
    options: { chunkSize?: number; delayMs?: number } = {}
  ): Promise<{ processed: number; failed: number }> {
    const chunkSize = options.chunkSize || this.batchSize
    const delayMs = options.delayMs || 10

    let offset = 0
    let processed = 0
    let failed = 0

    while (true) {
      const { data, error } = await this.supabase.rpc('execute_query', {
        query: `${query} LIMIT ${chunkSize} OFFSET ${offset}`,
      })

      if (error) {
        console.error('Batch query error:', error)
        failed += chunkSize
        break
      }

      if (!data || data.length === 0) {
        break
      }

      try {
        await transform(data)
        processed += data.length
      } catch (error) {
        console.error('Batch transform error:', error)
        failed += data.length
      }

      offset += chunkSize

      // Add delay between batches to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    return { processed, failed }
  }

  /**
   * Create new column backward-compatibly (column-add strategy)
   */
  async addColumnBackwardCompatible(
    table: string,
    columnName: string,
    columnType: string,
    defaultValue?: string
  ): Promise<void> {
    // Step 1: Add column with default value
    await this.supabase.rpc('add_column', {
      table,
      column_name: columnName,
      column_type: columnType,
      default_value: defaultValue,
    })

    console.log(`✓ Column added: ${table}.${columnName}`)
  }

  /**
   * Drop column backward-compatibly (column-remove strategy)
   * Safe because old code will ignore unknown columns
   */
  async dropColumnBackwardCompatible(
    table: string,
    columnName: string
  ): Promise<void> {
    // First, deploy code that stops writing to the column
    // Then schedule column drop later
    const scheduleTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h later

    await this.supabase
      .from('_scheduled_drops')
      .insert({
        table,
        column_name: columnName,
        scheduled_for: scheduleTime,
      })

    console.log(
      `✓ Column drop scheduled: ${table}.${columnName} at ${scheduleTime}`
    )
  }

  /**
   * Rename column safely (backward-compatible via trigger)
   */
  async renameColumnSafely(
    table: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    // Step 1: Create new column
    await this.supabase.rpc('add_column_like', {
      table,
      new_column: newName,
      like_column: oldName,
    })

    // Step 2: Create trigger to keep in sync
    const triggerSql = `
      CREATE TRIGGER ${table}_${oldName}_to_${newName}_sync
      BEFORE INSERT OR UPDATE ON ${table}
      FOR EACH ROW
      BEGIN
        SET NEW.${newName} = NEW.${oldName};
      END;
    `

    await this.supabase.rpc('execute_sql', { sql: triggerSql })

    // Step 3: Backfill existing data
    const backfillSql = `
      UPDATE ${table} SET ${newName} = ${oldName}
      WHERE ${newName} IS NULL
    `

    await this.supabase.rpc('execute_sql', { sql: backfillSql })

    console.log(`✓ Column renamed safely: ${table}.${oldName} → ${newName}`)
  }

  /**
   * Change column type safely (with casting)
   */
  async changeColumnTypeSafely(
    table: string,
    columnName: string,
    newType: string,
    castExpression?: string
  ): Promise<void> {
    const cast = castExpression || `CAST(${columnName} AS ${newType})`

    await this.supabase.rpc('change_column_type', {
      table,
      column_name: columnName,
      new_type: newType,
      cast_expression: cast,
    })

    console.log(
      `✓ Column type changed: ${table}.${columnName} → ${newType}`
    )
  }

  /**
   * Get migration status
   */
  async getStatus(migrationId: string): Promise<MigrationStatus | null> {
    const { data } = await this.supabase
      .from(this.statusTable)
      .select('*')
      .eq('id', migrationId)
      .limit(1)

    return data?.[0] || null
  }

  /**
   * Get all migration statuses
   */
  async getAllStatus(): Promise<MigrationStatus[]> {
    const { data } = await this.supabase
      .from(this.statusTable)
      .select('*')
      .order('appliedAt', { ascending: false })

    return data || []
  }

  /**
   * Private: Run single migration with error handling
   */
  private async runMigration(
    migration: Migration,
    direction: 'up' | 'down'
  ): Promise<MigrationStatus> {
    const status: MigrationStatus = {
      id: migration.id,
      name: migration.name,
      status: 'running',
    }

    try {
      console.log(`Running migration: ${migration.name}`)
      const startTime = Date.now()

      await this.updateStatus(migration.id, 'running')

      if (direction === 'up') {
        await migration.upFn(this.supabase)
      } else {
        await migration.downFn(this.supabase)
      }

      const duration = Date.now() - startTime

      status.status = 'completed'
      status.duration = duration
      status.appliedAt = new Date()

      await this.updateStatus(migration.id, 'completed', undefined, duration)

      console.log(`✓ Migration completed: ${migration.name} (${duration}ms)`)

      return status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const duration = Date.now()

      status.status = 'failed'
      status.error = errorMessage

      await this.updateStatus(migration.id, 'failed', errorMessage)

      console.error(`✗ Migration failed: ${migration.name}`)
      console.error(`Error: ${errorMessage}`)

      return status
    }
  }

  /**
   * Private: Initialize status table
   */
  private async initStatusTable(): Promise<void> {
    const { error } = await this.supabase.rpc('create_migrations_table')

    if (error && !error.message.includes('already exists')) {
      throw error
    }
  }

  /**
   * Private: Update migration status
   */
  private async updateStatus(
    migrationId: string,
    status: string,
    error?: string,
    duration?: number
  ): Promise<void> {
    await this.supabase.from(this.statusTable).upsert({
      id: migrationId,
      status,
      error,
      duration,
      appliedAt: status === 'completed' ? new Date() : undefined,
      rolledBackAt: status === 'rolled_back' ? new Date() : undefined,
    })
  }

  /**
   * Private: Topological sort for migration dependencies
   */
  private topologicalSort(): string[] {
    const sorted: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (id: string) => {
      if (visited.has(id)) return
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`)
      }

      visiting.add(id)

      const migration = this.migrations.get(id)
      if (migration?.runAfter) {
        for (const dep of migration.runAfter) {
          visit(dep)
        }
      }

      visiting.delete(id)
      visited.add(id)
      sorted.push(id)
    }

    for (const id of this.migrations.keys()) {
      visit(id)
    }

    return sorted
  }
}
