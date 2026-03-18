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
import { SupabaseClient } from '@supabase/supabase-js';
export interface ProvisionOptions {
    schemaName: string;
    appName: string;
    orgId?: string;
    niche?: string;
    blocks?: string[];
    migrationSQL?: string;
}
export interface ProvisionResult {
    success: boolean;
    schemaName: string;
    appName: string;
    provisionedAt?: Date;
    error?: string;
    migrationsRun?: number;
}
export interface SchemaInfo {
    schemaName: string;
    appName: string;
    niche?: string;
    status: 'provisioning' | 'active' | 'suspended' | 'deleted';
    blocks: string[];
    provisionedAt?: Date;
}
export declare class SchemaProvisioner {
    private supabase;
    private log;
    constructor(supabaseClient?: SupabaseClient);
    private createDefaultClient;
    /**
     * Provision a new PostgreSQL schema for a SaaS app.
     * Calls the provision_saas_schema() PostgreSQL function.
     */
    provision(opts: ProvisionOptions): Promise<ProvisionResult>;
    /**
     * Run SQL migrations in a specific schema.
     * Splits on semicolons and runs each statement.
     */
    runMigrations(schemaName: string, sql: string): Promise<number>;
    /**
     * Tear down a schema and all its data.
     */
    teardown(schemaName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * List all provisioned schemas for an org.
     */
    listSchemas(orgId?: string): Promise<SchemaInfo[]>;
    /**
     * Check if a schema exists and is active.
     */
    schemaExists(schemaName: string): Promise<boolean>;
    /**
     * Get a Supabase client configured for a specific schema.
     * Used by generated SaaS apps to query their isolated schema.
     */
    getSchemaClient(schemaName: string): SupabaseClient;
    /**
     * Normalize an app name to a valid PostgreSQL schema name.
     * "teretana-crm" → "teretana_crm"
     * "My Gym App" → "my_gym_app"
     */
    static normalizeSchemaName(appName: string): string;
}
//# sourceMappingURL=schema-provisioner.d.ts.map