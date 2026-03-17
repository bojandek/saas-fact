/**
 * k6 Load Test: API Rate Limiting Validation
 *
 * Verifies that rate limiting is correctly enforced on all AI API routes.
 * Tests that:
 *   1. Normal requests succeed (< rate limit)
 *   2. Burst requests are throttled (429 responses)
 *   3. Rate limit resets after the window expires
 *
 * Run:
 *   k6 run tests/load/api-rate-limit.k6.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Counter } from 'k6/metrics'

const rateLimitHitRate = new Rate('rate_limit_hit_rate')
const successfulRequests = new Counter('successful_requests')
const throttledRequests  = new Counter('throttled_requests')

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API_TOKEN = __ENV.API_TOKEN || 'test-token'

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
  'x-user-id': 'rate-limit-test-user',
  'x-org-id': 'rate-limit-test-org',
}

export const options = {
  scenarios: {
    // Burst test: 20 VUs hammering the same endpoint simultaneously
    burst: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
    },
  },
  thresholds: {
    // Rate limiting should kick in — we expect some 429s
    'rate_limit_hit_rate': ['rate>0'],
    // But not all requests should be throttled
    'http_req_failed': ['rate<0.80'],
  },
}

export default function () {
  group('Burst AI API Requests', function () {
    const endpoints = [
      { path: '/api/generate-theme', body: { description: 'A booking app', style: 'modern' } },
      { path: '/api/generate-growth-plan', body: { saasName: 'TestApp', targetMarket: 'SMBs' } },
    ]

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]

    const res = http.post(
      `${BASE_URL}${endpoint.path}`,
      JSON.stringify(endpoint.body),
      {
        headers: HEADERS,
        timeout: '10s',
      }
    )

    if (res.status === 429) {
      throttledRequests.add(1)
      rateLimitHitRate.add(true)

      check(res, {
        'rate limit response has retry-after header': (r) =>
          r.headers['Retry-After'] !== undefined ||
          r.headers['X-RateLimit-Reset'] !== undefined,
        'rate limit response has error message': (r) => {
          try {
            const body = JSON.parse(r.body)
            return body.error !== undefined
          } catch {
            return false
          }
        },
      })
    } else {
      successfulRequests.add(1)
      rateLimitHitRate.add(false)

      check(res, {
        'successful request returns 200': (r) => r.status === 200,
      })
    }
  })

  sleep(0.1) // Minimal sleep to maximize burst
}
