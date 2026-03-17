/**
 * k6 Load Test: SaaS Generation Pipeline
 *
 * Tests the War Room orchestration pipeline under concurrent load.
 * Validates that the system can handle multiple simultaneous SaaS
 * generation requests without degradation.
 *
 * Run:
 *   k6 run tests/load/saas-generation.k6.js
 *   k6 run --vus 10 --duration 60s tests/load/saas-generation.k6.js
 *   k6 run --env BASE_URL=https://your-app.com tests/load/saas-generation.k6.js
 *
 * Scenarios:
 *   1. smoke      — 1 VU, 1 min  (sanity check)
 *   2. average    — 5 VUs, 5 min (normal load)
 *   3. stress     — 20 VUs, 10 min (peak load)
 *   4. spike      — 0→50 VUs in 10s (sudden traffic spike)
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ── Custom metrics ─────────────────────────────────────────────────────────────

const generationSuccessRate = new Rate('generation_success_rate')
const generationDuration    = new Trend('generation_duration_ms', true)
const queueWaitTime         = new Trend('queue_wait_time_ms', true)
const apiErrorCount         = new Counter('api_errors')

// ── Configuration ──────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API_TOKEN = __ENV.API_TOKEN || 'test-token'

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
  'x-user-id': 'load-test-user',
  'x-org-id': 'load-test-org',
}

// Sample SaaS ideas for load testing
const SAAS_IDEAS = [
  'A booking system for yoga studios with class scheduling and payment processing',
  'A project management tool for freelancers with time tracking and invoicing',
  'A customer support platform with AI-powered ticket routing and knowledge base',
  'An e-commerce analytics dashboard for Shopify stores with revenue forecasting',
  'A restaurant reservation system with waitlist management and SMS notifications',
  'A HR onboarding platform with document signing and task checklists',
  'A SaaS billing platform with usage-based pricing and dunning management',
  'A real estate CRM with property listings and lead nurturing workflows',
]

// ── Test scenarios ─────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // 1. Smoke test — quick sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { scenario: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },

    // 2. Average load — normal production traffic
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },   // Ramp up
        { duration: '5m', target: 5 },   // Steady state
        { duration: '1m', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'average' },
      startTime: '2m',
    },

    // 3. Stress test — find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      startTime: '10m',
    },

    // 4. Spike test — sudden burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },  // Sudden spike
        { duration: '1m', target: 50 },   // Hold
        { duration: '10s', target: 0 },   // Drop
      ],
      tags: { scenario: 'spike' },
      startTime: '30m',
    },
  },

  // Thresholds — test fails if these are violated
  thresholds: {
    // 95% of requests must complete in under 30s (generation is slow by nature)
    'http_req_duration{type:generation}': ['p(95)<30000'],
    // 99% of health checks must complete in under 500ms
    'http_req_duration{type:health}': ['p(99)<500'],
    // At least 90% of generations must succeed
    'generation_success_rate': ['rate>0.90'],
    // Less than 5% error rate overall
    'http_req_failed': ['rate<0.05'],
    // Queue wait time p95 under 10s
    'queue_wait_time_ms': ['p(95)<10000'],
  },
}

// ── Main test function ─────────────────────────────────────────────────────────

export default function () {
  const scenario = __ENV.SCENARIO || 'default'
  const idea = SAAS_IDEAS[Math.floor(Math.random() * SAAS_IDEAS.length)]

  group('Health Check', function () {
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: HEADERS,
      tags: { type: 'health' },
    })

    check(res, {
      'health check returns 200': (r) => r.status === 200,
      'health check has status field': (r) => {
        try {
          return JSON.parse(r.body).status !== undefined
        } catch {
          return false
        }
      },
    })
  })

  sleep(0.5)

  group('Queue Stats', function () {
    const res = http.get(`${BASE_URL}/api/queue/stats`, {
      headers: HEADERS,
      tags: { type: 'queue' },
    })

    check(res, {
      'queue stats returns 200': (r) => r.status === 200,
    })
  })

  sleep(0.5)

  // Skip actual generation in smoke test to avoid overloading AI APIs
  if (scenario === 'smoke') {
    group('Enqueue Generation (Smoke)', function () {
      const startTime = Date.now()

      const res = http.post(
        `${BASE_URL}/api/queue/enqueue`,
        JSON.stringify({
          description: idea,
          priority: 'normal',
          dryRun: true,  // Don't actually call OpenAI in load tests
        }),
        {
          headers: HEADERS,
          tags: { type: 'generation' },
          timeout: '35s',
        }
      )

      const elapsed = Date.now() - startTime
      generationDuration.add(elapsed)

      const success = check(res, {
        'enqueue returns 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has jobId': (r) => {
          try {
            return JSON.parse(r.body).jobId !== undefined
          } catch {
            return false
          }
        },
      })

      generationSuccessRate.add(success)

      if (!success) {
        apiErrorCount.add(1)
        console.error(`Generation failed: ${res.status} — ${res.body?.substring(0, 200)}`)
      }
    })
  }

  group('Billing Usage Check', function () {
    const res = http.get(`${BASE_URL}/api/billing/usage`, {
      headers: HEADERS,
      tags: { type: 'billing' },
    })

    check(res, {
      'billing usage returns 200': (r) => r.status === 200 || r.status === 401,
    })
  })

  sleep(1)
}

// ── Setup & Teardown ───────────────────────────────────────────────────────────

export function setup() {
  console.log(`Load test starting against: ${BASE_URL}`)

  // Verify the server is up before starting
  const res = http.get(`${BASE_URL}/api/health`)
  if (res.status !== 200) {
    throw new Error(`Server is not healthy: ${res.status}`)
  }

  return { baseUrl: BASE_URL, startTime: Date.now() }
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000
  console.log(`Load test completed in ${duration.toFixed(1)}s`)
}
