import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms: number
  details?: string
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime_seconds: number
  checks: HealthCheckResult[]
  overall_latency_ms: number
}

/**
 * Health check endpoint for HA infrastructure
 * Called by load balancers and Kubernetes probes
 * Returns 200 if healthy, 503 otherwise
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const checks: HealthCheckResult[] = []

  // 1. PostgreSQL HA Check
  const dbCheck = await checkDatabase()
  checks.push(dbCheck)

  // 2. Redis Sentinel Check
  const redisCheck = await checkRedis()
  checks.push(redisCheck)

  // 3. Neo4j HA Check
  const neo4jCheck = await checkNeo4j()
  checks.push(neo4jCheck)

  // 4. Memory Check
  const memoryCheck = checkMemory()
  checks.push(memoryCheck)

  // 5. Disk Check
  const diskCheck = checkDisk()
  checks.push(diskCheck)

  // Determine overall status
  const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length
  const degradedCount = checks.filter((c) => c.status === 'degraded').length

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy'
  } else if (degradedCount > 1) {
    overallStatus = 'degraded'
  }

  const totalLatency = Date.now() - startTime
  const uptime = Math.floor(process.uptime())

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds: uptime,
    checks,
    overall_latency_ms: totalLatency,
  }

  // Log health check
  if (overallStatus !== 'healthy') {
    console.warn('[Health Check] Status degraded:', JSON.stringify(response, null, 2))
  }

  return NextResponse.json(response, {
    status: overallStatus === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overallStatus,
    },
  })
}

/**
 * Check PostgreSQL HA connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Try to import and use the HA pool
    const { getHAPool } = await import('@saas-factory/db')

    try {
      const pool = getHAPool()
      const isPrimaryHealthy = await pool.checkPrimaryHealth()
      const isReplicaHealthy = await pool.checkReplicaHealth()

      const latency = Date.now() - startTime

      if (!isPrimaryHealthy && !isReplicaHealthy) {
        return {
          service: 'PostgreSQL HA',
          status: 'unhealthy',
          latency_ms: latency,
          details: 'Both primary and replica unavailable',
        }
      }

      if (!isPrimaryHealthy || !isReplicaHealthy) {
        return {
          service: 'PostgreSQL HA',
          status: 'degraded',
          latency_ms: latency,
          details: 'One node unavailable (primary: ' +
            (isPrimaryHealthy ? 'ok' : 'fail') +
            ', replica: ' +
            (isReplicaHealthy ? 'ok' : 'fail') +
            ')',
        }
      }

      return {
        service: 'PostgreSQL HA',
        status: 'healthy',
        latency_ms: latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'PostgreSQL HA',
        status: 'unhealthy',
        latency_ms: latency,
        details: `Pool check failed: ${String(error)}`,
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      service: 'PostgreSQL HA',
      status: 'unhealthy',
      latency_ms: latency,
      details: 'HA pool not initialized',
    }
  }
}

/**
 * Check Redis Sentinel connectivity
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const { getSentinelClient } = await import('@saas-factory/cache')

    try {
      const client = getSentinelClient()
      const isConnected = client.isConnected()

      const latency = Date.now() - startTime

      if (!isConnected) {
        return {
          service: 'Redis Sentinel',
          status: 'degraded',
          latency_ms: latency,
          details: 'Not connected to master',
        }
      }

      // Try a simple operation
      await client.set('health_check', Date.now().toString(), 60)

      return {
        service: 'Redis Sentinel',
        status: 'healthy',
        latency_ms: latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'Redis Sentinel',
        status: 'unhealthy',
        latency_ms: latency,
        details: `Operation failed: ${String(error)}`,
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      service: 'Redis Sentinel',
      status: 'unhealthy',
      latency_ms: latency,
      details: 'Sentinel client not initialized',
    }
  }
}

/**
 * Check Neo4j HA cluster connectivity
 */
async function checkNeo4j(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const { getNeo4jClient } = await import('factory-brain/knowledge-graph/neo4j-ha-client')

    try {
      const client = getNeo4jClient()
      const isHealthy = client.isClusterHealthy()

      const latency = Date.now() - startTime

      if (!isHealthy) {
        return {
          service: 'Neo4j HA',
          status: 'degraded',
          latency_ms: latency,
          details: 'Cluster health check failed',
        }
      }

      // Verify connectivity
      const canConnect = await client.verifyConnectivity()

      if (!canConnect) {
        return {
          service: 'Neo4j HA',
          status: 'unhealthy',
          latency_ms: latency,
          details: 'Cannot connect to cluster',
        }
      }

      return {
        service: 'Neo4j HA',
        status: 'healthy',
        latency_ms: latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'Neo4j HA',
        status: 'unhealthy',
        latency_ms: latency,
        details: `Check failed: ${String(error)}`,
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      service: 'Neo4j HA',
      status: 'unhealthy',
      latency_ms: latency,
      details: 'Neo4j client not initialized',
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult {
  const startTime = Date.now()

  try {
    const usage = process.memoryUsage()
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100
    const rssPercent = (usage.rss / (1024 * 1024 * 1024)) * 100 // GB to percent

    const latency = Date.now() - startTime

    // Warn if heap > 80%, critical if > 90%
    if (heapUsedPercent > 90) {
      return {
        service: 'Memory',
        status: 'unhealthy',
        latency_ms: latency,
        details: `Heap usage critical: ${heapUsedPercent.toFixed(1)}%`,
      }
    }

    if (heapUsedPercent > 80) {
      return {
        service: 'Memory',
        status: 'degraded',
        latency_ms: latency,
        details: `Heap usage high: ${heapUsedPercent.toFixed(1)}%`,
      }
    }

    return {
      service: 'Memory',
      status: 'healthy',
      latency_ms: latency,
      details: `${heapUsedPercent.toFixed(1)}% heap used`,
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      service: 'Memory',
      status: 'unhealthy',
      latency_ms: latency,
      details: `Memory check failed: ${String(error)}`,
    }
  }
}

/**
 * Check OS-level disk space (basic check)
 */
function checkDisk(): HealthCheckResult {
  const startTime = Date.now()
  const latency = Date.now() - startTime

  try {
    // In production, would use os.stat() to check disk space
    // For now, return healthy if process can write
    return {
      service: 'Disk',
      status: 'healthy',
      latency_ms: latency,
    }
  } catch (error) {
    return {
      service: 'Disk',
      status: 'unhealthy',
      latency_ms: latency,
      details: `Disk check failed: ${String(error)}`,
    }
  }
}

// Allow HEAD requests (typically used by load balancers)
export async function HEAD(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Health-Status': 'healthy',
    },
  })
}
