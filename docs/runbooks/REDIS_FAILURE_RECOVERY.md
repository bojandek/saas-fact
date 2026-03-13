# Redis Failure Recovery Runbook

## Overview
Redis provides distributed caching for the SaaS Factory platform with Sentinel-based automatic failover. This runbook covers detection and recovery procedures for cache layer failures.

## Architecture
- **Redis Cluster**: 3-node cluster (primary + 2 replicas)
- **Replication**: Asynchronous with Sentinel monitoring
- **Failover**: Automatic via Sentinel (< 30 seconds)
- **Persistence**: RDB snapshots + AOF logs
- **RTO**: < 30 seconds
- **RPO**: < 5 minutes

## Severity Levels

### Level 1: Degraded Cache
- Cache hit ratio < 60% (normal: 85%+)
- Evictions > 1000/min
- Memory usage > 80%
- Response time increased

### Level 2: Partial Cache Loss
- One node down
- Reads available from replicas
- Performance degraded but acceptable

### Level 3: Complete Cache Outage
- All Redis nodes down
- Application requests hitting database
- Database connection pool overloaded

---

## Level 1 Response: Degraded Cache Performance

### Detection
```bash
# Monitor from Sentinel
redis-cli -p 26379 sentinel masters

# Check cache metrics
redis-cli INFO memory
redis-cli INFO stats
redis-cli INFO replication

# Monitoring from application
curl http://localhost:3000/health | jq '.redis'
```

### Immediate Actions (< 5 minutes)

1. **Identify Memory Pressure**
   ```bash
   redis-cli INFO memory | grep -E "used_memory|maxmemory"
   
   # Expected: used_memory < 80% of maxmemory
   ```

2. **Check Eviction Policy**
   ```bash
   redis-cli CONFIG GET "maxmemory-policy"
   
   # Current: "allkeys-lru" (evict least recently used)
   ```

3. **Clear Low-Value Cache** (if needed)
   ```bash
   # Clear old sessions (> 30 days)
   redis-cli EVAL "
     local keys = redis.call('KEYS', 'session:*')
     for _, key in ipairs(keys) do
       if redis.call('TTL', key) == -1 then
         redis.call('DEL', key)
       end
     end
   " 0
   ```

4. **Enable Cache Compression** (if available)
   - Compress values > 1KB
   - Reduces memory by ~40%
   - Trade-off: CPU increases slightly

5. **Scale to Larger Instance** (if load persistent)
   ```bash
   aws elasticache modify-replication-group \
     --replication-group-id saas-factory-redis \
     --cache-node-type cache.r7g.xlarge \
     --apply-immediately
   
   # Note: This causes brief downtime during node swap
   # Better to do during maintenance window
   ```

### Monitoring
```bash
# Watch key metrics
watch -n 1 'redis-cli INFO stats | grep "evicted_keys"'
```

---

## Level 2 Response: Single Node Failure

### Detection
```bash
# Check if Sentinel already handled failover
redis-cli -p 26379 sentinel masters | grep saas-factory

# Should show: "num-slaves: 2"
```

### Manual Recovery (if automatic failover didn't work)

1. **Identify Failed Node**
   ```bash
   redis-cli -h <replica-1> PING
   redis-cli -h <replica-2> PING
   redis-cli -h <primary> PING
   ```

2. **Force Sentinel Failover** (if needed)
   ```bash
   redis-cli -p 26379 sentinel failover saas-factory-redis
   
   # Watch progress
   watch -n 2 'redis-cli -p 26379 sentinel masters | grep -E "name|ip|port'
   ```

3. **Replace Failed Node**
   ```bash
   aws elasticache reboot-cache-cluster \
     --cache-cluster-id saas-factory-redis-001 \
     --cache-node-ids 1
   
   # Wait for "available" status
   aws elasticache describe-cache-clusters \
     --cache-cluster-id saas-factory-redis-001
   ```

4. **Verify Replication**
   ```bash
   # On new primary
   redis-cli role
   # Should show: "master"
   
   # On replicas
   redis-cli -h <replica> role
   # Should show: "slave" with replication lag < 1 second
   ```

### Validation

```bash
# Test cache operations
redis-cli SET test-key "recovery-test"
redis-cli GET test-key
redis-cli DEL test-key

# Check replication
redis-cli -p 26379 sentinel slaves saas-factory-redis
```

---

## Level 3 Response: Complete Cache Outage

### Critical: All Redis Nodes Down

**RTO**: 5-10 minutes if using prebuilt cluster
**RPO**: Latest snapshot (up to 5 minutes old)

#### Immediate Action: Bypass Cache

If cluster recovery > 10 minutes, bypass cache:

```typescript
// In application (temporary hotfix)
const useCache = false; // Disable cache layer

// All requests go directly to database
// Performance degrades but service available
```

#### Recovery Steps

1. **Create New Cluster from Snapshot**
   ```bash
   aws elasticache create-replication-group \
     --replication-group-description "Recovery cluster" \
     --engine redis \
     --cache-node-type cache.r7g.xlarge \
     --num-cache-clusters 3 \
     --automatic-failover-enabled \
     --snapshot-name saas-factory-redis-latest
   ```

   **Duration**: 5-10 minutes

2. **Update Connection Strings**
   ```bash
   # Update Secrets Manager
   aws secretsmanager update-secret \
     --secret-id prod/redis-endpoint \
     --secret-string '{"primary":"new-endpoint:6379"}'
   ```

3. **Restart Application Servers**
   ```bash
   kubectl rollout restart deployment/saas-001-booking -n production
   ```

4. **Monitor Cache Warm-Up**
   ```bash
   # Track cache hit ratio recovery
   watch -n 5 'redis-cli INFO stats | grep -E "hits|misses"'
   
   # Should reach 85%+ within 30 minutes
   ```

### Snapshot Recovery (if latest cluster corrupted)

```bash
# List available snapshots
aws elasticache describe-snapshots \
  --query 'Snapshots[*].[SnapshotName,SnapshotCreateTime]' \
  --output table

# Restore from specific snapshot
aws elasticache create-replication-group \
  --replication-group-description "Point-in-time recovery" \
  --engine redis \
  --cache-node-type cache.r7g.xlarge \
  --num-cache-clusters 3 \
  --snapshot-name saas-factory-redis-backup-2026-03-11
```

---

## Data Persistence & Backup

### Backup Strategy
- **RDB Snapshots**: Every 6 hours
- **AOF Logs**: Every second (if enabled)
- **Retention**: 30-day rolling window
- **Location**: S3 for long-term storage

### Manual Backup
```bash
redis-cli BGSAVE

# Check backup status
redis-cli LASTSAVE
```

### Backup Validation (Weekly)
```bash
# Test restore to staging cluster
aws elasticache create-replication-group \
  --replication-group-description "Backup test" \
  --engine redis \
  --snapshot-name saas-factory-redis-backup-$(date -d "7 days ago" +%Y-%m-%d)
```

---

## Connection Pool Recovery

### Stale Connections After Failover

If application connections stale:

```typescript
// In application code
const redis = createRedisClient({
  host: REDIS_ENDPOINT,
  maxRetriesPerRequest: 3,
  retryStrategy: (retries) => {
    if (retries > 10) return null;
    return Math.min(retries * 50, 500);
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect
    }
    return false;
  },
});
```

---

## Performance Monitoring

### Key Metrics to Track
```
redis_connected_clients
redis_used_memory
redis_evicted_keys
redis_total_commands_processed
redis_instantaneous_ops_per_sec
redis_instantaneous_input_kbps
redis_instantaneous_output_kbps
redis_latest_fork_usec (RDB fork time)
redis_pubsub_channels
```

### CloudWatch Alarms
| Metric | Threshold | Severity |
|--------|-----------|----------|
| CPU | > 75% | Warning |
| Memory | > 80% | Warning |
| Memory | > 95% | Critical |
| Evictions | > 1000/min | Critical |
| Replication Lag | > 5 sec | Warning |
| Connection Count | > 4000 | Warning |

---

## Cache Invalidation Strategy

### Partial Invalidation (if corruption suspected)
```bash
# Clear specific pattern
redis-cli EVAL "
  local keys = redis.call('KEYS', 'user:*')
  redis.call('DEL', unpack(keys))
" 0

# Verify cleared
redis-cli DBSIZE
```

### Full Cache Wipe (last resort)
```bash
redis-cli FLUSHALL ASYNC

# Warning: This drops ALL data immediately
# Use only if recovery necessary
```

After full wipe:
- Cache will rebuild from database
- First 5-10 minutes: high cache misses
- Database load will spike temporarily
- Application performance degraded briefly

---

## Escalation Path

| Severity | Time | Action |
|----------|------|--------|
| Level 1  | Now  | Monitor memory, clear old data |
| Level 2  | 2m   | Failover single node |
| Level 3  | 5m   | Bypass cache, start recovery cluster |
| Level 3  | 10m+ | Failover to recovered cluster |

---

## Related Documents
- [`redis-sentinel-client.ts`](blocks/cache/src/redis-sentinel-client.ts) - Client implementation
- [`intelligent-cache.ts`](blocks/cache/src/intelligent-cache.ts) - Caching strategy
- [`DATABASE_FAILURE_RECOVERY.md`](DATABASE_FAILURE_RECOVERY.md) - When cache fails, database load increases
- [`MULTI_REGION_FAILOVER.md`](MULTI_REGION_FAILOVER.md) - Cross-region caching

---

**Last Updated**: 2026-03-12
**Owner**: Platform Engineering Team
