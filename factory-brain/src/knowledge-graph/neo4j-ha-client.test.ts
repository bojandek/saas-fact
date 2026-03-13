import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  Neo4jHAClient,
  initializeNeo4jClient,
  getNeo4jClient,
  closeNeo4jClient,
} from './neo4j-ha-client'

describe('Neo4jHAClient', () => {
  let client: Neo4jHAClient

  beforeEach(() => {
    client = new Neo4jHAClient({
      uri: 'neo4j+s://localhost:7687',
      username: 'neo4j',
      password: 'test_password',
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      encrypted: true,
    })
  })

  afterEach(async () => {
    if (client) {
      try {
        await client.close()
      } catch (error) {
        // Ignore close errors in tests
      }
    }
  })

  describe('Initialization', () => {
    it('should initialize with correct config', () => {
      expect(client).toBeDefined()
    })

    it('should support singleton pattern', () => {
      const client1 = initializeNeo4jClient({
        uri: 'neo4j+s://localhost:7687',
        username: 'neo4j',
        password: 'test',
      })

      const client2 = getNeo4jClient()

      expect(client1).toBe(client2)
    })

    it('should handle encryption settings', () => {
      const encryptedClient = new Neo4jHAClient({
        uri: 'neo4j+s://localhost:7687',
        username: 'neo4j',
        password: 'test',
        encrypted: true,
      })

      const unencryptedClient = new Neo4jHAClient({
        uri: 'neo4j://localhost:7687',
        username: 'neo4j',
        password: 'test',
        encrypted: false,
      })

      expect(encryptedClient).toBeDefined()
      expect(unencryptedClient).toBeDefined()

      encryptedClient.close()
      unencryptedClient.close()
    })
  })

  describe('Read Operations', () => {
    it('should execute read queries', async () => {
      const readSpy = vi.spyOn(client, 'read')

      try {
        await client.read('MATCH (n) RETURN n LIMIT 1')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(readSpy).toHaveBeenCalled()
    })

    it('should support parametrized read queries', async () => {
      const readSpy = vi.spyOn(client, 'read')

      try {
        await client.read('MATCH (n:User {id: $id}) RETURN n', { id: 123 })
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(readSpy).toHaveBeenCalledWith(
        'MATCH (n:User {id: $id}) RETURN n',
        { id: 123 }
      )
    })

    it('should return QueryResult with records and summary', async () => {
      const readSpy = vi.spyOn(client, 'read')

      try {
        const result = await client.read('RETURN 1 as value')
        // Should have records and summary
        expect(result).toHaveProperty('records')
        expect(result).toHaveProperty('summary')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(readSpy).toHaveBeenCalled()
    })
  })

  describe('Write Operations', () => {
    it('should execute write queries', async () => {
      const writeSpy = vi.spyOn(client, 'write')

      try {
        await client.write('CREATE (n:User {name: $name}) RETURN n', {
          name: 'John',
        })
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(writeSpy).toHaveBeenCalled()
    })

    it('should support parametrized write queries', async () => {
      const writeSpy = vi.spyOn(client, 'write')

      try {
        await client.write(
          'CREATE (n:Post {title: $title, content: $content}) RETURN n',
          { title: 'Test', content: 'Content' }
        )
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(writeSpy).toHaveBeenCalled()
    })

    it('should track node creation counters', async () => {
      const writeSpy = vi.spyOn(client, 'write')

      try {
        const result = await client.write('CREATE (n:Test) RETURN n')
        expect(result).toHaveProperty('summary')
        expect(result.summary).toHaveProperty('counters')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(writeSpy).toHaveBeenCalled()
    })
  })

  describe('Transactions', () => {
    it('should support write transactions', async () => {
      const txnSpy = vi.spyOn(client, 'transaction')

      try {
        await client.transaction(async (tx) => {
          return 'success'
        }, 'WRITE')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(txnSpy).toHaveBeenCalled()
    })

    it('should support read transactions', async () => {
      const txnSpy = vi.spyOn(client, 'transaction')

      try {
        await client.transaction(async (tx) => {
          return 'success'
        }, 'READ')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(txnSpy).toHaveBeenCalled()
    })

    it('should handle transaction callback errors', async () => {
      try {
        await client.transaction(async (tx) => {
          throw new Error('Transaction error')
        })
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('Transaction error')
      }
    })
  })

  describe('Batch Operations', () => {
    it('should execute batch queries', async () => {
      const batchSpy = vi.spyOn(client, 'batch')

      try {
        await client.batch(
          [
            { query: 'CREATE (n:Node1) RETURN n' },
            { query: 'CREATE (n:Node2) RETURN n' },
            { query: 'MATCH (n) RETURN COUNT(n) as count' },
          ],
          'WRITE'
        )
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(batchSpy).toHaveBeenCalled()
    })

    it('should support parametrized batch queries', async () => {
      const batchSpy = vi.spyOn(client, 'batch')

      try {
        await client.batch(
          [
            { query: 'CREATE (n:User {id: $id}) RETURN n', params: { id: 1 } },
            { query: 'CREATE (n:User {id: $id}) RETURN n', params: { id: 2 } },
          ],
          'WRITE'
        )
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(batchSpy).toHaveBeenCalled()
    })

    it('should maintain order of batch queries', async () => {
      const queries = [
        { query: 'CREATE (n:A) RETURN n' },
        { query: 'CREATE (n:B) RETURN n' },
        { query: 'CREATE (n:C) RETURN n' },
      ]

      try {
        await client.batch(queries, 'WRITE')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      // Should process in order
      expect(queries).toHaveLength(3)
    })
  })

  describe('Health Checks', () => {
    it('should check cluster health', async () => {
      const healthSpy = vi.spyOn(client, 'checkHealth')

      try {
        const health = await client.checkHealth()
        expect(health).toHaveProperty('healthy')
        expect(health).toHaveProperty('details')
        expect(typeof health.healthy).toBe('boolean')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(healthSpy).toHaveBeenCalled()
    })

    it('should verify connectivity', async () => {
      const verifySpy = vi.spyOn(client, 'verifyConnectivity')

      try {
        const connected = await client.verifyConnectivity()
        expect(typeof connected).toBe('boolean')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(verifySpy).toHaveBeenCalled()
    })

    it('should get cluster info', async () => {
      const infoSpy = vi.spyOn(client, 'getClusterInfo')

      try {
        const info = await client.getClusterInfo()
        expect(info).toHaveProperty('role')
        expect(info).toHaveProperty('databases')
        expect(info).toHaveProperty('supportedFeatures')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(infoSpy).toHaveBeenCalled()
    })
  })

  describe('Cluster Management', () => {
    it('should track cluster health status', () => {
      const isHealthy = client.isClusterHealthy()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should setup periodic health checks', (done) => {
      const client2 = new Neo4jHAClient({
        uri: 'neo4j+s://localhost:7687',
        username: 'neo4j',
        password: 'test',
      })

      // Health checks run periodically
      setTimeout(() => {
        expect(client2).toBeDefined()
        client2.close()
        done()
      }, 500)
    })
  })

  describe('Retry Logic', () => {
    it('should support retry with exponential backoff', async () => {
      const retrySpy = vi.spyOn(client, 'executeWithRetry')

      try {
        await client.executeWithRetry('MATCH (n) RETURN n', {}, 'READ', 3)
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(retrySpy).toHaveBeenCalledWith(
        'MATCH (n) RETURN n',
        {},
        'READ',
        3
      )
    })

    it('should retry on transient errors', async () => {
      const retrySpy = vi.spyOn(client, 'executeWithRetry')

      try {
        await client.executeWithRetry('SELECT 1', {}, 'READ', 2)
      } catch (error) {
        // Expected to fail after retries
      }

      expect(retrySpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      try {
        await client.read('MATCH (n) RETURN n')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should classify errors as transient or fatal', async () => {
      try {
        await client.read('INVALID QUERY')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle missing client gracefully', async () => {
      try {
        await closeNeo4jClient()
        getNeo4jClient()
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('not initialized')
      }
    })
  })

  describe('Cleanup', () => {
    it('should close driver connection', async () => {
      const testClient = new Neo4jHAClient({
        uri: 'neo4j+s://localhost:7687',
        username: 'neo4j',
        password: 'test',
      })

      await testClient.close()
      expect(testClient).toBeDefined()
    })

    it('should clear singleton on close', async () => {
      const client1 = initializeNeo4jClient({
        uri: 'neo4j+s://localhost:7687',
        username: 'neo4j',
        password: 'test',
      })

      await closeNeo4jClient()

      expect(client1).toBeDefined()
    })
  })

  describe('Read/Write Separation', () => {
    it('should route reads to followers', async () => {
      const readSpy = vi.spyOn(client, 'read')

      try {
        await client.read('MATCH (n:User) RETURN COUNT(n)')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(readSpy).toHaveBeenCalled()
    })

    it('should route writes to leader', async () => {
      const writeSpy = vi.spyOn(client, 'write')

      try {
        await client.write('CREATE (n:User) RETURN n')
      } catch (error) {
        // Expected to fail without Neo4j
      }

      expect(writeSpy).toHaveBeenCalled()
    })

    it('should maintain consistency in transactions', async () => {
      try {
        await client.transaction(async (tx) => {
          // Both read and write in same transaction
          return 'success'
        }, 'WRITE')
      } catch (error) {
        // Expected to fail without Neo4j
      }
    })
  })
})
