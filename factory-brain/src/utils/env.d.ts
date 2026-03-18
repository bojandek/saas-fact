/**
 * Environment variable validation for Factory Brain.
 *
 * Uses Zod to validate all required environment variables at startup.
 * If any required variable is missing or invalid, the process exits
 * immediately with a clear, actionable error message — rather than
 * failing silently deep in the code with a cryptic error.
 *
 * Usage:
 *   import { env } from './utils/env'
 *   const llm = getLLMClient() // uses ANTHROPIC_API_KEY
 */
import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    OPENAI_API_KEY: z.ZodString;
    SUPABASE_URL: z.ZodString;
    SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal", "silent"]>>;
    NEO4J_URI: z.ZodOptional<z.ZodString>;
    NEO4J_USERNAME: z.ZodOptional<z.ZodString>;
    NEO4J_PASSWORD: z.ZodOptional<z.ZodString>;
    STRIPE_SECRET_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    COOLIFY_API_KEY: z.ZodOptional<z.ZodString>;
    COOLIFY_BASE_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV?: "production" | "development" | "test";
    LOG_LEVEL?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
    OPENAI_API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_ANON_KEY?: string;
    COOLIFY_API_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    NEO4J_URI?: string;
    NEO4J_USERNAME?: string;
    NEO4J_PASSWORD?: string;
    COOLIFY_BASE_URL?: string;
}, {
    NODE_ENV?: "production" | "development" | "test";
    LOG_LEVEL?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
    OPENAI_API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_ANON_KEY?: string;
    COOLIFY_API_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    NEO4J_URI?: string;
    NEO4J_USERNAME?: string;
    NEO4J_PASSWORD?: string;
    COOLIFY_BASE_URL?: string;
}>;
export type Env = z.infer<typeof envSchema>;
/**
 * Validated, typed environment variables.
 * Import this instead of accessing process.env directly.
 */
export declare const env: {
    NODE_ENV?: "production" | "development" | "test";
    LOG_LEVEL?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
    OPENAI_API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_ANON_KEY?: string;
    COOLIFY_API_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    NEO4J_URI?: string;
    NEO4J_USERNAME?: string;
    NEO4J_PASSWORD?: string;
    COOLIFY_BASE_URL?: string;
};
export {};
//# sourceMappingURL=env.d.ts.map