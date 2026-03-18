"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaProvisioner = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_js_1 = require("./utils/logger.js");
const retry_js_1 = require("./utils/retry.js");
// ─── Schema Provisioner ───────────────────────────────────────────────────────
class SchemaProvisioner {
    constructor(supabaseClient) {
        this.log = logger_js_1.logger.child({ module: 'SchemaProvisioner' });
        this.supabase = supabaseClient || this.createDefaultClient();
    }
    createDefaultClient() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        }
        return (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false },
        });
    }
    /**
     * Provision a new PostgreSQL schema for a SaaS app.
     * Calls the provision_saas_schema() PostgreSQL function.
     */
    async provision(opts) {
        const { schemaName, appName, orgId, niche, blocks = [], migrationSQL } = opts;
        // Validate schema name
        if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
            return {
                success: false,
                schemaName,
                appName,
                error: 'Invalid schema name. Must match ^[a-z][a-z0-9_]{0,62}$',
            };
        }
        this.log.info({ schemaName, appName, orgId }, 'Provisioning schema');
        try {
            // 1. Call PostgreSQL provision function
            const { data, error } = await (0, retry_js_1.withRetry)(() => this.supabase.rpc('provision_saas_schema', {
                p_schema_name: schemaName,
                p_org_id: orgId || null,
            }), { maxAttempts: 3, baseDelayMs: 1000 });
            if (error) {
                this.log.error({ error, schemaName }, 'Schema provisioning failed');
                return { success: false, schemaName, appName, error: error.message };
            }
            const result = data;
            if (!result.success) {
                return { success: false, schemaName, appName, error: result.error };
            }
            // 2. Update schema registry with niche and blocks
            if (niche || blocks.length > 0) {
                await this.supabase
                    .from('saas_schemas')
                    .update({ niche, blocks, app_name: appName })
                    .eq('schema_name', schemaName);
            }
            // 3. Run custom migrations if provided
            let migrationsRun = 0;
            if (migrationSQL) {
                migrationsRun = await this.runMigrations(schemaName, migrationSQL);
            }
            this.log.info({ schemaName, appName, migrationsRun }, 'Schema provisioned successfully');
            return {
                success: true,
                schemaName,
                appName,
                provisionedAt: new Date(),
                migrationsRun,
            };
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            this.log.error({ err, schemaName }, 'Unexpected error during schema provisioning');
            return { success: false, schemaName, appName, error };
        }
    }
    /**
     * Run SQL migrations in a specific schema.
     * Splits on semicolons and runs each statement.
     */
    async runMigrations(schemaName, sql) {
        this.log.info({ schemaName }, 'Running migrations');
        // Set search path to target schema
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        let count = 0;
        for (const stmt of statements) {
            try {
                const { error } = await this.supabase.rpc('exec_sql', {
                    sql: `SET search_path TO ${schemaName}, public; ${stmt};`,
                });
                if (error) {
                    this.log.warn({ error, stmt: stmt.slice(0, 100) }, 'Migration statement failed');
                }
                else {
                    count++;
                }
            }
            catch (err) {
                this.log.warn({ err, stmt: stmt.slice(0, 100) }, 'Migration statement error');
            }
        }
        this.log.info({ schemaName, count, total: statements.length }, 'Migrations complete');
        return count;
    }
    /**
     * Tear down a schema and all its data.
     */
    async teardown(schemaName) {
        this.log.warn({ schemaName }, 'Tearing down schema');
        const { data, error } = await this.supabase.rpc('teardown_saas_schema', {
            p_schema_name: schemaName,
        });
        if (error) {
            return { success: false, error: error.message };
        }
        const result = data;
        return result;
    }
    /**
     * List all provisioned schemas for an org.
     */
    async listSchemas(orgId) {
        const { data, error } = await this.supabase.rpc('list_saas_schemas', {
            p_org_id: orgId || null,
        });
        if (error) {
            this.log.error({ error }, 'Failed to list schemas');
            return [];
        }
        return data || [];
    }
    /**
     * Check if a schema exists and is active.
     */
    async schemaExists(schemaName) {
        const { data } = await this.supabase
            .from('saas_schemas')
            .select('status')
            .eq('schema_name', schemaName)
            .single();
        return data?.status === 'active';
    }
    /**
     * Get a Supabase client configured for a specific schema.
     * Used by generated SaaS apps to query their isolated schema.
     */
    getSchemaClient(schemaName) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        return (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false },
            db: { schema: schemaName },
        });
    }
    /**
     * Normalize an app name to a valid PostgreSQL schema name.
     * "teretana-crm" → "teretana_crm"
     * "My Gym App" → "my_gym_app"
     */
    static normalizeSchemaName(appName) {
        return appName
            .toLowerCase()
            .trim()
            .replace(/[\s-]+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .replace(/^[^a-z]/, 'app_$&') // Ensure starts with letter
            .slice(0, 63); // PostgreSQL max identifier length
    }
}
exports.SchemaProvisioner = SchemaProvisioner;
//# sourceMappingURL=schema-provisioner.js.map