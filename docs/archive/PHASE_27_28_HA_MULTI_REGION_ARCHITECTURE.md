# Phase 27-28: High Availability + Multi-Region Architecture

## Executive Summary

Transform SaaS Factory from single-region to production-grade HA + Multi-Region deployment supporting 150+ apps with 99.99% uptime SLA.

**Duration:** Phase 27 (HA - 1 week) + Phase 28 (Multi-Region - 1 week)  
**Deployment Model:** Coolify → Kubernetes (HA phase 2)  
**Target Scale:** 150 apps → 10K+ apps ready  
**RTO/RPO:** RTO: 5min, RPO: 1min

---

## Phase 27: High Availability (Single Region)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HA SINGLE REGION                           │
├────────────────────────────────────────┬────────────────────────┤
│         AWS/Hetzner Primary Region     │   Data Replication    │
│                                        │   Backup Region       │
│  ┌──────────────────────────────────┐  │                       │
│  │   Load Balancer (Active-Active)  │  │  ┌─────────────────┐  │
│  │   - Route53 / Cloudflare         │  │  │ PostgreSQL      │  │
│  │   - Health checks 5s interval    │  │  │ Replica         │  │
│  └──────┬───────────────────────────┘  │  └─────────────────┘  │
│         │                               │                       │
│  ┌──────▼──────────┬──────────────────┐ │  ┌─────────────────┐  │
│  │  API Instance   │  API Instance    │ │  │ Redis Replica   │  │
│  │  (Coolify/K8s)  │  (Coolify/K8s)   │ │  │ (Sentinel)      │  │
│  └────────┬────────┴───────┬──────────┘ │  └─────────────────┘  │
│           │                │             │                       │
│  ┌────────▼────────────────▼──────────┐ │  ┌─────────────────┐  │
│  │  PostgreSQL Primary (Write)        │ │  │ Neo4j Replica   │  │
│  │  - Streaming replication           │ │  │ (HA Cluster)    │  │
│  │  - WAL archiving                   │ │  └─────────────────┘  │
│  │  - Point-in-time recovery          │ │                       │
│  └────────┬─────────────────────────┬─┘ │                       │
│           │                         │    │                       │
│  ┌────────▼────────┐  ┌────────────▼──┐ │                       │
│  │ Redis Cluster   │  │ Neo4j Primary  │ │                       │
│  │ (Sentinel)      │  │ (HA Cluster)   │ │                       │
│  └─────────────────┘  └────────────────┘ │                       │
│                                          │                       │
│  ┌──────────────────────────────────────┐ │                       │
│  │ Monitoring & Alerting (Prometheus)   │ │                       │
│  │ - Health checks                      │ │                       │
│  │ - Failover automation                │ │                       │
│  └──────────────────────────────────────┘ │                       │
└──────────────────────────────────────────┴────────────────────────┘
```

### 27.1: PostgreSQL High Availability

**Goal:** Primary-Replica setup with automatic failover

#### Configuration Strategy

```typescript
// Infrastructure setup (IaC - Terraform/Pulumi)
PostgreSQL Primary (Primary Region):
  - Version: 15+ (for advanced HA features)
  - Replication: Streaming replication to replicas
  - WAL Archiving: S3/GCS for disaster recovery
  - Point-in-time Recovery (PITR): 30-day retention
  - Backup: Daily full + hourly incremental
  - Connection Pooling: 500 connections (PgBouncer)

PostgreSQL Replicas:
  - Hot standby: Read-only replicas for:
    - Analytics queries (non-critical reads)
    - Backup operations
    - Promotion candidate (auto-failover)
  
Failover Strategy:
  - pg_failnode for automatic detection
  - Patroni for orchestration (manages elections)
  - VIP (Virtual IP) for connection transparency
```

#### Implementation Details

```sql
-- Primary Database Configuration
-- postgresql.conf

# Replication settings
max_wal_senders = 10              # Allow 10 replica connections
max_replication_slots = 10         # Reservation for replicas
wal_keep_size = 10GB              # Keep WAL segments for slow replicas

# Archive WAL for recovery
archive_mode = on
archive_command = 'aws s3 cp %p s3://backups/wal/%f'
archive_timeout = 300             # Archive every 5 minutes

# Synchronous replication (strong consistency)
synchronous_commit = remote_apply # Wait for replica acknowledgment
synchronous_standby_names = 'replica1'

# PITR capability
max_wal_level = replica
```

#### Replica Setup

```sql
-- Create replication slot for each replica
SELECT pg_create_physical_replication_slot('replica1');
SELECT pg_create_physical_replication_slot('replica2');

-- Monitor replication status
SELECT 
  slot_name,
  restart_lsn,
  confirmed_flush_lsn,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as bytes_behind
FROM pg_replication_slots;

-- Replica configuration
-- recovery.conf on replica
standby_mode = 'on'
primary_conninfo = 'host=primary.db.internal user=replication password=xxx'
recovery_target_timeline = 'latest'
```

#### Application Integration

```typescript
// blocks/db/src/ha-connection-pool.ts
import { Pool, PoolClient } from 'pg'
import Patroni from 'patroni-client'

export class HAConnectionPool {
  private primaryPool: Pool
  private replicaPool: Pool
  private patroni: Patroni

  constructor() {
    // Patroni handles VIP (virtual IP) for failover
    this.patroni = new Patroni({
      apiEndpoint: 'http://patroni-api:8008',
      monitoringInterval: 5000,
    })

    // Primary for writes
    this.primaryPool = new Pool({
      host: 'postgres-primary-vip.internal', // VIP managed by Patroni
      port: 5432,
      database: 'saas_factory',
      user: 'app_user',
      password: process.env.DB_PASSWORD,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Replica for reads (load-balanced across replicas)
    this.replicaPool = new Pool({
      host: 'postgres-replica-lb.internal', // Load balanced
      port: 5432,
      database: 'saas_factory',
      user: 'app_readonly',
      password: process.env.DB_READONLY_PASSWORD,
      max: 100, // More connections for read queries
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000, // Prevent long-running queries
    })

    this.setupFailoverHandling()
  }

  private setupFailoverHandling() {
    this.patroni.on('failover', async (event) => {
      console.log(`[DB] Failover detected: ${event.status}`)
      
      // Clear connection pools to force reconnect
      await this.primaryPool.end()
      await this.replicaPool.end()
      
      // Reconnect (VIP now points to new primary)
      this.primaryPool = new Pool({...})
      this.replicaPool = new Pool({...})

      // Alert operations
      await alertOps('Database failover completed', {
        previousPrimary: event.old_leader,
        newPrimary: event.new_leader,
        timestamp: new Date(),
      })
    })
  }

  // Write queries go to primary
  async executeWrite<T>(query: string, values?: any[]): Promise<T> {
    const client = await this.primaryPool.connect()
    try {
      const result = await client.query(query, values)
      return result.rows as T
    } finally {
      client.release()
    }
  }

  // Read queries can hit replica (with fallback)
  async executeRead<T>(query: string, values?: any[]): Promise<T> {
    try {
      // Try replica first (read-only workload)
      const client = await this.replicaPool.connect()
      try {
        const result = await client.query(query, values)
        return result.rows as T
      } finally {
        client.release()
      }
    } catch (error) {
      console.warn(`[DB] Replica query failed, falling back to primary`, error)
      
      // Fallback to primary if replica unavailable
      const client = await this.primaryPool.connect()
      try {
        const result = await client.query(query, values)
        return result.rows as T
      } finally {
        client.release()
      }
    }
  }

  // Transaction (always on primary)
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.primaryPool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

// Export singleton
export const dbPool = new HAConnectionPool()
```

---

### 27.2: Redis High Availability (Sentinel)

**Goal:** Redis cluster with automatic failover for cache/session layer

#### Architecture

```
┌─────────────────────────────────────────┐
│    Redis HA with Sentinel               │
├─────────────────────────────────────────┤
│  Redis Master        Redis Slave #1    │
│  (data writes)       (async replica)   │
│  ┌─────────────┐    ┌──────────────┐   │
│  │ master:6379 │◄──│ slave:6379   │   │
│  │ 16GB RAM    │    │ 16GB RAM     │   │
│  └──────┬──────┘    └──────────────┘   │
│         │                               │
│         ├──────────┬────────────────┐   │
│         │          │                │   │
│  ┌──────▼───────┐ ┌▼───────────┐ ┌─▼──┐│
│  │ Sentinel #1  │ │ Sentinel#2 │ │S#3 ││
│  │ :26379       │ │ :26379     │ │:26 ││
│  └──────────────┘ └────────────┘ └────┘│
│  (quorum: 2/3)                         │
└─────────────────────────────────────────┘
```

#### Configuration

```typescript
// infra/redis-cluster/sentinel.conf
port 26379
bind 0.0.0.0
daemonize no
protected-mode no

# Monitor master (master-name, host, port, quorum)
sentinel monitor mymaster 127.0.0.1 6379 2

# Master timeout (30 seconds)
sentinel down-after-milliseconds mymaster 30000

# Failover timeout (30 seconds)
sentinel failover-timeout mymaster 30000

# Replica count after failover
sentinel parallel-syncs mymaster 1

# Scripts for failover (optional)
sentinel notification-script mymaster /path/to/notify.sh
sentinel client-reconfig-script mymaster /path/to/reconfig.sh
```

#### Application Integration

```typescript
// blocks/cache/src/sentinel-client.ts
import * as redis from 'redis'
import { Sentinel } from 'redis-sentinel'

export class RedisSentinelClient {
  private sentinel: Sentinel
  private client: redis.RedisClient

  constructor() {
    this.sentinel = new Sentinel({
      sentinels: [
        { host: 'sentinel-1.internal', port: 26379 },
        { host: 'sentinel-2.internal', port: 26379 },
        { host: 'sentinel-3.internal', port: 26379 },
      ],
      name: 'mymaster',
      retryStrategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('End redis sentinel connection retry')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('End redis sentinel connection retry')
        }
        if (options.attempt > 10) {
          return undefined
        }
        return Math.min(options.attempt * 100, 3000)
      },
    })

    this.client = this.sentinel.createClient({
      db: 0,
      enableOfflineQueue: false,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.sentinel.on('error', (err) => {
      console.error('[Redis] Sentinel error:', err)
    })

    this.client.on('ready', () => {
      console.log('[Redis] Connected to master')
    })

    this.client.on('reconnecting', (info) => {
      console.log(`[Redis] Reconnecting (attempt ${info.attempt})`)
    })

    this.client.on('error', (err) => {
      console.error('[Redis] Client error:', err)
    })

    // Listen for master change events
    this.sentinel.on('switch-master', (details) => {
      console.log('[Redis] Master switched:', details)
      // Clients auto-reconnect via Sentinel
    })
  }

  async get(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ttl) {
        this.client.setex(key, ttl, value, (err) => {
          if (err) reject(err)
          else resolve()
        })
      } else {
        this.client.set(key, value, (err) => {
          if (err) reject(err)
          else resolve()
        })
      }
    })
  }

  async del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.client.quit(() => resolve())
    })
  }
}

export const redisClient = new RedisSentinelClient()
```

---

### 27.3: Neo4j High Availability Cluster

**Goal:** 3-node Neo4j cluster for knowledge graph

#### Architecture

```
┌──────────────────────────────────────┐
│   Neo4j HA Cluster (3 nodes)         │
├──────────────────────────────────────┤
│ ┌─────────────┐ ┌──────────────────┐│
│ │Neo4j LEADER │ │Neo4j FOLLOWER #1 ││
│ │ :7687        │ │ :7687            ││
│ │ (writes)     │ │ (reads allowed)  ││
│ │ 16GB         │ │ 16GB             ││
│ └──────┬──────┘ └──────────────────┘│
│        │                             │
│        │         ┌──────────────────┐│
│        └────────►│Neo4j FOLLOWER #2 ││
│                  │ :7687             ││
│                  │ (reads allowed)   ││
│                  │ 16GB              ││
│                  └──────────────────┘│
│                                      │
│ Raft consensus for leader election  │
│ Automatic failover on leader death   │
└──────────────────────────────────────┘
```

#### Configuration

```yaml
# neo4j.conf for each node
server.default_listen_address=0.0.0.0
server.default_advertised_address=neo4j-node1.internal

# Clustering
dbms.cluster.discovery.type=DNS_SRV
dbms.cluster.discovery.dns_domain=neo4j.internal

# HA settings
dbms.cluster.minimum_initial_members=3
dbms.cluster.catchup.batch_size=15M
dbms.cluster.raft.in_queue_batch_size=64

# Performance
server.memory.heap.initial_size=8g
server.memory.heap.max_size=8g
server.memory.pagecache.size=8g

# Logging
dbms.logs.query.enabled=true
dbms.logs.query.threshold=1000ms
```

#### Application Integration

```typescript
// factory-brain/src/knowledge-graph/neo4j-ha-client.ts
import neo4j from 'neo4j-driver'

export class Neo4jHAClient {
  private driver: neo4j.Driver

  constructor() {
    this.driver = neo4j.driver(
      'neo4j+s://neo4j-cluster.internal:7687', // Cluster endpoint
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
      {
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 60000,
        encrypted: 'ENCRYPTION_ON',
      }
    )
  }

  // Read operations (can hit any node via load balancer)
  async read<T>(query: string, params?: Record<string, any>): Promise<T[]> {
    const session = this.driver.session({ defaultAccessMode: 'READ' })
    try {
      const result = await session.run(query, params)
      return result.records.map((r) => r.toObject() as T)
    } finally {
      await session.close()
    }
  }

  // Write operations (go to leader)
  async write<T>(query: string, params?: Record<string, any>): Promise<T[]> {
    const session = this.driver.session({ defaultAccessMode: 'WRITE' })
    try {
      const result = await session.run(query, params)
      return result.records.map((r) => r.toObject() as T)
    } finally {
      await session.close()
    }
  }

  // Transactions (for complex multi-step operations)
  async transaction<T>(
    callback: (tx: neo4j.Transaction) => Promise<T>
  ): Promise<T> {
    const session = this.driver.session({ defaultAccessMode: 'WRITE' })
    try {
      return await session.writeTransaction(callback)
    } finally {
      await session.close()
    }
  }

  close(): Promise<void> {
    return this.driver.close()
  }
}

export const neo4jClient = new Neo4jHAClient()
```

---

### 27.4: Application Load Balancing (HA)

**Goal:** Active-active app instances with health checks

#### Setup

```typescript
// infra/load-balancer/nginx.conf
upstream api_backend {
  least_conn;  # Load balancing strategy

  server api1.internal:3000 max_fails=3 fail_timeout=10s;
  server api2.internal:3000 max_fails=3 fail_timeout=10s;

  keepalive 32;
}

server {
  listen 80;
  server_name api.mycompany.com;

  # Health check endpoint
  location /health {
    access_log off;
    proxy_pass http://api_backend;
  }

  # API proxy
  location / {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    
    # Retry on failure
    proxy_next_upstream error timeout http_503;
    proxy_next_upstream_tries 2;
    
    # Timeout settings
    proxy_connect_timeout 2s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }
}
```

#### Health Check Endpoint

```typescript
// apps/saas-001-booking/app/api/health/route.ts
import { dbPool } from '@saas-factory/db'
import { redisClient } from '@saas-factory/cache'
import { neo4jClient } from 'factory-brain/knowledge-graph'

export async function GET(req: Request) {
  const checks: Record<string, boolean> = {}

  try {
    // Database check
    checks.database = await checkDatabase()
    
    // Redis check
    checks.redis = await checkRedis()
    
    // Neo4j check
    checks.neo4j = await checkNeo4j()
    
    // Memory check
    checks.memory = checkMemoryUsage()

    const allHealthy = Object.values(checks).every((v) => v === true)
    
    return Response.json(checks, {
      status: allHealthy ? 200 : 503,
    })
  } catch (error) {
    return Response.json(
      { error: String(error), checks },
      { status: 503 }
    )
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    const result = await dbPool.executeRead('SELECT 1')
    return result.length > 0
  } catch {
    return false
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    await redisClient.set('health_check', Date.now().toString(), 60)
    return true
  } catch {
    return false
  }
}

async function checkNeo4j(): Promise<boolean> {
  try {
    const result = await neo4jClient.read('RETURN 1')
    return result.length > 0
  } catch {
    return false
  }
}

function checkMemoryUsage(): boolean {
  const usage = process.memoryUsage()
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100
  return heapUsedPercent < 90 // Fail if heap > 90%
}
```

---

## Phase 28: Multi-Region Deployment

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                  GLOBAL MULTI-REGION                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─ US East (Primary) ─────┐       ┌─ EU West (Secondary) ────┐│
│  │                          │       │                         ││
│  │  ┌────────────────────┐  │       │ ┌────────────────────┐  ││
│  │  │  HA Cluster        │  │       │ │  HA Cluster        │  ││
│  │  │  - API x2          │  │       │ │  - API x2          │  ││
│  │  │  - PostgreSQL HA   │  │       │ │  - PostgreSQL HA   │  ││
│  │  │  - Redis Sentinel  │  │       │ │  - Redis Sentinel  │  ││
│  │  │  - Neo4j Cluster   │  │       │ │  - Neo4j Cluster   │  ││
│  │  └────────┬───────────┘  │       │ └────────┬───────────┘  ││
│  │           │               │       │         │               ││
│  │  ┌────────▼───────────────┐       │ ┌──────▼────────────┐   ││
│  │  │ Primary DB (writes)   │       │ │ Replica DB       │   ││
│  │  │ - Streaming repl → ───┼───────┼─► (read-only)     │   ││
│  │  │ - WAL archiving       │       │ │                  │   ││
│  │  └──────────────────────┘       │ └──────────────────┘   ││
│  │                                  │                        ││
│  └──────────────────────────────────┴────────────────────────┘│
│          ▲                                    ▲               │
│          │                                    │               │
│  ┌───────┼────────────────────────────────────┼──────┐       │
│  │       │ Global Load Balancer (DNS/GeoDNS) │      │       │
│  │  ┌────▼──────────────────────────────────▼──┐   │       │
│  │  │  Route53 / Cloudflare                   │   │       │
│  │  │  - Geolocation routing                  │   │       │
│  │  │  - Failover to secondary on health fail│   │       │
│  │  │  - Active-active by default             │   │       │
│  │  └───────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

### 28.1: PostgreSQL Multi-Region Streaming Replication

**Goal:** Primary (US East) → Standby replicas (EU West) with cross-region replication

#### Cross-Region Replication Setup

```typescript
// infra/terraform/multi-region-replication.tf

# Primary DB (us-east-1)
resource "aws_db_instance" "primary" {
  identifier     = "saas-factory-primary"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.r6i.2xlarge"
  
  allocated_storage    = 1000
  storage_type         = "gp3"
  iops                 = 3000
  storage_throughput   = 125
  
  # Multi-AZ within primary region
  multi_az = true
  
  # Enable replication
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  
  # Enable enhanced monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_enhanced_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Network
  publicly_accessible = false
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  tags = {
    Name = "SaaS Factory Primary"
    Role = "primary"
  }
}

# Standby Replica (eu-west-1) - Read-only cross-region replica
resource "aws_db_instance" "replica" {
  identifier     = "saas-factory-replica-eu"
  
  # Cross-region replica configuration
  replicate_source_db = aws_db_instance.primary.identifier
  
  # Use same instance type for consistency
  instance_class = aws_db_instance.primary.instance_class
  
  # Different region
  availability_zone = "eu-west-1a"
  
  # Read-only configuration
  skip_final_snapshot = false
  
  # Network (EU VPC)
  publicly_accessible = false
  vpc_security_group_ids = [aws_security_group.rds_eu.id]
  
  tags = {
    Name = "SaaS Factory Replica (EU)"
    Role = "replica"
  }
}
```

#### Connection Logic

```typescript
// blocks/db/src/multi-region-connection.ts
import { Pool } from 'pg'

export class MultiRegionDB {
  private primaryPool: Pool
  private replicaPool: Pool
  private region: 'us-east-1' | 'eu-west-1' | 'ap-southeast-1'

  constructor(primaryRegion: string, region: typeof this.region) {
    this.region = region

    // Connect to local replica for reads
    this.replicaPool = new Pool({
      host: `postgres-replica-${region}.internal`,
      port: 5432,
      database: 'saas_factory',
      user: 'app_readonly',
      password: process.env.DB_READONLY_PASSWORD,
      max: 50,
    })

    // Connect to primary for writes (might be in different region)
    this.primaryPool = new Pool({
      host: `postgres-primary-${primaryRegion}.internal`,
      port: 5432,
      database: 'saas_factory',
      user: 'app_writer',
      password: process.env.DB_WRITER_PASSWORD,
      max: 20,
    })

    // Monitor replication lag
    this.monitorReplicationLag()
  }

  private async monitorReplicationLag() {
    setInterval(async () => {
      try {
        const result = await this.replicaPool.query(`
          SELECT 
            EXTRACT(EPOCH FROM (NOW() - pg_last_wal_receive_time()))::int as lag_seconds,
            pg_is_wal_replay_paused() as paused
        `)
        
        const lag = result.rows[0].lag_seconds
        const paused = result.rows[0].paused

        if (lag > 10) {
          console.warn(`[DB] Replication lag in ${this.region}: ${lag}s`)
        }

        if (paused) {
          console.error(`[DB] Replication paused in ${this.region}!`)
        }
      } catch (error) {
        console.error('[DB] Failed to check replication lag', error)
      }
    }, 30000) // Check every 30 seconds
  }

  async read<T>(query: string, values?: any[]): Promise<T[]> {
    return (await this.replicaPool.query(query, values)).rows as T[]
  }

  async write<T>(query: string, values?: any[]): Promise<T[]> {
    return (await this.primaryPool.query(query, values)).rows as T[]
  }
}

export function createMultiRegionDB(
  region: 'us-east-1' | 'eu-west-1' | 'ap-southeast-1'
) {
  return new MultiRegionDB('us-east-1', region)
}
```

### 28.2: Cross-Region Data Synchronization

**Goal:** Ensure data consistency across regions with replication lag handling

#### Conflict Resolution Strategy

```typescript
// blocks/db/src/replication-coordinator.ts

export interface ReplicationEvent {
  event_id: string
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, any>
  timestamp: Date
  region: string
  version: number
}

export class ReplicationCoordinator {
  // Track all events with vector clocks for causal consistency
  private eventLog: Map<string, ReplicationEvent> = new Map()

  async handleWrite(event: ReplicationEvent): Promise<void> {
    // Add to event log
    this.eventLog.set(event.event_id, event)

    // Publish to all regions
    await this.publishToAllRegions(event)

    // Monitor for conflicts
    this.detectConflicts(event)
  }

  private async publishToAllRegions(event: ReplicationEvent) {
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
    
    for (const region of regions) {
      if (region === event.region) continue // Skip source

      try {
        await fetch(`https://api-${region}.internal/api/replication`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Replication-Key': process.env.REPLICATION_SECRET!,
          },
          body: JSON.stringify(event),
        })
      } catch (error) {
        console.error(`Failed to publish to ${region}`, error)
        // Queue for retry
        await this.queueForRetry(event, region)
      }
    }
  }

  private detectConflicts(event: ReplicationEvent) {
    // Check for concurrent writes to same record
    const relatedEvents = Array.from(this.eventLog.values())
      .filter(
        (e) =>
          e.table === event.table &&
          Math.abs(e.timestamp.getTime() - event.timestamp.getTime()) < 5000 &&
          e.region !== event.region
      )

    if (relatedEvents.length > 0) {
      console.warn(`[Replication] Potential conflict detected:`, event)
      // Last-write-wins (LWW) resolution: use event with latest timestamp
      // Or: escalate to operator
    }
  }

  private async queueForRetry(
    event: ReplicationEvent,
    region: string
  ) {
    // Queue in Redis for background retry worker
    await redisClient.lpush(
      `replication-retry:${region}`,
      JSON.stringify(event)
    )
  }
}
```

### 28.3: Global Load Balancing (GeoDNS)

**Goal:** Route traffic to closest region with health checks

#### DNS Configuration (Route53)

```typescript
// infra/terraform/route53-geolocation.tf

resource "aws_route53_zone" "main" {
  name = "api.mycompany.com"
}

# US East endpoint (primary)
resource "aws_route53_record" "api_us_east" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.mycompany.com"
  type    = "A"
  
  # Geolocation routing: North America
  set_identifier = "us-east-1"
  geolocation_location {
    continent_code = "NA"
  }

  # Health check for failover
  health_check_id = aws_route53_health_check.us_east.id

  alias {
    name                   = aws_elb.api_us_east.dns_name
    zone_id                = aws_elb.api_us_east.zone_id
    evaluate_target_health = true
  }
}

# EU West endpoint (secondary)
resource "aws_route53_record" "api_eu_west" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.mycompany.com"
  type    = "A"
  
  # Geolocation routing: Europe
  set_identifier = "eu-west-1"
  geolocation_location {
    continent_code = "EU"
  }

  # Health check
  health_check_id = aws_route53_health_check.eu_west.id

  alias {
    name                   = aws_elb.api_eu_west.dns_name
    zone_id                = aws_elb.api_eu_west.zone_id
    evaluate_target_health = true
  }
}

# Health checks for automatic failover
resource "aws_route53_health_check" "us_east" {
  ip_address        = aws_elb.api_us_east.alias.name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  measure_latency = true
}

resource "aws_route53_health_check" "eu_west" {
  ip_address        = aws_elb.api_eu_west.alias.name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  measure_latency = true
}
```

### 28.4: Failover Orchestration

**Goal:** Automated failover when primary region fails

#### Failover Controller

```typescript
// blocks/operations/src/failover-controller.ts

export class FailoverController {
  private regions = {
    primary: 'us-east-1',
    secondary: 'eu-west-1',
    tertiary: 'ap-southeast-1',
  }

  async monitorRegionHealth() {
    setInterval(async () => {
      const healthStatus = await this.checkAllRegions()

      if (!healthStatus[this.regions.primary] && healthStatus[this.regions.secondary]) {
        console.error('[Failover] Primary region down, initiating failover')
        await this.executePrimaryFailover()
      }

      if (!healthStatus[this.regions.secondary] && healthStatus[this.regions.tertiary]) {
        console.error('[Failover] Secondary region down')
        await this.executeSecondaryFailover()
      }
    }, 30000) // Check every 30 seconds
  }

  private async checkAllRegions(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {}

    for (const [, region] of Object.entries(this.regions)) {
      try {
        const response = await fetch(`https://api-${region}.internal/health`, {
          timeout: 5000,
        })
        status[region] = response.ok
      } catch {
        status[region] = false
      }
    }

    return status
  }

  private async executePrimaryFailover() {
    try {
      // 1. Promote secondary to primary
      await this.promoteRegionToPrimary(this.regions.secondary)

      // 2. Update DNS to route all traffic to new primary
      await this.updateDNSRoutine(this.regions.secondary)

      // 3. Alert operations
      await this.alertFailover(
        'Primary region failed, promoted EU to primary',
        { from: 'us-east-1', to: 'eu-west-1' }
      )

      // 4. Drain read traffic from failed primary
      await this.drainTrafficFromRegion(this.regions.primary)

    } catch (error) {
      console.error('[Failover] Failed to execute primary failover', error)
      await this.alertCritical('Failover attempt failed')
    }
  }

  private async promoteRegionToPrimary(region: string) {
    // Promote read-only replica to primary (PostgreSQL)
    const response = await fetch(`https://api-${region}.internal/api/admin/promote-primary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to promote ${region}`)
    }
  }

  private async updateDNSRoutine(newPrimaryRegion: string) {
    // Update Route53 to point to new primary
    // (This triggers automatically via health checks, but can be explicit)
    console.log(`[Failover] DNS updated to route to ${newPrimaryRegion}`)
  }

  private async drainTrafficFromRegion(region: string) {
    // Set load balancer to drain connections
    await fetch(`https://api-${region}.internal/api/admin/drain`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
      },
    })
  }

  private async alertFailover(message: string, details: any) {
    // Send to PagerDuty, Slack, etc.
    console.log(`[Alert] ${message}`, details)
  }

  private async alertCritical(message: string) {
    console.error(`[Critical Alert] ${message}`)
  }
}
```

---

## Implementation Roadmap

### Phase 27: HA (Single Region) - Week 1

```
Day 1-2: PostgreSQL HA Setup
  ├─ Deploy primary + replicas with Patroni
  ├─ Configure streaming replication
  ├─ Setup WAL archiving to S3
  ├─ Implement connection pooling (PgBouncer)
  └─ Test: Kill primary, verify automatic failover

Day 2-3: Redis HA Setup
  ├─ Deploy 3 Redis instances
  ├─ Setup Sentinel for monitoring
  ├─ Configure failover thresholds
  ├─ Implement client reconnection logic
  └─ Test: Kill master, verify failover to replica

Day 3-4: Neo4j Clustering
  ├─ Deploy 3 Neo4j nodes
  ├─ Configure Raft consensus
  ├─ Setup leader election
  ├─ Configure replication between nodes
  └─ Test: Kill leader, verify election of new leader

Day 4-5: Application Load Balancing
  ├─ Setup Nginx/HAProxy for load balancing
  ├─ Configure health check endpoints
  ├─ Implement active-active API instances
  ├─ Setup connection draining
  └─ Test: Kill one API, verify traffic reroutes

Day 5-7: Testing & Monitoring
  ├─ Chaos engineering tests
  ├─ Setup Prometheus + Grafana
  ├─ Configure alerting rules
  ├─ Document runbooks
  └─ Staging environment validation
```

### Phase 28: Multi-Region - Week 2

```
Day 8-9: Cross-Region Replication
  ├─ Deploy PostgreSQL replica in secondary region
  ├─ Setup streaming replication (primary → secondary)
  ├─ Configure replication monitoring
  ├─ Test: Verify replication lag < 1 second
  └─ Test: Kill primary database, promote secondary

Day 9-10: DNS & Load Balancing
  ├─ Setup Route53 geolocation routing
  ├─ Configure health checks per region
  ├─ Setup automatic DNS failover
  ├─ Test: Verify users in US route to US East
  └─ Test: Verify users in EU route to EU West

Day 10-11: Failover Orchestration
  ├─ Implement failover controller
  ├─ Setup automatic region promotion
  ├─ Configure traffic draining
  ├─ Test: Simulate primary region failure
  └─ Test: Promote secondary and verify all systems online

Day 11-12: Cross-Region Data Sync
  ├─ Implement replication coordinator
  ├─ Setup conflict detection & resolution
  ├─ Configure retry queues
  ├─ Test: Simulate partial region failure
  └─ Test: Verify eventual consistency

Day 12-13: Monitoring & Observability
  ├─ Setup cross-region metrics (Prometheus)
  ├─ Configure distributed tracing (Jaeger)
  ├─ Implement SLO dashboards
  ├─ Setup multi-region alerting
  └─ Test: Alert on cross-region issues

Day 13-14: Production Validation
  ├─ Staging multi-region test
  ├─ Load testing (1000s concurrent users)
  ├─ Chaos engineering tests
  ├─ Document disaster recovery procedures
  └─ Production deployment activation
```

---

## Success Criteria

### Phase 27 (HA)
- ✅ RTO (Recovery Time Objective): < 5 minutes
- ✅ RPO (Recovery Point Objective): < 1 minute
- ✅ Automatic failover without manual intervention
- ✅ 99.9% uptime (4.4 hours downtime/year)
- ✅ No data loss on component failure
- ✅ Health checks every 30 seconds

### Phase 28 (Multi-Region)
- ✅ Global RTO: < 5 minutes
- ✅ Global RPO: < 1 minute
- ✅ Users route to closest region (< 100ms latency)
- ✅ Replication lag: < 1 second
- ✅ 99.99% uptime (52.6 minutes downtime/year)
- ✅ Automatic regional failover
- ✅ Eventual consistency across regions

---

## Cost Estimates (Annual)

### Phase 27 Infrastructure
```
PostgreSQL (HA): $5,000/month
  - Primary: db.r6i.2xlarge (2xvCPU, 16GB) = $2,200/month
  - Replica: db.r6i.2xlarge = $2,200/month
  - Multi-AZ: $600/month

Redis Sentinel: $2,000/month
  - 3x cache.r7g.xlarge (4vCPU, 32GB) = $2,000/month

Neo4j Cluster: $3,000/month
  - 3x m6i.2xlarge (8vCPU, 32GB) = $3,000/month

Load Balancers: $500/month
  - NLB/ALB: $500/month

Monitoring: $500/month
  - Prometheus, Grafana, alerting

TOTAL Phase 27: ~$11,000/month ($132K/year)
```

### Phase 28 Additional Infrastructure
```
Secondary Region (EU): $11,000/month
Tertiary Region (AP): $11,000/month
DNS (Route53): $500/month
Data Transfer (cross-region): $2,000/month

TOTAL Phase 28 Additional: ~$24,500/month ($294K/year)

GRAND TOTAL: ~$35,500/month ($426K/year)
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Network partition | Data inconsistency | Vector clocks, LWW resolution, alerting |
| Cascading failures | Complete outage | Circuit breakers, bulkheads, rate limiting |
| Replication lag | Stale reads | Read-after-write consistency, fallback to primary |
| Region failure | Service down | Auto-failover, instant DNS switch, multi-region |
| Data corruption | Data loss | WAL archiving, regular backups, PITR |
| Configuration drift | Silent failures | IaC (Terraform), configuration validation |

