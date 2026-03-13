# ADR 001: PostgreSQL Multi-Region Streaming Replication Strategy

## Context

The SaaS Factory platform requires a disaster recovery solution that can:
1. **Survive regional outages** with < 2 minute RTO
2. **Minimize data loss** with < 30 second RPO
3. **Support global scaling** with latency optimization for regional users
4. **Enable zero-downtime deployments**

## Options Considered

### Option 1: Single Primary + Remote Standby (Chosen)
- **Active Region**: us-east-1 (primary writes)
- **Standby Region**: eu-west-1 (read-only replica)
- **Secondary Standby**: ap-southeast-1 (read-only replica)
- **Replication**: Streaming replication via WAL logs

**Pros**:
- Simplest consistency model (single leader)
- No split-brain risk
- Proven PostgreSQL feature (stable since 9.0)
- WAL archiving enables point-in-time recovery

**Cons**:
- High latency for EU/APAC writes (100-200ms)
- Cannot serve local failover in standby regions
- Standby regions can't take writes if primary fails

### Option 2: Multi-Master with Conflict Resolution
- All regions accept writes
- Conflict resolution via vector clocks (like Riak)

**Rejected**: Too complex, eventual consistency model risky for financial/booking data

### Option 3: Synchronous Replication (All Writes Blocked Until Replicated)
- Ensures zero RPO
- Replicas always consistent

**Rejected**: Unacceptable write latency (200-300ms added per write)

## Decision

**We choose Option 1: Streaming Replication + Single Primary**

Rationale:
1. **Consistency**: Single source of truth prevents conflicts
2. **Performance**: Async replication allows fast writes in primary region
3. **Compatibility**: Native PostgreSQL feature, well-tested
4. **Cost-Effective**: Standby instances relatively cheap
5. **Recovery**: WAL archiving to S3 enables PITR (Point-In-Time Recovery)

## Implementation Details

### Replication Architecture

```
Primary (us-east-1a)
    ↓ Streaming WAL logs
    ↓ (50MB/min typical load)
    ↓
Standby (eu-west-1a)  
    ↓ Streaming WAL logs
    ↓
Standby (ap-southeast-1a)

All WAL logs also archived to:
    S3 (s3://saas-factory-wal-archive/)
    Retention: 30 days
```

### Configuration

**Primary Parameters**:
```postgresql
max_wal_senders = 10          -- Support 10 concurrent replicas
wal_level = replica           -- Log all changes for replication
wal_keep_size = 1GB          -- Keep 1GB of local WAL files
archive_mode = on
archive_command = 'aws s3 cp %p s3://saas-factory-wal-archive/%f'
```

**Replica Parameters**:
```postgresql
hot_standby = on             -- Accept read queries
hot_standby_feedback = on    -- Prevent VACUUM conflicts
```

### Failover Procedure

**If Primary Fails**:
1. Promote eu-west-1 standby to new primary (15-30 sec)
2. Update Route53 DNS to new primary
3. Resume replication from eu-west-1 to ap-southeast-1
4. Restore original primary in us-east-1
5. Rejoin as standby

**Expected Downtime**: 1-2 minutes
**Data Loss**: < 5 seconds (unacked transactions lost)

### Monitoring

**Replication Lag**:
```sql
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;
```

**Alert**:
- Warning: > 5 seconds lag
- Critical: > 30 seconds lag

**Archiver Status**:
```sql
SELECT * FROM pg_stat_archiver;
```

**Alert**: If `failed_count` > 0, investigate S3 IAM permissions

## Trade-offs

### Write Latency
- Primary region writes: ~5ms
- EU reads get data 100-200ms behind
- APAC reads get data 150-250ms behind

**Mitigation**: Cache layer absorbs stale reads

### Data Loss on Primary Failure
- Up to 5 seconds of unacked writes lost
- Acceptable for SaaS applications (< 0.01% transactions)

**Mitigation**: Batch critical writes with explicit FLUSH/SYNC

### Standby Compute Cost
- 3 additional database instances required
- ~$2,000/month additional infrastructure
- Justified by RTO/RPO requirements

## Alternatives Considered Later

### Sharding (Multi-Region Write Shards)
- Each region owns a shard of data
- No global transactions possible
- High complexity for joins across shards

**Status**: Evaluate if global queries become bottleneck (unlikely for 10+ years)

### Logical Replication (Pub/Sub)
- Publish changes as logical events
- Selective replication of tables
- Allows filtered replication

**Status**: Use for specific tables if needed (e.g., analytics only)

## Validation

### Test Scenarios (Quarterly)
1. [ ] Replication lag under 1000 TPS load
2. [ ] Failover RTO < 2 minutes
3. [ ] Point-in-time recovery from S3 WAL archive
4. [ ] No data loss in production failover

### Monitoring Checklist
- [ ] Daily: Replication lag < 5 seconds
- [ ] Daily: WAL archiving succeeds
- [ ] Weekly: Test restore from backup
- [ ] Monthly: Failover drill

## Related

- [`ha-connection-pool.ts`](blocks/db/src/ha-connection-pool.ts) - Implements connection pooling
- [`replication-coordinator.ts`](blocks/db/src/replication-coordinator.ts) - Handles cross-region coordination
- [`terraform/aws/modules/rds/main.tf`](terraform/aws/modules/rds/main.tf) - Infrastructure definition

---

**Decision Date**: 2026-03-12
**Status**: ACCEPTED
**Owner**: VP Engineering
**Review Date**: 2026-06-12
