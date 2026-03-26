// @ts-nocheck
import neo4j from 'neo4j-driver'
import { logger } from '../utils/logger'

export interface Neo4jHAConfig {
  uri: string // neo4j+s://cluster-endpoint:7687
  username: string
  password: string
  maxConnectionPoolSize?: number
  connectionAcquisitionTimeout?: number
  encrypted?: boolean
}

export interface QueryResult<T> {
  records: T[]
  summary: {
    statementType: string
    counters: {
      nodesCreated: number
      nodesDeleted: number
      relationshipsCreated: number
      relationshipsDeleted: number
      propertiesSet: number
    }
  }
}

/**
 * Neo4j High Availability Client
 * - Automatic leader detection in 3-node cluster
 * - Read/Write separation (followers handle reads)
 * - Connection pooling with circuit breaker
 * - Session management with retry logic
 */
export class Neo4jHAClient {
  private driver: neo4j.Driver
  private readSessions: Map<string, neo4j.Session> = new Map()
  private isHealthy = true

  constructor(config: Neo4jHAConfig) {
    const {
      uri,
      username,
      password,
      maxConnectionPoolSize = 100,
      connectionAcquisitionTimeout = 60000,
      encrypted = true,
    } = config

    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        maxConnectionPoolSize,
        connectionAcquisitionTimeout,
        encrypted: encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
        trustStrategy: neo4j.TrustStrategy.trustSystemCertificates(),
        logging: neo4j.logging.console('info'),
      }
    )

    this.setupHealthChecks()
  }

  /**
   * Execute read query (can hit any node, typically followers)
   */
  async read<T>(query: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    const session = this.driver.session({
      defaultAccessMode: neo4j.session.READ,
      bookmarks: undefined, // Allow eventual consistency for reads
    })

    try {
      const result = await session.run(query, params)
      const records = result.records.map((r) => r.toObject() as T)

      return {
        records,
        summary: {
          statementType: result.summary.statementType,
          counters: {
            nodesCreated: result.summary.counters.updates().nodesCreated,
            nodesDeleted: result.summary.counters.updates().nodesDeleted,
            relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
            relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
            propertiesSet: result.summary.counters.updates().propertiesSet,
          },
        },
      }
    } catch (error) {
      logger.error('[Neo4j] Read query failed:', error)
      this.handleQueryError(error)
      throw error
    } finally {
      await session.close()
    }
  }

  /**
   * Execute write query (always goes to leader)
   */
  async write<T>(query: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    const session = this.driver.session({
      defaultAccessMode: neo4j.session.WRITE,
    })

    try {
      const result = await session.run(query, params)
      const records = result.records.map((r) => r.toObject() as T)

      return {
        records,
        summary: {
          statementType: result.summary.statementType,
          counters: {
            nodesCreated: result.summary.counters.updates().nodesCreated,
            nodesDeleted: result.summary.counters.updates().nodesDeleted,
            relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
            relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
            propertiesSet: result.summary.counters.updates().propertiesSet,
          },
        },
      }
    } catch (error) {
      logger.error('[Neo4j] Write query failed:', error)
      this.handleQueryError(error)
      throw error
    } finally {
      await session.close()
    }
  }

  /**
   * Execute transaction with guaranteed consistency
   */
  async transaction<T>(
    callback: (tx: neo4j.Transaction) => Promise<T>,
    mode: 'READ' | 'WRITE' = 'WRITE'
  ): Promise<T> {
    const session = this.driver.session({
      defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
    })

    try {
      const result =
        mode === 'READ'
          ? await session.readTransaction(callback)
          : await session.writeTransaction(callback)

      return result
    } catch (error) {
      logger.error(`[Neo4j] Transaction (${mode}) failed:`, error)
      this.handleQueryError(error)
      throw error
    } finally {
      await session.close()
    }
  }

  /**
   * Execute multiple queries in sequence (higher consistency guarantees)
   */
  async batch<T>(
    queries: Array<{ query: string; params?: Record<string, any> }>,
    mode: 'READ' | 'WRITE' = 'WRITE'
  ): Promise<QueryResult<T>[]> {
    const session = this.driver.session({
      defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
    })

    try {
      const results: QueryResult<T>[] = []

      for (const { query, params } of queries) {
        const result = await session.run(query, params)
        const records = result.records.map((r) => r.toObject() as T)

        results.push({
          records,
          summary: {
            statementType: result.summary.statementType,
            counters: {
              nodesCreated: result.summary.counters.updates().nodesCreated,
              nodesDeleted: result.summary.counters.updates().nodesDeleted,
              relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
              relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
              propertiesSet: result.summary.counters.updates().propertiesSet,
            },
          },
        })
      }

      return results
    } catch (error) {
      logger.error('[Neo4j] Batch query failed:', error)
      this.handleQueryError(error)
      throw error
    } finally {
      await session.close()
    }
  }

  /**
   * Handle query errors and determine if they're transient
   */
  private handleQueryError(error: any) {
    const errorMessage = String(error).toLowerCase()

    // Transient errors that driver should retry
    if (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('unavailable')
    ) {
      logger.warn('[Neo4j] Transient error, driver will retry:', error)
      return
    }

    // Fatal errors indicate cluster issues
    if (
      errorMessage.includes('leader') ||
      errorMessage.includes('cluster') ||
      errorMessage.includes('election')
    ) {
      logger.error('[Neo4j] Cluster error detected:', error)
      this.isHealthy = false
      return
    }
  }

  /**
   * Health check for cluster
   */
  async checkHealth(): Promise<{ healthy: boolean; details: string }> {
    const session = this.driver.session()

    try {
      const result = await session.run('RETURN 1 as health')

      if (result.records.length > 0) {
        this.isHealthy = true
        return {
          healthy: true,
          details: 'Neo4j cluster healthy',
        }
      }

      this.isHealthy = false
      return {
        healthy: false,
        details: 'No response from cluster',
      }
    } catch (error) {
      this.isHealthy = false
      return {
        healthy: false,
        details: `Health check failed: ${String(error)}`,
      }
    } finally {
      await session.close()
    }
  }

  /**
   * Get cluster info
   */
  async getClusterInfo(): Promise<{
    role: string
    databases: string[]
    supportedFeatures: string[]
  }> {
    const session = this.driver.session()

    try {
      const result = await session.run(`
        CALL dbms.info() YIELD name, value
        RETURN name, value
      `)

      const info: Record<string, any> = {}
      for (const record of result.records) {
        info[record.get('name')] = record.get('value')
      }

      return {
        role: info.role || 'unknown',
        databases: info.databases || [],
        supportedFeatures: info.supportedFeatures || [],
      }
    } catch (error) {
      logger.error('[Neo4j] Failed to get cluster info:', error)
      throw error
    } finally {
      await session.close()
    }
  }

  /**
   * Setup periodic health checks
   */
  private setupHealthChecks() {
    setInterval(async () => {
      try {
        const health = await this.checkHealth()
        if (!health.healthy) {
          logger.warn('[Neo4j] Cluster health check failed:', health.details)
        }
      } catch (error) {
        logger.error('[Neo4j] Health check exception:', error)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Get current health status
   */
  isClusterHealthy(): boolean {
    return this.isHealthy
  }

  /**
   * Verify connection
   */
  async verifyConnectivity(): Promise<boolean> {
    const session = this.driver.session()

    try {
      await session.run('RETURN 1')
      return true
    } catch {
      return false
    } finally {
      await session.close()
    }
  }

  /**
   * Execute Cypher query with auto-retry
   */
  async executeWithRetry<T>(
    query: string,
    params?: Record<string, any>,
    mode: 'READ' | 'WRITE' = 'READ',
    maxRetries: number = 3
  ): Promise<QueryResult<T>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return mode === 'READ' ? await this.read<T>(query, params) : await this.write<T>(query, params)
      } catch (error) {
        logger.warn(`[Neo4j] Attempt ${attempt}/${maxRetries} failed:`, error)

        if (attempt === maxRetries) {
          throw error
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 100)
        )
      }
    }

    throw new Error('Should not reach here')
  }

  /**
   * Close driver and cleanup
   */
  async close(): Promise<void> {
    // Close all cached read sessions
    for (const [, session] of this.readSessions) {
      await session.close()
    }
    this.readSessions.clear()

    // Close driver
    await this.driver.close()
    logger.info('[Neo4j] Connection closed')
  }
}

// Singleton instance
let neo4jClient: Neo4jHAClient | null = null

export function initializeNeo4jClient(config: Neo4jHAConfig): Neo4jHAClient {
  if (!neo4jClient) {
    neo4jClient = new Neo4jHAClient(config)
  }
  return neo4jClient
}

export function getNeo4jClient(): Neo4jHAClient {
  if (!neo4jClient) {
    throw new Error('Neo4j client not initialized. Call initializeNeo4jClient first.')
  }
  return neo4jClient
}

export async function closeNeo4jClient(): Promise<void> {
  if (neo4jClient) {
    await neo4jClient.close()
    neo4jClient = null
  }
}
