# Database Failure Recovery Runbook

## Overview
This runbook provides procedures for handling PostgreSQL database failures in the SaaS Factory infrastructure. The system is designed with HA/DR capabilities including primary/replica replication, automatic failover, and multi-region support.

## Architecture Reference
- **Primary Database**: us-east-1a (active)
- **Replica Database**: us-east-1b (standby)
- **Backup Replica**: us-east-1c (read-only)
- **Replication Lag Tolerance**: < 5 seconds
- **RTO (Recovery Time Objective)**: < 2 minutes
- **RPO (Recovery Point Objective)**: < 30 seconds

## Severity Levels

### Level 1: Degraded (Elevated Latency)
- Database responding but slow
- Replication lag increasing
- CPU/Memory near threshold

### Level 2: Partial Outage
- Primary not accepting writes
- Reads available from replicas
- Some queries failing

### Level 3: Complete Outage
- Database completely unavailable
- All writes failing
- Application error rates > 50%

## Level 1 Response: Degraded Performance

### Detection
Monitor these signals:
- [`/health/route.ts:88-147`](apps/saas-001-booking/app/api/health/route.ts:88-147) - Database health check
- CloudWatch metric: `DatabaseCPUUtilization` > 80%
- `replication_lag` > 3 seconds
- Connection pool saturation

### Immediate Actions (< 5 minutes)

1. **Check Replication Status**
   ```bash
   psql -h <primary-endpoint> -U postgres -d saas_factory \
     -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"
   ```

2. **Monitor Connection Pool**
   ```bash
   psql -h <primary-endpoint> -U postgres \
     -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
   ```

3. **Check for Long-Running Queries**
   ```bash
   psql -h <primary-endpoint> -U postgres \
     -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
           FROM pg_stat_activity
           WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
   ```

4. **Increase Connection Pool Size** (if safe)
   - Edit RDS parameter group: `max_connections` (current: 1000)
   - Requires reboot if changing from default
   - Gradual increase recommended

5. **Enable Query Cache**
   - Verify Redis is operational (see [`REDIS_FAILURE_RECOVERY.md`](REDIS_FAILURE_RECOVERY.md))
   - Activate intelligent cache layer in application

### Communication
- Notify team via Slack: engineering-#incidents
- Update status page: https://status.saas-factory.io
- Alert severity: WARNING

---

## Level 2 Response: Primary Write Failure

### Detection Signals
- Application errors: `ECONNREFUSED` or `connection timeout`
- Write error rate > 10%
- Primary node not accepting connections
- CloudWatch alarm: `DatabaseFailover Alert`

### Immediate Actions (< 2 minutes)

1. **Confirm Primary is Down**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier saas-factory-postgres \
     --query 'DBInstances[0].DBInstanceStatus'
   ```

2. **Check Replica Is Healthy**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier saas-factory-postgres-replica \
     --query 'DBInstances[0].DBInstanceStatus'
   ```

3. **Trigger Manual Failover** (if automated didn't work)
   ```bash
   aws rds failover-db-cluster \
     --db-cluster-identifier saas-factory-cluster \
     --target-db-instance-identifier saas-factory-postgres-replica
   ```

   **Expected Duration**: 30-60 seconds

4. **Monitor Failover Progress**
   ```bash
   watch -n 5 'aws rds describe-db-instances \
     --db-instance-identifier saas-factory-postgres \
     --query "DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,DBInstanceClass]"'
   ```

5. **Verify Replica Promotion**
   - Replica becomes new primary
   - Third replica auto-promoted to standby (if available)
   - DNS records updated automatically (Route53)

6. **Update Application Connection Strings**
   - Applications should auto-reconnect
   - If not, restart app servers:
   ```bash
   kubectl rollout restart deployment/saas-001-booking -n production
   ```

### Validation (< 5 minutes post-failover)
```bash
# Check new primary
psql -h <new-primary-endpoint> -U postgres -d saas_factory \
  -c "SELECT version();"

# Check replication to new replica
psql -h <new-primary-endpoint> -U postgres \
  -c "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# Verify no data loss
psql -h <new-primary-endpoint> -U postgres \
  -c "SELECT COUNT(*) FROM bookings;"
```

### Communication
- Declare INCIDENT
- Slack engineering channel: "Database failover initiated"
- Status page: "Database failover in progress - ~1 min downtime"
- ETA recovery: Immediate

---

## Level 3 Response: Complete Database Outage

### Critical: All Replicas Down

**Estimated Duration**: 5-15 minutes

1. **Declare CRITICAL INCIDENT**
   ```bash
   # Use incident management tool
   declare_incident "Critical: All database instances down"
   ```

2. **Check AWS Account Status**
   ```bash
   aws ec2 describe-regions
   aws rds describe-db-instances --region us-east-1
   ```

3. **Restore from Most Recent Backup**
   ```bash
   aws rds restore-db-cluster-from-snapshot \
     --db-cluster-identifier saas-factory-restore-$(date +%s) \
     --snapshot-identifier arn:aws:rds:us-east-1:ACCOUNT:cluster-snapshot:daily-backup-latest \
     --engine aurora-postgresql \
     --db-subnet-group-name saas-factory-db-subnet-group
   ```

4. **Restore Specific Point-in-Time** (if snapshot insufficient)
   ```bash
   aws rds restore-db-cluster-to-point-in-time \
     --db-cluster-identifier saas-factory-restore-pitr \
     --source-db-cluster-identifier saas-factory-cluster \
     --restore-type copy-on-write \
     --restore-time 2026-03-12T22:00:00Z
   ```

5. **Update DNS to Restored Instance**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123ABC \
     --change-batch file://dns-update.json
   ```

6. **Update Application Secrets**
   - Update connection string in AWS Secrets Manager
   - Redeploy applications

### Recovery Validation
```bash
# Verify data integrity
psql -h <restored-endpoint> -U postgres -d saas_factory \
  -c "SELECT COUNT(*) as booking_count FROM bookings;
      SELECT MAX(created_at) as latest_booking FROM bookings;"

# Check for consistency issues
psql -h <restored-endpoint> -U postgres -d saas_factory \
  -c "SELECT schemaname, tablename FROM pg_tables 
      ORDER BY schemaname, tablename;"
```

### Post-Recovery Steps
1. Run data validation scripts
2. Compare with backup logs
3. Identify any data loss window
4. Restore point-in-time if needed
5. Run vacuum and analyze on critical tables

---

## Multi-Region Failover (DR Scenario)

**When to Activate**: Entire region (us-east-1) is down

### Prerequisites
- Secondary region (eu-west-1) replica must be < 30 seconds behind
- Route53 geolocation routing configured
- Secondary applications pre-deployed

### Activation Steps

1. **Promote Secondary Region Primary** (eu-west-1)
   ```bash
   aws rds promote-read-replica \
     --db-instance-identifier saas-factory-postgres-eu \
     --region eu-west-1
   ```

2. **Update Route53 to Route to EU**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123ABC \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "db.saas-factory.internal",
           "Type": "CNAME",
           "TTL": 60,
           "ResourceRecords": [{"Value": "saas-factory-postgres-eu.rds.eu-west-1.amazonaws.com"}]
         }
       }]
     }'
   ```

3. **Verify Cross-Region Connectivity**
   ```bash
   psql -h saas-factory-postgres-eu.rds.eu-west-1.amazonaws.com -U postgres -d saas_factory
   ```

4. **Roll Back When Primary Region Recovers**
   - Set up replication from primary region
   - Failover back to primary
   - Test thoroughly first

---

## Monitoring & Prevention

### Proactive Checks (Daily)
```bash
# Replication lag
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as replication_lag_seconds;

# Disk space
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

# Slow queries
SELECT (total_time / calls) as avg_time, calls, query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY avg_time DESC LIMIT 10;
```

### Alerting Thresholds
- **Replication Lag**: Alert if > 5 secs, Critical if > 30 secs
- **CPU Utilization**: Alert if > 80%, Critical if > 95%
- **Disk Space**: Alert if > 80%, Critical if > 95%
- **Connection Pool**: Alert if > 80%, Critical if > 95%
- **Backup Status**: Alert if backup not completed in 25 hours

### Backup Validation (Weekly)
```bash
# Test restore from latest snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier test-restore-$(date +%s) \
  --snapshot-identifier <latest-snapshot> \
  --engine aurora-postgresql
```

---

## Rollback Procedures

### Rollback from Failover
If failover detected incorrectly:

1. **Check Logs** (CloudWatch)
   ```bash
   aws logs tail /aws/rds/instance/saas-factory-postgres --follow
   ```

2. **Verify Primary is Healthy**
3. **Manual Failover Back**
   ```bash
   aws rds failover-db-cluster \
     --db-cluster-identifier saas-factory-cluster \
     --target-db-instance-identifier saas-factory-postgres
   ```

---

## Escalation Path

| Severity | Time | Owner | Action |
|----------|------|-------|--------|
| Level 1  | Now  | On-call Engineer | Page engineer, check logs |
| Level 2  | 2m   | Engineering Lead | Initiate failover |
| Level 3  | 5m   | VP Engineering + CTO | Restore from backup, declare incident |
| Level 3  | 15m+ | Entire team | Post-mortem, root cause analysis |

---

## Related Documents
- [`/health/route.ts`](apps/saas-001-booking/app/api/health/route.ts) - Health check endpoint
- [`ha-connection-pool.ts`](blocks/db/src/ha-connection-pool.ts) - Connection pooling logic
- [`REDIS_FAILURE_RECOVERY.md`](REDIS_FAILURE_RECOVERY.md) - Cache layer failover
- [`MULTI_REGION_FAILOVER.md`](MULTI_REGION_FAILOVER.md) - Cross-region DR

---

**Last Updated**: 2026-03-12
**Owner**: Platform Engineering Team
**Review Frequency**: Quarterly
