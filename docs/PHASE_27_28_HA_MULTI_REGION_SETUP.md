# Phase 27-28: HA + Multi-Region Setup Guide

Complete guide for deploying High Availability and Multi-Region infrastructure for SaaS Factory.

## Prerequisites

- AWS/Hetzner account with infrastructure access
- Docker & Docker Compose
- PostgreSQL 15+, Redis 7+, Neo4j 4.4+
- Terraform/Pulumi for IaC
- kubectl (for Kubernetes deployments)

---

## Phase 27: High Availability Setup

### Step 1: Initialize Environment Variables

Create `.env.ha` in project root:

```bash
# PostgreSQL HA
DB_HA_PRIMARY_HOST=postgres-primary.internal
DB_HA_REPLICA_HOSTS=postgres-replica-1.internal,postgres-replica-2.internal
DB_HA_USER=app_user
DB_HA_PASSWORD=<strong-password>
DB_HA_DATABASE=saas_factory
DB_HA_PORT=5432
DB_HA_MAX_PRIMARY_CONN=50
DB_HA_MAX_REPLICA_CONN=100

# Redis Sentinel
REDIS_SENTINEL_HOSTS=sentinel-1.internal:26379,sentinel-2.internal:26379,sentinel-3.internal:26379
REDIS_SENTINEL_MASTER_NAME=mymaster
REDIS_SENTINEL_PASSWORD=<redis-password>

# Neo4j HA Cluster
NEO4J_URI=neo4j+s://neo4j-cluster.internal:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<neo4j-password>
NEO4J_POOL_SIZE=100

# Health Check
HEALTH_CHECK_INTERVAL=30000  # 30 seconds
HEALTH_CHECK_TIMEOUT=5000    # 5 seconds

# Monitoring
PROMETHEUS_ENDPOINT=http://prometheus.internal:9090
GRAFANA_ENDPOINT=http://grafana.internal:3000

# Admin API
ADMIN_API_KEY=<generate-secure-key>
```

### Step 2: Deploy PostgreSQL HA with Patroni

```bash
# Using Docker Compose
version: '3.8'
services:
  postgres-primary:
    image: patroni:latest
    environment:
      PATRONI_YAML_ONLY: "true"
      PATRONI_CONFIGURATION_YML: |
        global:
          name: saas_factory
          namespace: /patroni
          ttl: 30
          loop_wait: 10
          maximum_lag_on_failover: 1048576
          postgresql:
            data_dir: /var/lib/postgresql/data
            parameters:
              max_wal_senders: 10
              max_replication_slots: 10
              wal_keep_size: 10GB
              archive_mode: "on"
              archive_command: "aws s3 cp %p s3://backups/wal/%f"
              synchronous_commit: remote_apply
        postgresql:
          use_pg_rewind: true
          pg_hba:
            - host  all  all  0.0.0.0/0  md5
        etcd:
          hosts:
            - 127.0.0.1:2379
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    depends_on:
      - etcd

  postgres-replica-1:
    image: patroni:latest
    environment:
      PATRONI_YAML_ONLY: "true"
      PATRONI_CONFIGURATION_YML: |
        # Same as primary, will join cluster
    depends_on:
      - postgres-primary

  etcd:
    image: quay.io/coreos/etcd:latest
    environment:
      ETCD_NAME: etcd0
      ETCD_INITIAL_ADVERTISE_PEER_URLS: "http://127.0.0.1:2380"
      ETCD_LISTEN_PEER_URLS: "http://0.0.0.0:2380"
      ETCD_LISTEN_CLIENT_URLS: "http://0.0.0.0:2379"
      ETCD_ADVERTISE_CLIENT_URLS: "http://127.0.0.1:2379"
    ports:
      - "2379:2379"
      - "2380:2380"
```

### Step 3: Initialize HA Connection Pool

```typescript
// apps/saas-001-booking/app/initialize-ha.ts
import { initializeHAPool } from '@saas-factory/db'
import { initializeSentinelClient } from '@saas-factory/cache'
import { initializeNeo4jClient } from 'factory-brain/knowledge-graph/neo4j-ha-client'

export async function initializeHAInfrastructure() {
  // Initialize PostgreSQL HA Pool
  const dbPool = initializeHAPool({
    primaryHost: process.env.DB_HA_PRIMARY_HOST!,
    replicaHosts: process.env.DB_HA_REPLICA_HOSTS?.split(','),
    database: process.env.DB_HA_DATABASE!,
    user: process.env.DB_HA_USER!,
    password: process.env.DB_HA_PASSWORD!,
    maxPrimaryConnections: parseInt(process.env.DB_HA_MAX_PRIMARY_CONN || '50'),
    maxReplicaConnections: parseInt(process.env.DB_HA_MAX_REPLICA_CONN || '100'),
  })

  // Listen for failover events
  dbPool.onFailover((event) => {
    console.log(`[HA Init] DB Failover event:`, event)
    // Send to monitoring system
  })

  // Initialize Redis Sentinel
  const redisClient = initializeSentinelClient({
    sentinels: parseSentinelHosts(process.env.REDIS_SENTINEL_HOSTS!),
    masterName: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
  })

  redisClient.onMonitor((event) => {
    console.log(`[HA Init] Redis Sentinel event:`, event)
  })

  // Initialize Neo4j HA
  const neo4jClient = initializeNeo4jClient({
    uri: process.env.NEO4J_URI!,
    username: process.env.NEO4J_USER!,
    password: process.env.NEO4J_PASSWORD!,
    maxConnectionPoolSize: parseInt(process.env.NEO4J_POOL_SIZE || '100'),
  })

  // Verify all systems are healthy
  const dbHealth = await dbPool.checkPrimaryHealth()
  const redisHealth = redisClient.isConnected()
  const neo4jHealth = await neo4jClient.verifyConnectivity()

  if (!dbHealth || !redisHealth || !neo4jHealth) {
    console.error('[HA Init] Not all systems are healthy at startup')
    throw new Error('HA infrastructure health check failed')
  }

  console.log('[HA Init] ✅ All HA systems initialized and healthy')

  return {
    db: dbPool,
    redis: redisClient,
    neo4j: neo4jClient,
  }
}

function parseSentinelHosts(
  hostsStr: string
): Array<{ host: string; port: number }> {
  return hostsStr.split(',').map((hostPair) => {
    const [host, port] = hostPair.trim().split(':')
    return { host, port: parseInt(port) }
  })
}
```

### Step 4: Add to Application Startup

```typescript
// apps/saas-001-booking/app/layout.tsx
import { initializeHAInfrastructure } from './initialize-ha'

let haInitialized = false

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize HA infrastructure on first startup
  if (!haInitialized && process.env.NODE_ENV === 'production') {
    try {
      await initializeHAInfrastructure()
      haInitialized = true
    } catch (error) {
      console.error('Failed to initialize HA infrastructure:', error)
      // Don't block startup, but log the error
    }
  }

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Step 5: Setup Health Check Monitoring

The `/api/health` endpoint is automatically called by load balancers every 30 seconds.

Configure in Nginx/HAProxy:

```nginx
upstream api_backend {
  least_conn;
  
  server api1.internal:3000 max_fails=3 fail_timeout=10s;
  server api2.internal:3000 max_fails=3 fail_timeout=10s;
  
  keepalive 32;
}

server {
  listen 80;
  
  location /health {
    access_log off;
    proxy_pass http://api_backend;
    proxy_read_timeout 5s;
    proxy_connect_timeout 2s;
  }
  
  location / {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_next_upstream error timeout http_503;
    proxy_next_upstream_tries 2;
  }
}
```

---

## Phase 28: Multi-Region Setup

### Step 1: Initialize Failover Controller

Create `apps/saas-001-booking/app/initialize-failover.ts`:

```typescript
import {
  initializeFailoverController,
  type Region,
} from 'blocks/operations/src/failover-controller'

export async function initializeMultiRegionFailover() {
  const regions: Region[] = [
    {
      name: 'us-east-1',
      endpoint: process.env.REGION_US_EAST_ENDPOINT || 'https://api-us-east.internal',
      role: 'primary',
      healthCheckUrl: `${process.env.REGION_US_EAST_ENDPOINT}/api/health`,
    },
    {
      name: 'eu-west-1',
      endpoint: process.env.REGION_EU_WEST_ENDPOINT || 'https://api-eu-west.internal',
      role: 'secondary',
      healthCheckUrl: `${process.env.REGION_EU_WEST_ENDPOINT}/api/health`,
    },
    {
      name: 'ap-southeast-1',
      endpoint: process.env.REGION_AP_SOUTHEAST_ENDPOINT || 'https://api-ap-southeast.internal',
      role: 'tertiary',
      healthCheckUrl: `${process.env.REGION_AP_SOUTHEAST_ENDPOINT}/api/health`,
    },
  ]

  const failoverController = initializeFailoverController(regions)

  // Listen for failover events
  failoverController.onFailover((event) => {
    console.log(`[Failover] Event: ${event.type}`, event.details)
    // Send to PagerDuty, Slack, etc.
  })

  // Start monitoring
  failoverController.startMonitoring()

  console.log('[Failover] ✅ Multi-region failover monitoring started')

  return failoverController
}
```

### Step 2: Initialize Replication Coordinator

Create `apps/saas-001-booking/app/initialize-replication.ts`:

```typescript
import { initializeReplicationCoordinator } from '@saas-factory/db'

export async function initializeMultiRegionReplication() {
  const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']

  const coordinator = initializeReplicationCoordinator(regions)

  // Periodic stats logging
  setInterval(() => {
    const stats = coordinator.getStats()
    console.log('[Replication] Stats:', {
      totalEvents: stats.totalEvents,
      totalRetries: stats.totalRetries,
      retryQueues: stats.retryQueueSizes,
    })
  }, 300000) // Every 5 minutes

  console.log('[Replication] ✅ Multi-region replication coordinator initialized')

  return coordinator
}
```

### Step 3: Environment Variables for Multi-Region

Add to `.env.multi-region`:

```bash
# Multi-Region Endpoints
REGION_US_EAST_ENDPOINT=https://api-us-east.internal
REGION_EU_WEST_ENDPOINT=https://api-eu-west.internal
REGION_AP_SOUTHEAST_ENDPOINT=https://api-ap-southeast.internal

# Route53 Configuration (if using AWS)
ROUTE53_ZONE_ID=Z1234567890ABC
ROUTE53_RECORD_NAME=api.mycompany.com

# Replication
REPLICATION_SECRET=<generate-secure-key>

# Admin endpoints for failover
ADMIN_API_KEY=<generate-secure-key>
```

### Step 4: Setup Route53 Geolocation Routing

```terraform
# infra/terraform/multi-region.tf

resource "aws_route53_zone" "main" {
  name = "api.mycompany.com"
}

# US East (Primary)
resource "aws_route53_record" "api_us_east" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.mycompany.com"
  type    = "A"
  
  set_identifier = "us-east-1"
  geolocation_location {
    continent_code = "NA"
  }

  health_check_id = aws_route53_health_check.us_east.id

  alias {
    name                   = aws_elb.api_us_east.dns_name
    zone_id                = aws_elb.api_us_east.zone_id
    evaluate_target_health = true
  }
}

# EU West (Secondary)
resource "aws_route53_record" "api_eu_west" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.mycompany.com"
  type    = "A"
  
  set_identifier = "eu-west-1"
  geolocation_location {
    continent_code = "EU"
  }

  health_check_id = aws_route53_health_check.eu_west.id

  alias {
    name                   = aws_elb.api_eu_west.dns_name
    zone_id                = aws_elb.api_eu_west.zone_id
    evaluate_target_health = true
  }
}

# Health checks
resource "aws_route53_health_check" "us_east" {
  ip_address        = aws_elb.api_us_east.name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true
}

resource "aws_route53_health_check" "eu_west" {
  ip_address        = aws_elb.api_eu_west.name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true
}
```

---

## Monitoring & Observability

### Prometheus Configuration

Create `infra/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  
scrape_configs:
  - job_name: 'saas-factory'
    static_configs:
      - targets: ['localhost:3000']
        labels:
          region: 'us-east-1'
      - targets: ['api-eu-west.internal:3000']
        labels:
          region: 'eu-west-1'
      - targets: ['api-ap-southeast.internal:3000']
        labels:
          region: 'ap-southeast-1'
        
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter.internal:9187']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter.internal:9121']
      
  - job_name: 'neo4j'
    static_configs:
      - targets: ['neo4j-exporter.internal:9100']
```

### Key Metrics to Monitor

```
# Database HA
pg_replication_lag_seconds
pg_wal_write_time_seconds
pg_connection_count

# Redis Sentinel
redis_connected_clients
redis_used_memory_percent
redis_commands_processed_total

# Neo4j
neo4j_db_transaction_active
neo4j_database_page_cache_hit_ratio
neo4j_bolt_connections_active

# Failover
failover_events_total
region_health_status
replication_lag_seconds
```

---

## Testing & Validation

### Test Primary Region Failure

```bash
# 1. Simulate primary DB failure
docker stop postgres-primary

# 2. Monitor failover
curl http://localhost:3000/api/health
# Should show: "primary_failed", attempting failover

# 3. Verify secondary promotion
curl https://api-eu-west.internal/api/health
# Should show: "healthy", role="primary"

# 4. Verify DNS update
nslookup api.mycompany.com
# Should resolve to EU endpoint

# 5. Restore primary
docker start postgres-primary

# 6. Verify replication catchup
```

### Test Secondary Region Failure

```bash
# Similar to above, but stop secondary
docker stop postgres-replica-1

# Should trigger secondary → tertiary failover
```

### Load Testing

```bash
# Using Apache Bench across all regions
ab -n 10000 -c 100 https://api.mycompany.com/api/health

# Monitor:
# - Request latency per region
# - Failover times
# - Connection recovery
```

---

## Deployment Checklist

- [ ] PostgreSQL HA deployed and tested
- [ ] Redis Sentinel cluster running
- [ ] Neo4j HA cluster initialized
- [ ] Health check endpoint verified
- [ ] Load balancer configured
- [ ] Route53 geolocation routing setup
- [ ] Failover controller monitoring
- [ ] Replication coordinator running
- [ ] Prometheus metrics collection
- [ ] Grafana dashboards created
- [ ] Runbooks documented
- [ ] Incident response procedures
- [ ] Production staging test complete
- [ ] Load testing pass

---

## Runbooks

### Incident: Primary Database Fails

1. **Alert triggered** → Primary health check fails
2. **Failover initiated** → Secondary promoted to primary (< 5 min RTO)
3. **DNS updated** → Route53 health check updates DNS
4. **Traffic rerouted** → All new connections to secondary
5. **Verify** → Run `curl /api/health` on all endpoints
6. **Post-incident** → Investigate primary failure, restore, test failover

### Incident: All Regions Down

1. **Critical alert** sent to on-call team
2. **Manual intervention required** → No automatic recovery
3. **Incident commander** initiates communication
4. **Investigation** → Check infrastructure logs, cloud console
5. **Recovery** → Restore primary region
6. **Validation** → Full health check suite
7. **Post-mortem** → Document root cause

---

## Support & Documentation

- Architecture: [`plans/PHASE_27_28_HA_MULTI_REGION_ARCHITECTURE.md`](../plans/PHASE_27_28_HA_MULTI_REGION_ARCHITECTURE.md)
- API Reference: `pnpm docs`
- Infrastructure as Code: `infra/terraform/`
- Monitoring: `infra/prometheus/`
- Configuration: `.env.ha` and `.env.multi-region`
