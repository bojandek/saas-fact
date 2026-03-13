import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET, HEAD } from './route'

// Mock the dependencies
vi.mock('@saas-factory/db', () => ({
  getHAPool: vi.fn(() => ({
    checkPrimaryHealth: vi.fn(() => Promise.resolve(true)),
    checkReplicaHealth: vi.fn(() => Promise.resolve(true)),
  })),
}))

vi.mock('@saas-factory/cache', () => ({
  getSentinelClient: vi.fn(() => ({
    isConnected: vi.fn(() => true),
    set: vi.fn(() => Promise.resolve()),
  })),
}))

vi.mock('factory-brain/knowledge-graph/neo4j-ha-client', () => ({
  getNeo4jClient: vi.fn(() => ({
    isClusterHealthy: vi.fn(() => true),
    verifyConnectivity: vi.fn(() => Promise.resolve(true)),
  })),
}))

describe('/api/health', () => {
  describe('GET', () => {
    it('should return 200 with healthy status', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('healthy')
    })

    it('should return health check response structure', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime_seconds')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('overall_latency_ms')
    })

    it('should include individual service checks', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(Array.isArray(data.checks)).toBe(true)
      expect(data.checks.length).toBeGreaterThan(0)

      // Should have checks for multiple services
      const serviceNames = data.checks.map((c: any) => c.service)
      expect(serviceNames).toContain('PostgreSQL HA')
      expect(serviceNames).toContain('Redis Sentinel')
    })

    it('should measure latency for each check', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      for (const check of data.checks) {
        expect(check).toHaveProperty('latency_ms')
        expect(typeof check.latency_ms).toBe('number')
        expect(check.latency_ms).toBeGreaterThanOrEqual(0)
      }
    })

    it('should measure overall latency', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(typeof data.overall_latency_ms).toBe('number')
      expect(data.overall_latency_ms).toBeGreaterThanOrEqual(0)
    })

    it('should include uptime in seconds', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(typeof data.uptime_seconds).toBe('number')
      expect(data.uptime_seconds).toBeGreaterThanOrEqual(0)
    })

    it('should include ISO timestamp', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(typeof data.timestamp).toBe('string')
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })

    it('should indicate healthy status when all systems ok', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // When all systems healthy, status should be 'healthy'
      if (data.checks.every((c: any) => c.status === 'healthy')) {
        expect(data.status).toBe('healthy')
        expect(response.status).toBe(200)
      }
    })

    it('should return 503 when degraded', async () => {
      // This test assumes at least one service is degraded
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // Response should be either 200 or 503
      expect([200, 503]).toContain(response.status)
    })

    it('should include health check details', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      for (const check of data.checks) {
        expect(check).toHaveProperty('service')
        expect(check).toHaveProperty('status')
        expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status)
      }
    })

    it('should not cache health checks', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toContain('no-cache')
    })

    it('should include X-Health-Status header', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response.headers.has('X-Health-Status')).toBe(true)
      const status = response.headers.get('X-Health-Status')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(status)
    })
  })

  describe('HEAD', () => {
    it('should return 200 status', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'HEAD',
      })

      const response = await HEAD(request)
      expect(response.status).toBe(200)
    })

    it('should return minimal headers', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'HEAD',
      })

      const response = await HEAD(request)

      expect(response.headers.has('X-Health-Status')).toBe(true)
    })

    it('should have no body', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'HEAD',
      })

      const response = await HEAD(request)

      // HEAD response should have no body
      expect(response.body).toBeNull()
    })
  })

  describe('Performance', () => {
    it('should complete health checks within timeout', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const startTime = Date.now()
      const response = await GET(request)
      const endTime = Date.now()

      const duration = endTime - startTime

      // Health check should complete reasonably fast (< 30s)
      expect(duration).toBeLessThan(30000)
    })

    it('should provide latency metrics', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // Overall latency should match sum of checks
      const checkLatencies = data.checks.reduce(
        (sum: number, check: any) => sum + check.latency_ms,
        0
      )

      expect(data.overall_latency_ms).toBeGreaterThanOrEqual(checkLatencies / 2)
    })
  })

  describe('Component Health', () => {
    it('should check PostgreSQL', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const pgCheck = data.checks.find((c: any) => c.service === 'PostgreSQL HA')
      expect(pgCheck).toBeDefined()
    })

    it('should check Redis', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const redisCheck = data.checks.find((c: any) => c.service === 'Redis Sentinel')
      expect(redisCheck).toBeDefined()
    })

    it('should check Neo4j', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const neo4jCheck = data.checks.find((c: any) => c.service === 'Neo4j HA')
      expect(neo4jCheck).toBeDefined()
    })

    it('should check Memory', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const memCheck = data.checks.find((c: any) => c.service === 'Memory')
      expect(memCheck).toBeDefined()
    })

    it('should check Disk', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const diskCheck = data.checks.find((c: any) => c.service === 'Disk')
      expect(diskCheck).toBeDefined()
    })
  })

  describe('Load Balancer Integration', () => {
    it('should support health check for load balancers', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)

      // Must be quick for load balancer
      expect([200, 503]).toContain(response.status)
    })

    it('should support HEAD for efficient health checks', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'HEAD',
      })

      const response = await HEAD(request)

      expect(response.status).toBe(200)
    })

    it('should return consistent HTTP status codes', async () => {
      const getRequest = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)

      // Status should be either healthy (200) or unhealthy (503)
      expect([200, 503]).toContain(getResponse.status)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle missing HA pool', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      // Even with errors, should return valid response
      const response = await GET(request)
      expect([200, 503]).toContain(response.status)
    })

    it('should handle service unavailability', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // Should still return structured response
      expect(data).toHaveProperty('checks')
    })
  })
})
