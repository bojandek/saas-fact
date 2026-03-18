"use strict";
/**
 * No-Code Adapters
 *
 * Converts SaaS Factory architecture blueprints into formats compatible with
 * popular No-Code and Low-Code platforms.
 *
 * Supported targets:
 *  - FlutterFlow (mobile app builder)
 *  - Bubble (web app builder)
 *  - Webflow (website builder)
 *  - Retool (internal tools)
 *  - Zapier (workflow automation)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.noCodeAdapterFactory = exports.NoCodeAdapterFactory = exports.RetoolAdapter = exports.ZapierAdapter = exports.BubbleAdapter = exports.FlutterFlowAdapter = exports.BlueprintSchema = void 0;
const zod_1 = require("zod");
// ─── Blueprint Input Schema ──────────────────────────────────────────────────
exports.BlueprintSchema = zod_1.z.object({
    appName: zod_1.z.string(),
    description: zod_1.z.string(),
    sqlSchema: zod_1.z.string(),
    apiSpec: zod_1.z.string(), // OpenAPI YAML
    features: zod_1.z.array(zod_1.z.string()),
    pricingModel: zod_1.z.enum(['Freemium', 'Subscription', 'PayAsYouGo', 'Hybrid']),
    techStack: zod_1.z.array(zod_1.z.string()),
});
// ─── Base Adapter ────────────────────────────────────────────────────────────
class BaseAdapter {
    parseTableNames(sqlSchema) {
        const matches = sqlSchema.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi) ?? [];
        return matches.map((m) => {
            const match = m.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
            return match?.[1] ?? '';
        }).filter(Boolean);
    }
    parseColumns(sqlSchema, tableName) {
        const tableRegex = new RegExp(`CREATE TABLE[^(]*${tableName}[^(]*\\(([^;]+?)\\)`, 'is');
        const match = sqlSchema.match(tableRegex);
        if (!match)
            return [];
        const columnLines = match[1].split('\n').filter((line) => {
            const trimmed = line.trim();
            return (trimmed.length > 0 &&
                !trimmed.startsWith('--') &&
                !trimmed.startsWith('PRIMARY KEY') &&
                !trimmed.startsWith('FOREIGN KEY') &&
                !trimmed.startsWith('UNIQUE') &&
                !trimmed.startsWith('INDEX') &&
                !trimmed.startsWith('CONSTRAINT'));
        });
        return columnLines.map((line) => {
            const parts = line.trim().split(/\s+/);
            return {
                name: parts[0]?.replace(/[",]/g, '') ?? '',
                type: parts[1]?.replace(/[",]/g, '') ?? 'text',
            };
        }).filter((c) => c.name.length > 0);
    }
    parseApiEndpoints(apiSpec) {
        const endpoints = [];
        const pathRegex = /^\s{2}(\/[^\n:]+):/gm;
        const methodRegex = /^\s{4}(get|post|put|patch|delete):/gim;
        let pathMatch;
        const paths = [];
        while ((pathMatch = pathRegex.exec(apiSpec)) !== null) {
            paths.push(pathMatch[1]);
        }
        let methodMatch;
        const methods = [];
        while ((methodMatch = methodRegex.exec(apiSpec)) !== null) {
            methods.push(methodMatch[1].toUpperCase());
        }
        const count = Math.min(paths.length, methods.length);
        for (let i = 0; i < count; i++) {
            endpoints.push({
                path: paths[i],
                method: methods[i],
                description: `${methods[i]} ${paths[i]}`,
            });
        }
        return endpoints;
    }
}
// ─── FlutterFlow Adapter ─────────────────────────────────────────────────────
class FlutterFlowAdapter extends BaseAdapter {
    constructor() {
        super(...arguments);
        this.platform = 'FlutterFlow';
        this.outputFormat = 'json';
    }
    convert(blueprint) {
        const tables = this.parseTableNames(blueprint.sqlSchema);
        const endpoints = this.parseApiEndpoints(blueprint.apiSpec);
        const flutterFlowConfig = {
            projectName: blueprint.appName.replace(/\s+/g, ''),
            projectType: 'mobile_app',
            firebaseConfig: null, // User needs to configure
            supabaseConfig: {
                url: 'YOUR_SUPABASE_URL',
                anonKey: 'YOUR_SUPABASE_ANON_KEY',
            },
            dataTypes: tables.map((table) => ({
                name: table,
                fields: this.parseColumns(blueprint.sqlSchema, table).map((col) => ({
                    name: col.name,
                    type: this.mapSqlTypeToFlutterFlow(col.type),
                    nullable: true,
                })),
            })),
            apiCalls: endpoints.map((ep) => ({
                name: `${ep.method.toLowerCase()}${ep.path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
                method: ep.method,
                apiUrl: `\${supabaseUrl}${ep.path}`,
                headers: {
                    Authorization: 'Bearer \${supabaseAnonKey}',
                    'Content-Type': 'application/json',
                },
            })),
            pages: this.generateFlutterFlowPages(blueprint, tables),
        };
        return {
            platform: this.platform,
            format: this.outputFormat,
            content: JSON.stringify(flutterFlowConfig, null, 2),
            instructions: [
                '1. Open FlutterFlow and create a new project',
                '2. Go to Settings > Integrations > Supabase and add your credentials',
                '3. Import the Data Types from the "dataTypes" section manually',
                '4. Create API calls using the "apiCalls" section as reference',
                '5. Use the "pages" section to scaffold your app screens',
            ],
            limitations: [
                'FlutterFlow does not support direct JSON import - manual setup required',
                'Complex RLS policies need to be configured in Supabase directly',
                'Custom business logic requires FlutterFlow custom code or actions',
            ],
        };
    }
    mapSqlTypeToFlutterFlow(sqlType) {
        const typeMap = {
            uuid: 'String',
            text: 'String',
            varchar: 'String',
            integer: 'int',
            bigint: 'int',
            boolean: 'bool',
            timestamp: 'DateTime',
            timestamptz: 'DateTime',
            numeric: 'double',
            decimal: 'double',
            jsonb: 'dynamic',
            json: 'dynamic',
        };
        const normalized = sqlType.toLowerCase().split('(')[0];
        return typeMap[normalized] ?? 'String';
    }
    generateFlutterFlowPages(blueprint, tables) {
        const pages = [
            { name: 'SplashPage', route: '/', type: 'splash' },
            { name: 'LoginPage', route: '/login', type: 'auth' },
            { name: 'SignUpPage', route: '/signup', type: 'auth' },
            { name: 'DashboardPage', route: '/dashboard', type: 'main' },
        ];
        // Add CRUD pages for each table
        for (const table of tables.slice(0, 5)) {
            const name = table.charAt(0).toUpperCase() + table.slice(1);
            pages.push({ name: `${name}ListPage`, route: `/${table}`, type: 'list' }, { name: `${name}DetailPage`, route: `/${table}/:id`, type: 'detail' });
        }
        return pages;
    }
}
exports.FlutterFlowAdapter = FlutterFlowAdapter;
// ─── Bubble Adapter ──────────────────────────────────────────────────────────
class BubbleAdapter extends BaseAdapter {
    constructor() {
        super(...arguments);
        this.platform = 'Bubble';
        this.outputFormat = 'json';
    }
    convert(blueprint) {
        const tables = this.parseTableNames(blueprint.sqlSchema);
        const endpoints = this.parseApiEndpoints(blueprint.apiSpec);
        const bubbleConfig = {
            appName: blueprint.appName,
            dataTypes: tables.map((table) => ({
                name: table,
                fields: this.parseColumns(blueprint.sqlSchema, table).map((col) => ({
                    name: col.name,
                    type: this.mapSqlTypeToBubble(col.type),
                    list: false,
                    private: col.name.includes('password') || col.name.includes('secret'),
                })),
                privacyRules: [
                    {
                        name: 'Owner can see',
                        condition: "This Thing's Creator is Current User",
                        actions: ['view all fields', 'find this in searches'],
                    },
                ],
            })),
            apiConnector: {
                name: `${blueprint.appName} API`,
                authentication: 'Private key in header',
                calls: endpoints.slice(0, 10).map((ep) => ({
                    name: ep.description,
                    method: ep.method,
                    url: `https://your-api.com${ep.path}`,
                    headers: [
                        { key: 'Authorization', value: 'Bearer <key>' },
                    ],
                })),
            },
            workflows: this.generateBubbleWorkflows(blueprint),
        };
        return {
            platform: this.platform,
            format: this.outputFormat,
            content: JSON.stringify(bubbleConfig, null, 2),
            instructions: [
                '1. Create a new Bubble app at bubble.io',
                '2. Go to Data > Data Types and create each type from "dataTypes"',
                '3. Set up privacy rules as specified in each data type',
                '4. Install the API Connector plugin and configure using "apiConnector"',
                '5. Create workflows based on the "workflows" section',
            ],
            limitations: [
                'Bubble uses its own database - Supabase integration requires API Connector',
                'Complex SQL queries need to be exposed as API endpoints',
                'Real-time features require Bubble\'s built-in real-time or WebSocket plugin',
            ],
        };
    }
    mapSqlTypeToBubble(sqlType) {
        const typeMap = {
            uuid: 'text',
            text: 'text',
            varchar: 'text',
            integer: 'number',
            bigint: 'number',
            boolean: 'yes/no',
            timestamp: 'date',
            timestamptz: 'date',
            numeric: 'number',
            decimal: 'number',
            jsonb: 'text',
        };
        const normalized = sqlType.toLowerCase().split('(')[0];
        return typeMap[normalized] ?? 'text';
    }
    generateBubbleWorkflows(blueprint) {
        return [
            {
                name: 'User signs up',
                trigger: 'Button clicked (Sign Up)',
                actions: [
                    'Sign the user up',
                    'Log the user in',
                    'Navigate to Dashboard',
                ],
            },
            {
                name: 'User logs in',
                trigger: 'Button clicked (Log In)',
                actions: ['Log the user in', 'Navigate to Dashboard'],
            },
        ];
    }
}
exports.BubbleAdapter = BubbleAdapter;
// ─── Zapier Adapter ──────────────────────────────────────────────────────────
class ZapierAdapter extends BaseAdapter {
    constructor() {
        super(...arguments);
        this.platform = 'Zapier';
        this.outputFormat = 'json';
    }
    convert(blueprint) {
        const endpoints = this.parseApiEndpoints(blueprint.apiSpec);
        const zapierConfig = {
            appName: blueprint.appName,
            authentication: {
                type: 'api_key',
                test: {
                    url: 'https://your-api.com/health',
                    method: 'GET',
                },
                fields: [
                    {
                        key: 'api_key',
                        label: 'API Key',
                        required: true,
                        type: 'string',
                    },
                ],
            },
            triggers: endpoints
                .filter((ep) => ep.method === 'GET')
                .slice(0, 5)
                .map((ep) => ({
                key: ep.path.replace(/\//g, '_').replace(/[{}]/g, '').slice(1),
                noun: ep.path.split('/').filter(Boolean)[0] ?? 'item',
                display: {
                    label: `New ${ep.path}`,
                    description: `Triggers when a new item is created at ${ep.path}`,
                },
                operation: {
                    perform: {
                        url: `https://your-api.com${ep.path}`,
                        method: 'GET',
                        headers: { Authorization: 'Bearer {{bundle.authData.api_key}}' },
                    },
                },
            })),
            actions: endpoints
                .filter((ep) => ep.method === 'POST' || ep.method === 'PUT')
                .slice(0, 5)
                .map((ep) => ({
                key: `${ep.method.toLowerCase()}${ep.path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
                noun: ep.path.split('/').filter(Boolean)[0] ?? 'item',
                display: {
                    label: `${ep.method} ${ep.path}`,
                    description: `${ep.method} request to ${ep.path}`,
                },
                operation: {
                    perform: {
                        url: `https://your-api.com${ep.path}`,
                        method: ep.method,
                        headers: {
                            Authorization: 'Bearer {{bundle.authData.api_key}}',
                            'Content-Type': 'application/json',
                        },
                    },
                },
            })),
        };
        return {
            platform: this.platform,
            format: this.outputFormat,
            content: JSON.stringify(zapierConfig, null, 2),
            instructions: [
                '1. Go to developer.zapier.com and create a new integration',
                '2. Set up authentication using the "authentication" section',
                '3. Create triggers from the "triggers" section',
                '4. Create actions from the "actions" section',
                '5. Deploy your API and update the URLs in the config',
            ],
            limitations: [
                'Zapier requires a publicly accessible API endpoint',
                'Real-time webhooks require additional webhook endpoint setup',
                'Complex data transformations may require Zapier Code steps',
            ],
        };
    }
}
exports.ZapierAdapter = ZapierAdapter;
// ─── Retool Adapter ──────────────────────────────────────────────────────────
class RetoolAdapter extends BaseAdapter {
    constructor() {
        super(...arguments);
        this.platform = 'Retool';
        this.outputFormat = 'json';
    }
    convert(blueprint) {
        const tables = this.parseTableNames(blueprint.sqlSchema);
        const endpoints = this.parseApiEndpoints(blueprint.apiSpec);
        const retoolConfig = {
            name: `${blueprint.appName} Admin`,
            resources: [
                {
                    type: 'postgresql',
                    name: 'production_db',
                    host: 'YOUR_DB_HOST',
                    port: 5432,
                    database: blueprint.appName.toLowerCase().replace(/\s+/g, '_'),
                    ssl: true,
                },
                {
                    type: 'restapi',
                    name: `${blueprint.appName.toLowerCase().replace(/\s+/g, '_')}_api`,
                    baseUrl: 'https://your-api.com',
                    authentication: {
                        type: 'bearer',
                        token: '{{ current_user.metadata.api_key }}',
                    },
                },
            ],
            pages: [
                {
                    name: 'Dashboard',
                    components: [
                        { type: 'stat', label: 'Total Users', query: `SELECT COUNT(*) FROM ${tables[0] ?? 'users'}` },
                        { type: 'chart', label: 'Growth', query: `SELECT DATE(created_at), COUNT(*) FROM ${tables[0] ?? 'users'} GROUP BY 1 ORDER BY 1` },
                    ],
                },
                ...tables.slice(0, 4).map((table) => ({
                    name: `${table.charAt(0).toUpperCase() + table.slice(1)} Manager`,
                    components: [
                        {
                            type: 'table',
                            label: table,
                            query: `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`,
                            actions: ['view', 'edit', 'delete'],
                        },
                    ],
                })),
            ],
            queries: endpoints.slice(0, 8).map((ep) => ({
                name: `${ep.method.toLowerCase()}_${ep.path.replace(/\//g, '_').replace(/[{}]/g, '').slice(1)}`,
                type: 'restapi',
                resource: `${blueprint.appName.toLowerCase().replace(/\s+/g, '_')}_api`,
                method: ep.method,
                path: ep.path,
            })),
        };
        return {
            platform: this.platform,
            format: this.outputFormat,
            content: JSON.stringify(retoolConfig, null, 2),
            instructions: [
                '1. Create a new Retool app at retool.com',
                '2. Add resources (PostgreSQL and REST API) from the "resources" section',
                '3. Create pages based on the "pages" section',
                '4. Add queries from the "queries" section to each page',
                '5. Connect table components to queries for full CRUD functionality',
            ],
            limitations: [
                'Retool is primarily for internal tools - not customer-facing apps',
                'Complex UI customization requires Retool custom components',
                'Row-level security must be enforced at the API/DB level',
            ],
        };
    }
}
exports.RetoolAdapter = RetoolAdapter;
class NoCodeAdapterFactory {
    constructor() {
        this.adapters = new Map([
            ['flutterflow', new FlutterFlowAdapter()],
            ['bubble', new BubbleAdapter()],
            ['zapier', new ZapierAdapter()],
            ['retool', new RetoolAdapter()],
        ]);
    }
    /**
     * Convert a blueprint to a specific platform format
     */
    convert(platform, blueprint) {
        const adapter = this.adapters.get(platform);
        if (!adapter) {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        return adapter.convert(blueprint);
    }
    /**
     * Convert a blueprint to all supported platforms
     */
    convertAll(blueprint) {
        const result = {};
        for (const [platform, adapter] of this.adapters) {
            result[platform] = adapter.convert(blueprint);
        }
        return result;
    }
    /**
     * Get list of supported platforms
     */
    getSupportedPlatforms() {
        return Array.from(this.adapters.keys());
    }
}
exports.NoCodeAdapterFactory = NoCodeAdapterFactory;
// Singleton instance
exports.noCodeAdapterFactory = new NoCodeAdapterFactory();
//# sourceMappingURL=index.js.map