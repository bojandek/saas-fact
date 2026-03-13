# ADR 002: Redis Sentinel-Based Caching Strategy

## Context

The application requires a distributed caching layer to:
1. Reduce database load by 60-70%
2. Serve frequently accessed data with < 5ms latency
3. Handle cache failures without total service degradation
4. Support cache warming and intelligent invalidation

## Options Considered

### Option 1: Redis Cluster (Chosen)
- Hash-slot based sharding across 6 nodes
- Automatic failover via Sentinel
- Partition-aware client routing

**Pros**:
- Linear scalability with shard count
- No single cache failure point
- Supports millions of keys

**Cons**:
- Complex key migration on rebalancing
- Network overhead for cross-slot operations

### Option 2: Single Redis Instance + Manual Replication
- Simple single primary
- Manual failover if primary fails
- No sharding complexity

**Rejected**: Single point of failure unacceptable, manual failover too slow

### Option 3: Memcached Cluster
- Pure caching (no persistence)
- Simpler architecture than Redis

**Rejected**: No Sentinel equivalent for automatic failover, no data persistence

## Decision

**We choose Option 1: Redis Cluster with Sentinel**

Rationale:
1. **Reliability**: Automatic failover via Sentinel
2. **Performance**: Cluster provides linear scaling
3. **Persistence**: RDB snapshots + AOF for recovery
4. **Proven**: Battle-tested in production at scale (Alibaba, Twitter use)

## Implementation

### Cache Architecture

```
Application Layer
    ↓
Redis Client (Sentinel-aware)
    ↓ (failover aware)
    ↓
Redis Cluster (6 nodes × 3 replicas each)
├── Master Shard 1 → Replica 1a, 1b
├── Master Shard 2 → Replica 2a, 2b
├── Master Shard 3 → Replica 3a, 3b
└── Sentinel monitors all + handles failover

Persistence:
RDB Snapshots (every 6h to S3)
AOF append-only-file (fsync every 1s)
```

### Configuration

**Redis Parameters**:
```
maxmemory = 16GB              # Total cache size
maxmemory-policy = allkeys-lru  # Evict LRU keys when full
timeout = 300                 # Connection timeout
tcp-keepalive = 60
notify-keyspace-events = Ex   # Enable expiration events
```

**Sentinel Parameters**:
```
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000
```

### Cache Patterns

#### Pattern 1: Cache-Aside (Read-Through)
```typescript
async function getUser(userId: string) {
  // Try cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // Cache miss - load from database
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}
```

**TTL**: 1 hour for user data
**Invalidation**: On user update, delete `user:{id}` from cache

#### Pattern 2: Write-Through
```typescript
async function updateUser(userId: string, data: UserData) {
  // Update database first
  const updated = await db.query(
    'UPDATE users SET ? WHERE id = ?',
    [data, userId]
  );

  // Update cache
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(updated));
  return updated;
}
```

#### Pattern 3: Cache Warming
```typescript
// On startup - pre-populate hot data
async function warmupCache() {
  const topUsers = await db.query('SELECT * FROM users ORDER BY last_login DESC LIMIT 1000');
  for (const user of topUsers) {
    await redis.setex(`user:${user.id}`, 86400, JSON.stringify(user));
  }
}
```

### Monitoring & Alerts

**Key Metrics**:
| Metric | Warning | Critical |
|--------|---------|----------|
| Hit Ratio | < 70% | < 50% |
| Memory Usage | > 80% | > 95% |
| Evictions/min | > 1000 | > 5000 |
| Command Latency | > 50ms p99 | > 100ms p99 |
| Replication Lag | > 5 sec | > 30 sec |

### Consistency Considerations

**Eventual Consistency Model**:
- Cache can be 1 hour stale (acceptable for most data)
- Critical data (payment status) always hits database
- User accepts stale profile data

**Invalidation**:
- Explicit: Delete cache key on write
- Implicit: TTL-based expiration (1h default)
- Reactive: Message queue for distributed invalidation

**Cache Coherence**:
- All nodes serve same data (cache is read-only from app perspective)
- Writes always go to database first, then cache
- No cache-to-cache sync needed

## Trade-offs

### Memory vs. Hit Ratio
- 32GB cache: 85% hit ratio
- 16GB cache: 75% hit ratio
- 8GB cache: 60% hit ratio

**Decision**: Start with 16GB, monitor hit ratio

### Complex Failover vs. Availability
- Sentinel handles failover automatically
- Manual intervention rarely needed
- Acceptable for SaaS (no 99.999% requirement)

### Persistence vs. Performance
- AOF every second = ~5ms overhead per write
- RDB snapshot every 6 hours = minimal impact
- Acceptable trade-off for recovery capability

## Future Scaling

### If Cache Hits Bottleneck (> 100K req/sec)
1. **Add more Redis nodes** (horizontal scale)
2. **Implement L1 local cache** (application-level)
3. **Consider write-through caching** if applicable

## Testing

### Load Test Scenarios
- [ ] 50K req/sec with 85% hit ratio
- [ ] Failover causes < 100ms latency spike
- [ ] Eviction doesn't impact p99 latency
- [ ] Replication lag stays < 5 seconds

### Chaos Scenarios
- [ ] Single node failure → automatic failover
- [ ] Network partition → Sentinel election
- [ ] Cache full → graceful eviction

## Related

- [`redis-sentinel-client.ts`](blocks/cache/src/redis-sentinel-client.ts) - Client implementation
- [`intelligent-cache.ts`](blocks/cache/src/intelligent-cache.ts) - Cache layer
- [`REDIS_FAILURE_RECOVERY.md`](../runbooks/REDIS_FAILURE_RECOVERY.md) - Recovery procedures

---

**Decision Date**: 2026-03-12
**Status**: ACCEPTED
**Owner**: Infrastructure Team
**Review Date**: 2026-06-12
