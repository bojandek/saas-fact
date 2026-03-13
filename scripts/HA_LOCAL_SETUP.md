# High Availability Local Setup Guide

This guide walks you through setting up a complete HA infrastructure locally for testing PHASE 27-28 components.

## Prerequisites

- Docker and Docker Compose installed (Docker Desktop recommended)
- Minimum 8GB RAM available
- At least 20GB disk space
- Node.js 18+ (for running tests)

## Quick Start

### 1. Copy environment configuration

```bash
cp .env.ha.example .env.ha
```

Optionally customize settings in `.env.ha` for your environment.

### 2. Start HA infrastructure

```bash
# Start all services
docker-compose -f docker-compose.ha.yml up -d

# Monitor startup progress
docker-compose -f docker-compose.ha.yml logs -f

# Wait until all services report healthy status (5-10 minutes)
docker-compose -f docker-compose.ha.yml ps
```

Expected output:
```
NAME                     STATUS              PORTS
postgres-primary-ha      Up (healthy)        0.0.0.0:5432->5432/tcp
postgres-replica-1-ha    Up (healthy)        0.0.0.0:5433->5432/tcp
postgres-replica-2-ha    Up (healthy)        0.0.0.0:5434->5432/tcp
redis-master-ha          Up (healthy)        0.0.0.0:6379->6379/tcp
redis-replica-1-ha       Up (healthy)        0.0.0.0:6380->6379/tcp
redis-replica-2-ha       Up (healthy)        0.0.0.0:6381->6379/tcp
redis-sentinel-1-ha      Up (healthy)        0.0.0.0:26379->26379/tcp
redis-sentinel-2-ha      Up (healthy)        0.0.0.0:26380->26379/tcp
redis-sentinel-3-ha      Up (healthy)        0.0.0.0:26381->26379/tcp
neo4j-core-1-ha          Up (healthy)        0.0.0.0:7687->7687/tcp
neo4j-core-2-ha          Up (healthy)        0.0.0.0:7688->7687/tcp
neo4j-core-3-ha          Up (healthy)        0.0.0.0:7689->7687/tcp
consul-ha                Up (healthy)        0.0.0.0:8500->8500/tcp
```

### 3. Verify services are running

#### PostgreSQL Primary/Replicas

```bash
# Connect to primary
psql -h localhost -U postgres -d saas_factory
# Password: postgres

# Check replication status
SELECT * FROM pg_stat_replication;

# Should show 2 streaming replicas
```

#### Redis Master/Replicas

```bash
# Check Redis master
redis-cli -h localhost -p 6379 ping
# Output: PONG

# Check replicas
redis-cli -h localhost -p 6380 ping
redis-cli -h localhost -p 6381 ping

# Check Sentinel
redis-cli -h localhost -p 26379 sentinel masters
# Should show mymaster configuration
```

#### Neo4j Cluster

```bash
# Neo4j Browser: http://localhost:7474
# Username: neo4j
# Password: password

# Or query cluster status:
curl -u neo4j:password \
  http://localhost:7474/db/neo4j/exec \
  -X POST \
  -d '{"query":"CALL dbms.cluster.overview()"}'

# Should show 3 core nodes in LEADER, FOLLOWER, FOLLOWER roles
```

## Testing HA Failover Scenarios

### Scenario 1: PostgreSQL Primary Failure

```bash
# Get primary container ID
CONTAINER_ID=$(docker-compose -f docker-compose.ha.yml ps -q postgres-primary-ha)

# Simulate primary crash
docker-compose -f docker-compose.ha.yml pause postgres-primary-ha

# Observe health check endpoint failing:
curl http://localhost:3000/api/health

# Check replica promotion (takes ~30 seconds)
# Replicas should detect primary is down and promote one to new primary

# Resume primary
docker-compose -f docker-compose.ha.yml unpause postgres-primary-ha

# Wait for re-synchronization
sleep 60

# Verify replication resumed
psql -h localhost -U postgres -d saas_factory -c "SELECT * FROM pg_stat_replication;"
```

### Scenario 2: Redis Master Failure

```bash
# Check current master
redis-cli -h localhost -p 26379 sentinel masters

# Stop Redis master
docker-compose -f docker-compose.ha.yml stop redis-master

# Sentinel detects failure within 30 seconds and promotes one replica
# Check new master:
redis-cli -h localhost -p 26379 sentinel masters

# Verify which replica became master
redis-cli -h localhost -p 6380 info replication  # Replica 1 - might now be master
redis-cli -h localhost -p 6381 info replication  # Replica 2 - might now be master

# Restart original master
docker-compose -f docker-compose.ha.yml start redis-master

# Sentinel automatically configures it as replica
redis-cli -h localhost -p 6379 info replication
# Should show: role:slave, master_host:...
```

### Scenario 3: Neo4j Node Failure

```bash
# Check cluster status
curl -u neo4j:password http://localhost:7474/db/neo4j/exec \
  -X POST -d '{"query":"CALL dbms.cluster.overview()"}'

# Stop one core node
docker-compose -f docker-compose.ha.yml stop neo4j-core-2-ha

# Cluster continues running with 2 nodes (quorum maintained)
# Check remaining nodes still communicate:
curl -u neo4j:password http://localhost:7487/db/neo4j/exec \
  -X POST -d '{"query":"CALL dbms.cluster.overview()"}'

# Restart node
docker-compose -f docker-compose.ha.yml start neo4j-core-2-ha

# Node rejoins cluster and resynchronizes
```

### Scenario 4: Network Partition

```bash
# Simulate region A/B split
docker network disconnect ha-net postgres-replica-1-ha
docker network disconnect ha-net redis-replica-1-ha

# Observe:
# - PostgreSQL: Replicas detect sync failure, primary continues accepting writes
# - Redis: Sentinel promotes replica-2 to master
# - Neo4j: Cluster continues with remaining nodes

# Reconnect partition
docker network connect ha-net postgres-replica-1-ha
docker network connect ha-net redis-replica-1-ha

# Services resynchronize automatically
```

## Monitoring

### Consul UI (Patroni VIP management)
```
http://localhost:8500/ui/dc1/services
```

### PostgreSQL Replication Status
```bash
psql -h localhost -U postgres -d saas_factory
saas_factory=# SELECT 
  client_addr, 
  state, 
  sync_state, 
  write_lag,
  replay_lag 
FROM pg_stat_replication;
```

### Redis Sentinel Status
```bash
redis-cli -h localhost -p 26379 sentinel masters
redis-cli -h localhost -p 26379 sentinel slaves mymaster
redis-cli -h localhost -p 26379 sentinel sentinels mymaster
```

### Neo4j Cluster Status
```
http://localhost:7474/browser/ -> CALL dbms.cluster.overview()
```

## Running Application with HA

### Set environment variables
```bash
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_SENTINEL_HOSTS=localhost:26379,localhost:26380,localhost:26381
export REDIS_MASTER_NAME=mymaster
export NEO4J_URI=neo4j+s://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=password
```

### Start application
```bash
pnpm dev
```

### Test HA endpoints

```bash
# Get health status
curl http://localhost:3000/api/health

# Admin API: Promote region (requires HA_ADMIN_KEY)
curl -X POST http://localhost:3000/api/admin/promote-primary/us-east-1 \
  -H "X-Admin-Key: ${HA_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual-failover"}'

# Admin API: Drain region
curl -X POST http://localhost:3000/api/admin/drain/us-east-1 \
  -H "X-Admin-Key: ${HA_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"gracePeriodSeconds": 30}'

# Admin API: Setup replication
curl -X POST http://localhost:3000/api/admin/setup-replication \
  -H "X-Admin-Key: ${HA_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"sourceRegion": "us-east-1", "targetRegion": "eu-west-1"}'
```

## Running Unit Tests

```bash
# Run all HA module tests
pnpm test --filter=@saas-factory/db
pnpm test --filter=@saas-factory/cache
pnpm test --filter=@saas-factory/operations

# Run specific test file
pnpm test blocks/db/src/ha-connection-pool.test.ts
pnpm test blocks/cache/src/redis-sentinel-client.test.ts
pnpm test blocks/operations/src/failover-controller.test.ts
```

## Cleanup

```bash
# Stop all services
docker-compose -f docker-compose.ha.yml down

# Remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.ha.yml down -v

# Remove Docker images
docker image rm postgres:15-alpine redis:7-alpine neo4j:5.0-enterprise consul:latest
```

## Troubleshooting

### Services take too long to start
- Ensure you have 8GB+ RAM available
- Check Docker daemon has sufficient resources allocated
- Monitor logs: `docker-compose -f docker-compose.ha.yml logs -f`

### PostgreSQL replicas can't connect
- Check network: `docker network inspect ha-net`
- Verify passwords match in environment variables
- Check logs: `docker logs postgres-primary-ha`

### Redis Sentinel keeps restarting
- Check Sentinel can reach master: `docker logs redis-sentinel-1-ha`
- Verify network connectivity: `docker network inspect ha-net`
- Sentinel configs may need adjustment in `config/sentinel-*.conf`

### Neo4j cluster won't form
- Check all 3 nodes are healthy: `docker-compose -f docker-compose.ha.yml ps`
- Review logs: `docker logs neo4j-core-1-ha`
- Verify Raft consensus parameters in docker-compose.yml
- Remove volumes and restart: `docker-compose -f docker-compose.ha.yml down -v && docker-compose -f docker-compose.ha.yml up`

### Health check endpoint fails
- Verify all services are healthy: `docker-compose -f docker-compose.ha.yml ps`
- Check application can reach databases on expected hosts/ports
- Review logs: `docker logs saas-001-booking` (if running with app)

## Performance Tuning

### For high load testing:
- Increase PostgreSQL connection pool sizes in `.env.ha`
- Increase Redis memory limits in `config/redis-*.conf`
- Increase Neo4j connection pool size in `.env.ha`
- Reduce health check intervals for faster failure detection

### For stability:
- Increase replication sync timeout
- Increase failover timeout values
- Use slower health check intervals (60s instead of 30s)

## Next Steps

1. Run integration tests: `pnpm test`
2. Deploy to staging with multi-region setup
3. Run chaos engineering tests to validate failover
4. Load test with 1000s of concurrent users
5. Deploy to production infrastructure with Kubernetes operators
