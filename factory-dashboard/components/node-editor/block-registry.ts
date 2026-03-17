/**
 * Block Registry
 * Defines all available SaaS Factory blocks that can be placed in the visual editor.
 */

import { BlockDefinition } from './types'

export const BLOCK_REGISTRY: BlockDefinition[] = [
  // ─── Auth ──────────────────────────────────────────────────────────────────
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Supabase Auth with SSO, MFA, and social login support',
    category: 'auth',
    packageName: '@saas-factory/auth',
    color: '#6366f1',
    icon: '🔐',
    inputs: [],
    outputs: [
      { id: 'user', name: 'User Session', type: 'data', required: false },
      { id: 'onLogin', name: 'On Login', type: 'event', required: false },
      { id: 'onLogout', name: 'On Logout', type: 'event', required: false },
    ],
    configSchema: {
      provider: {
        type: 'select',
        label: 'Auth Provider',
        defaultValue: 'supabase',
        options: ['supabase', 'clerk', 'auth0'],
      },
      mfaEnabled: {
        type: 'boolean',
        label: 'Enable MFA',
        defaultValue: false,
      },
    },
  },

  // ─── Database ──────────────────────────────────────────────────────────────
  {
    id: 'database',
    name: 'Database',
    description: 'PostgreSQL with multi-tenant RLS policies',
    category: 'database',
    packageName: '@saas-factory/database',
    color: '#10b981',
    icon: '🗄️',
    inputs: [
      { id: 'auth', name: 'Auth Context', type: 'data', required: false },
    ],
    outputs: [
      { id: 'client', name: 'DB Client', type: 'data', required: false },
    ],
    configSchema: {
      multiTenant: {
        type: 'boolean',
        label: 'Multi-tenant RLS',
        defaultValue: true,
      },
      migrations: {
        type: 'boolean',
        label: 'Auto Migrations',
        defaultValue: true,
      },
    },
  },

  // ─── Payments ──────────────────────────────────────────────────────────────
  {
    id: 'payments',
    name: 'Payments',
    description: 'Stripe subscriptions, one-time payments, and billing portal',
    category: 'payments',
    packageName: '@saas-factory/payments',
    color: '#f59e0b',
    icon: '💳',
    inputs: [
      { id: 'user', name: 'User', type: 'data', required: true },
    ],
    outputs: [
      { id: 'subscription', name: 'Subscription', type: 'data', required: false },
      { id: 'onPayment', name: 'On Payment', type: 'event', required: false },
    ],
    configSchema: {
      pricingModel: {
        type: 'select',
        label: 'Pricing Model',
        defaultValue: 'subscription',
        options: ['subscription', 'one-time', 'usage-based', 'freemium'],
      },
      trialDays: {
        type: 'number',
        label: 'Trial Days',
        defaultValue: 14,
      },
    },
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Event tracking, funnel analysis, and user behavior insights',
    category: 'analytics',
    packageName: '@saas-factory/analytics',
    color: '#8b5cf6',
    icon: '📊',
    inputs: [
      { id: 'user', name: 'User', type: 'data', required: false },
    ],
    outputs: [
      { id: 'events', name: 'Event Stream', type: 'data', required: false },
    ],
    configSchema: {
      provider: {
        type: 'select',
        label: 'Analytics Provider',
        defaultValue: 'plausible',
        options: ['plausible', 'posthog', 'mixpanel', 'amplitude'],
      },
    },
  },

  // ─── Feature Flags ─────────────────────────────────────────────────────────
  {
    id: 'feature-flags',
    name: 'Feature Flags',
    description: 'Gradual rollout, A/B testing, and per-user targeting',
    category: 'infra',
    packageName: '@saas-factory/blocks-features',
    color: '#ec4899',
    icon: '🚩',
    inputs: [
      { id: 'user', name: 'User', type: 'data', required: false },
    ],
    outputs: [
      { id: 'flags', name: 'Feature Flags', type: 'data', required: false },
    ],
    configSchema: {
      defaultRollout: {
        type: 'number',
        label: 'Default Rollout %',
        defaultValue: 100,
      },
    },
  },

  // ─── Circuit Breaker ───────────────────────────────────────────────────────
  {
    id: 'circuit-breaker',
    name: 'Circuit Breaker',
    description: 'Fault tolerance with automatic fallback and recovery',
    category: 'infra',
    packageName: '@saas-factory/circuit-breaker',
    color: '#ef4444',
    icon: '⚡',
    inputs: [
      { id: 'service', name: 'Service Call', type: 'event', required: true },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'data', required: false },
      { id: 'fallback', name: 'Fallback', type: 'event', required: false },
    ],
    configSchema: {
      failureThreshold: {
        type: 'number',
        label: 'Failure Threshold',
        defaultValue: 5,
      },
      timeout: {
        type: 'number',
        label: 'Timeout (ms)',
        defaultValue: 30000,
      },
    },
  },

  // ─── Rate Limiter ──────────────────────────────────────────────────────────
  {
    id: 'rate-limit',
    name: 'Rate Limiter',
    description: 'Sliding window rate limiting for API endpoints',
    category: 'infra',
    packageName: '@saas-factory/rate-limit',
    color: '#f97316',
    icon: '🛡️',
    inputs: [
      { id: 'request', name: 'Request', type: 'event', required: true },
    ],
    outputs: [
      { id: 'allowed', name: 'Allowed', type: 'event', required: false },
      { id: 'blocked', name: 'Blocked', type: 'event', required: false },
    ],
    configSchema: {
      limit: {
        type: 'number',
        label: 'Requests per Window',
        defaultValue: 100,
      },
      windowSeconds: {
        type: 'number',
        label: 'Window (seconds)',
        defaultValue: 60,
      },
    },
  },

  // ─── Observability ─────────────────────────────────────────────────────────
  {
    id: 'observability',
    name: 'Observability',
    description: 'Sentry error tracking, Pino logging, and performance monitoring',
    category: 'infra',
    packageName: '@saas-factory/blocks-observability',
    color: '#64748b',
    icon: '🔭',
    inputs: [],
    outputs: [
      { id: 'logger', name: 'Logger', type: 'data', required: false },
      { id: 'metrics', name: 'Metrics', type: 'data', required: false },
    ],
    configSchema: {
      sentryEnabled: {
        type: 'boolean',
        label: 'Enable Sentry',
        defaultValue: true,
      },
      logLevel: {
        type: 'select',
        label: 'Log Level',
        defaultValue: 'info',
        options: ['debug', 'info', 'warn', 'error'],
      },
    },
  },

  // ─── Email Workflows ───────────────────────────────────────────────────────
  {
    id: 'email-workflows',
    name: 'Email Workflows',
    description: 'Transactional emails and marketing automation via Resend',
    category: 'integration',
    packageName: '@saas-factory/email-workflows',
    color: '#0ea5e9',
    icon: '📧',
    inputs: [
      { id: 'trigger', name: 'Trigger Event', type: 'event', required: true },
      { id: 'user', name: 'User', type: 'data', required: false },
    ],
    outputs: [
      { id: 'sent', name: 'Email Sent', type: 'event', required: false },
    ],
    configSchema: {
      provider: {
        type: 'select',
        label: 'Email Provider',
        defaultValue: 'resend',
        options: ['resend', 'sendgrid', 'mailgun'],
      },
    },
  },

  // ─── AI Agency ─────────────────────────────────────────────────────────────
  {
    id: 'ai-agency',
    name: 'AI Agency',
    description: 'Multi-agent AI system with Anthropic Claude and OpenAI GPT',
    category: 'ai',
    packageName: '@saas-factory/ai-agency',
    color: '#a855f7',
    icon: '🤖',
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'data', required: true },
      { id: 'context', name: 'Context', type: 'data', required: false },
    ],
    outputs: [
      { id: 'response', name: 'AI Response', type: 'data', required: false },
      { id: 'stream', name: 'Stream', type: 'event', required: false },
    ],
    configSchema: {
      model: {
        type: 'select',
        label: 'AI Model',
        defaultValue: 'claude-3-5-sonnet',
        options: ['claude-3-5-sonnet', 'claude-3-haiku', 'gpt-4o', 'gpt-4o-mini'],
      },
      streaming: {
        type: 'boolean',
        label: 'Enable Streaming',
        defaultValue: true,
      },
    },
  },

  // ─── Webhooks ──────────────────────────────────────────────────────────────
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Inbound and outbound webhook management with Svix',
    category: 'integration',
    packageName: '@saas-factory/webhooks',
    color: '#14b8a6',
    icon: '🔗',
    inputs: [
      { id: 'event', name: 'Event', type: 'event', required: true },
    ],
    outputs: [
      { id: 'delivered', name: 'Delivered', type: 'event', required: false },
    ],
    configSchema: {
      retryAttempts: {
        type: 'number',
        label: 'Retry Attempts',
        defaultValue: 3,
      },
    },
  },
]

export const BLOCK_REGISTRY_MAP = new Map(
  BLOCK_REGISTRY.map((b) => [b.id, b])
)

export const BLOCKS_BY_CATEGORY = BLOCK_REGISTRY.reduce<
  Record<string, BlockDefinition[]>
>((acc, block) => {
  if (!acc[block.category]) acc[block.category] = []
  acc[block.category].push(block)
  return acc
}, {})
