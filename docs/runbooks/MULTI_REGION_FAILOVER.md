# Multi-Region Failover Runbook

## Overview

Complete disaster recovery procedure for US-EAST-1 (primary region) failure. Activates EU-WEST-1 as primary region in < 5 minutes.

## Architecture

```
Primary:      us-east-1a (Active writes + reads)
├── Database:  RDS PostgreSQL primary
├── Cache:     Redis Cluster primary  
├── Graph:     Neo4j primary
└── Apps:      EKS cluster running saas-001, saas-002...

Secondary:    eu-west-1a (Read-only replicas)
├── Database:  RDS PostgreSQL replica (streaming)
├── Cache:     Redis replica (async sync)
├── Graph:     Neo4j replica (raft quorum)
└── Apps:      Pre-deployed, ready for traffic

Tertiary:     ap-southeast-1a (Read-only backups)
```

**DNS**: Route53 geolocation routing directs:
- US traffic → us-east-1 (5ms latency)
- EU traffic → eu-west-1 (10ms latency)  
- APAC traffic → ap-southeast-1 (25ms latency)

---

## Failure Detection

### Automatic Detection Triggers
```
Primary Region Unhealthy IF:
- All health checks fail for 2 minutes
- All 3 AZs (a, b, c) down
- Network connectivity lost
- DNS resolution failing
```

### Manual Verification (Before Failover)

```bash
# Check primary region status
aws ec2 describe-instances --region us-east-1 | grep -i state

# Check RDS primary
aws rds describe-db-instances \
  --db-instance-identifier saas-factory-postgres \
  --region us-east-1 | grep DBInstanceStatus

# Check EKS cluster
aws eks describe-cluster \
  --name saas-factory-eks \
  --region us-east-1 | grep status
```

---

## Level 1: Isolated Component Failure (Not Full Region)

**Example**: Database fails but compute/cache fine

### Action: Auto-failover within region
```bash
# Failover to replica within us-east-1
aws rds failover-db-cluster \
  --db-cluster-identifier saas-factory-cluster \
  --target-db-instance-identifier saas-factory-postgres-2

# Update local DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123ABC \
  --change-batch file://dns-failover-local.json
```

**Duration**: 30-60 seconds
**Downtime**: < 1 minute
**Data loss**: < 5 seconds

---

## Level 2: Multi-Component Failure (Partial Region Down)

**Example**: 2/3 AZs down, but some services still responding

### Action: Graceful regional failover

1. **Declare incident**
   ```bash
   declare_incident "MAJOR: us-east-1 partial outage"
   notify_stakeholders
   ```

2. **Evaluate if full failover needed**
   ```bash
   # Check remaining capacity
   remaining_capacity=$(aws ec2 describe-instances \
     --region us-east-1 \
     --query 'Reservations[].Instances[?State.Name==`running`]' \
     | jq length)
   
   if [ $remaining_capacity -lt 5 ]; then
     # < 5 instances = likely need failover
     FAILOVER=true
   fi
   ```

3. **If failing over**: Jump to Level 3 procedure

---

## Level 3: Complete Region Failure (Full Failover to EU)

**Estimated Duration**: 3-5 minutes + data verification

### Pre-Requisites (Assumed Already Done)
- [ ] EU applications pre-deployed and ready
- [ ] Database replicas caught up (replication lag < 5 sec)
- [ ] DNS weighted routing configured
- [ ] Route53 health checks active

### Step 1: Declare Critical Incident

```bash
# Incident management
declare_incident "CRITICAL: us-east-1 region down - ACTIVATING DR"

# Notifications
notify_slack "#incidents" "US-EAST-1 DOWN - Failing over to EU"
notify_pagerduty "multi-region-failover"
notify_executives "SaaS Factory experiencing outage - US region"

# Status page
update_statuspage "Investigating: US region unavailable"
```

### Step 2: Verify EU Secondary Is Healthy

```bash
# Check EU database is caught up
aws rds describe-db-instances \
  --db-instance-identifier saas-factory-postgres-eu \
  --region eu-west-1 \
  --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address]'

# Check replication lag (should be < 5 seconds)
aws rds describe-db-instances \
  --db-instance-identifier saas-factory-postgres-eu \
  --region eu-west-1 \
  --query 'DBInstances[0].StatusInfos'
```

**Expected**: EU replica should show "recovered" status

### Step 3: Promote EU Database to Primary

```bash
# Promote EU replica to standalone primary
aws rds promote-read-replica \
  --db-instance-identifier saas-factory-postgres-eu \
  --region eu-west-1 \
  --apply-immediately

# Verify promotion
watch -n 2 'aws rds describe-db-instances \
  --db-instance-identifier saas-factory-postgres-eu \
  --region eu-west-1 \
  --query "DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Engine]"'

# Wait for: DBInstanceStatus = "available"
# Duration: 1-2 minutes
```

**Critical**: Database is now READ-WRITE in eu-west-1

### Step 4: Promote EU Cache to Primary

```bash
# Promote EU Redis replica
aws elasticache promote-read-replica \
  --replication-group-id saas-factory-redis-eu \
  --region eu-west-1 \
  --apply-immediately

# Verify
aws elasticache describe-replication-groups \
  --replication-group-id saas-factory-redis-eu \
  --region eu-west-1
```

**Expected**: Status changes to "available"

### Step 5: Promote EU Neo4j to Primary

```bash
# If using Neo4j Causal Cluster
# Connect to EU Neo4j and:
cypher-shell -u neo4j -p <password> \
  -a bolt://saas-factory-neo4j-eu.eu-west-1.rds.amazonaws.com:7687 \
  "CALL dbms.cluster.setDesignatedLeader('saas-factory-neo4j-primary-eu')"

# Verify leadership
cypher-shell -u neo4j -p <password> \
  -a bolt://saas-factory-neo4j-eu.eu-west-1.rds.amazonaws.com:7687 \
  "CALL dbms.cluster.overview"
```

### Step 6: Update Route53 DNS Routing

```bash
# Update weighted routing to send ALL traffic to EU
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123ABC \
  --region us-east-1 \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "saas-factory.internal",
          "Type": "A",
          "TTL": 60,
          "Weight": 100,
          "SetIdentifier": "EU-Primary",
          "AliasTarget": {
            "HostedZoneId": "Z32O12XQLNTSW2",
            "DNSName": "saas-factory-eu-alb.eu-west-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "saas-factory.internal",
          "Type": "A",
          "TTL": 60,
          "Weight": 0,
          "SetIdentifier": "US-Primary",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "saas-factory-alb.us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

# Wait for DNS propagation (~30 seconds)
nslookup saas-factory.internal

# Verify EU endpoint is active
curl -I https://saas-factory.internal/health
```

### Step 7: Restart EU Applications

```bash
# Scale up EU EKS cluster if needed
kubectl scale deployment/saas-001-booking \
  --replicas=10 \
  --namespace production \
  --context eu-west-1

# Monitor application startup
watch -n 2 'kubectl get pods -n production'

# Verify service is healthy
kubectl logs -n production -l app=saas-001-booking --tail=20
```

### Step 8: Monitor Critical Metrics

```bash
# Database writes per second
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name WriteLatency \
  --dimensions Name=DBInstanceIdentifier,Value=saas-factory-postgres-eu \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average

# Application error rate
aws cloudwatch get-metric-statistics \
  --namespace saas-factory/metrics \
  --metric-name ErrorRate \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 30 \
  --statistics Average
```

### Step 9: Notify Customers

```bash
# Update status page
update_statuspage "Investigating: US region service restored to EU [ETA 5 min for all regions]"

# Send customer notification
send_email_blast "
Dear SaaS Factory Customers,

We experienced an outage in our US region and have successfully failed 
over to our Europe region. Service is now restored and fully operational.

- Failover completed at: 2026-03-12 22:15 UTC
- Estimated user impact: < 2 minutes
- Data loss: None

We apologize for the inconvenience and will publish post-mortem analysis.
"
```

---

## Step 10: Validate Data Integrity

Before resuming normal operations:

```bash
# Check record counts match
psql -h saas-factory-postgres-eu.eu-west-1.rds.amazonaws.com -U postgres -d saas_factory \
  -c "SELECT 
    'bookings' as table_name, COUNT(*) FROM bookings
  UNION ALL
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'payments', COUNT(*) FROM payments;"

# Compare with pre-failure snapshot
eu_counts=$(above query result)
us_snapshot=$(cat /tmp/us_pre_failure_snapshot.txt)

if [ "$eu_counts" = "$us_snapshot" ]; then
  echo "✓ Data integrity verified"
else
  echo "✗ Data mismatch detected - investigate immediately"
fi

# Check no data newer than last replication point
psql -h saas-factory-postgres-eu.eu-west-1.rds.amazonaws.com -U postgres -d saas_factory \
  -c "SELECT MAX(created_at) FROM bookings;"
```

---

## Rollback (When US Restored)

### Pre-Requisites
- US region infrastructure restored
- Database caught up with EU changes

### Procedure

1. **Set up replication from EU to US**
   ```bash
   aws dms create-replication-task \
     --replication-task-identifier eu-to-us-sync \
     --source-endpoint-arn arn:aws:dms:eu-west-1:ACCOUNT:endpoint/postgres-eu-primary \
     --target-endpoint-arn arn:aws:dms:us-east-1:ACCOUNT:endpoint/postgres-us-replica
   ```

2. **Wait for US to catch up**
   ```bash
   watch -n 5 'aws dms describe-replication-tasks \
     --filters Name=replication-task-arn,Values=* \
     --query "ReplicationTasks[0].Status"'
   ```

3. **Failover back to US**
   ```bash
   # Update Route53 back to US primary
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123ABC \
     --change-batch file://dns-failover-us.json
   ```

4. **Verify US is accepting writes**
   ```bash
   psql -h saas-factory-postgres.us-east-1.rds.amazonaws.com -U postgres -d saas_factory \
     -c "INSERT INTO health_check (timestamp) VALUES (NOW());"
   ```

---

## Escalation Path

| Time | Action | Owner |
|------|--------|-------|
| 0m | Incident detected | Automated |
| 1m | Alerts firing, manual verification | On-call Engineer |
| 2m | Declare incident, assess scope | Engineering Lead |
| 3m | Initiate failover | VP Engineering + CTO |
| 5m | Failover complete, resume service | All hands |
| 10m | Data validation complete | Database Team |
| 15m | Customer notifications sent | Marketing + Support |
| 60m | Post-mortem started | VP Engineering |

---

## Related

- [`DATABASE_FAILURE_RECOVERY.md`](DATABASE_FAILURE_RECOVERY.md)
- [`REDIS_FAILURE_RECOVERY.md`](REDIS_FAILURE_RECOVERY.md)
- [`replication-coordinator.ts`](blocks/db/src/replication-coordinator.ts)
- [`failover-controller.ts`](blocks/operations/src/failover-controller.ts)

---

**Last Updated**: 2026-03-12
**Tested**: 2026-03-10 (DR drill)
**Next Test**: 2026-04-10
