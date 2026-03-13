# Data Warehouse Design: Snowflake vs BigQuery vs Redshift

## Overview
Modern data warehouses are the backbone of analytics infrastructure. The choice between Snowflake, BigQuery, and Redshift affects scalability, cost, and team velocity. This isn't just a tool choice—it's an architectural decision.

## Technology Comparison Matrix

### Snowflake
```
Architecture: Cloud-agnostic (AWS, GCP, Azure), fully managed
Processing: MPP (Massively Parallel Processing)
Scaling: Seamless horizontal scaling
Cost Model: Compute + Storage (pay separately)
Query Speed: <1s to minutes depending on complexity
Concurrency: Excellent (handles 1000+ queries)
Learning Curve: Easy (SQL-centric, Pythonic UDF syntax)
Best For: Companies needing flexibility, multi-cloud
```

### BigQuery
```
Architecture: Google Cloud only, fully serverless
Processing: Zetabyte scale, columnar storage
Scaling: Automatic (no cluster tuning needed)
Cost Model: Pay-per-query (cheaper for ad-hoc queries)
Query Speed: <1s (cached results), seconds for large scans
Concurrency: Excellent (API-first, very scalable)
Learning Curve: Moderate (some GCP-specific concepts)
Best For: Companies all-in on Google Cloud, data scientists
```

### Redshift
```
Architecture: AWS-only, provisioned clusters
Processing: MPP (columnar storage)
Scaling: Vertical scaling (resize cluster), manual sharding
Cost Model: Per-node hourly rate
Query Speed: Seconds to minutes (cluster dependent)
Concurrency: Limited (node-dependent resource pools)
Learning Curve: Moderate (SQL + cluster ops knowledge)
Best For: Companies deeply invested in AWS, legacy migrations
```

## Detailed Comparison

### 1. Cost Structure

#### Snowflake
```
Monthly cost = Storage + Compute

Storage:
- $4/TB/month (compressed average)
- Typical SaaS: 100GB-10TB = $400-$40K/month

Compute (Credits):
- 1 credit = $2-4 per credit
- Small warehouse: 10 credits/hour = $20-40/hour
- Running continuously: ~200-400 credits/day = $400-800/day
- Average SaaS spend: $50K-$200K/month

Example (Growing SaaS):
├─ Storage (1TB compressed): $4K
├─ Dev warehouse (8 credits/hr, 8hr/day): $3K
├─ Prod warehouse (16 credits/hr, 24hr/day): $24K
├─ Analytics (4 credits/hr, 16hr/day): $2K
└─ Total: ~$33K/month
```

#### BigQuery
```
Cost = Bytes scanned (flat rate) + Storage

Storage:
- $6.25/TB/month (active data)
- $1.25/TB/month (archived/long-term)
- Partitioned tables reduce scan costs significantly

Query cost:
- $6.25 per TB of data scanned
- No charge for "free tier" (1TB/month included)
- Caching: Cached queries $0 (within 24 hours)

Example (Growing SaaS):
├─ Storage (1TB): $6.25K
├─ Query scans (1000 queries/day × 1GB avg): $20K
├─ Slots (for reserved capacity, optional): $0-$50K
└─ Total: $26K-$76K/month (highly variable)
```

#### Redshift
```
Cost = Per-node hourly rate + Storage

Nodes:
- ra3.xlplus: $3.26/hour (compressed storage, AWS managed)
- ra3.4xlarge: $6.52/hour
- Basic prod setup: 2 nodes = $6.52/hour = $4.7K/month
- Peak cluster: 10 nodes = $239K/month

Storage:
- Included in managed storage (ra3)
- Or separate (dc2 nodes): $1.5K per node/month

Example (Growing SaaS):
├─ Prod cluster (3 ra3.xlplus nodes): $7K
├─ Dev cluster (1 ra3.xlplus node): $2K
├─ Backup storage: $2K
└─ Total: ~$11K/month (but scales down if demand drops)
```

**Cost Winner by Scenario**:
```
Scenario A: Aggressive ad-hoc analysis
→ BigQuery (pay only for data scanned)

Scenario B: Stable workload, predictable queries
→ Redshift (fixed cost regardless of queries)

Scenario C: Growing fast, uncertain workload
→ Snowflake (middle ground, easy to resize)
```

### 2. Query Performance

#### Benchmark: 1TB dataset, "top products by revenue"

```
Snowflake (XL warehouse - 8 credits/hour):
- Cold cache: 4 seconds
- Warm cache: 1 second
- After optimization: <500ms

BigQuery:
- Cold cache: 2 seconds
- Warm cache: <100ms (cached)
- After optimization: <300ms

Redshift (dc2.8xlarge cluster):
- Cold cache: 6 seconds
- Warm cache: 2 seconds
- After optimization: 1 second
```

**Real-world factors**:
```
Snowflake advantage:
- Automatic query optimization
- Result caching out of box
- Query history for learning

BigQuery advantage:
- Parallelization at extreme scale (PB+ datasets)
- Automatically scans only needed columns
- BI tool integration seamless

Redshift advantage:
- Very predictable performance (no surprises)
- Columnar format efficient for aggregate queries
- Good for mixed analytical/operational workloads
```

### 3. Data Loading

#### Snowflake
```
Methods:
├─ COPY (from S3/GCS/Azure) - batch
├─ Snowpipe (auto CDC) - real-time
├─ Python SDK (small datasets)
└─ Connectors (Fivetran, Stitch, etc.)

Load time (1GB fresh data):
- From S3/GCS: 10-30 seconds
- Via Snowpipe: 20-60 second latency
- Typical throughput: 10-100GB/hour

Code example:
```

### 4. Data Modeling

Standard dimensional modeling (works same in all):

```sql
-- Fact table: transactions
CREATE TABLE FACT_TRANSACTIONS (
  transaction_id INT,
  date_id INT,
  customer_id INT,
  product_id INT,
  amount DECIMAL(10,2),
  quantity INT
);

-- Dimension: date
CREATE TABLE DIM_DATE (
  date_id INT PRIMARY KEY,
  date DATE,
  year INT,
  month INT,
  day_of_week VARCHAR(10)
);

-- Dimension: customer
CREATE TABLE DIM_CUSTOMER (
  customer_id INT PRIMARY KEY,
  name VARCHAR(100),
  segment VARCHAR(20),
  lifetime_value DECIMAL(15,2),
  created_at TIMESTAMP
);
```

**Key differences**:

```
Snowflake:
- Supports semi-structured (JSON, Parquet)
- Dynamic SQL strings easily handled
- Good for messy data (ETL-lite)

BigQuery:
- NESTED/STRUCT types (complex hierarchies without joins)
- Better for analytics (denormalization friendly)
- ML integration native (BigQuery ML)

Redshift:
- Most traditional relational
- Sortkey + distkey for optimization
- Best for pre-aggregated star schemas
```

### 5. Team Scalability

#### Snowflake
```
Developer experience: ⭐⭐⭐⭐⭐
├─ SQL is SQL (vs BigQuery quirks)
├─ Warehouses auto-resize (no tuning)
├─ Easy to sandbox (separate warehouses)
└─ Python/Java UDFs simple

Data scientist workflow:
├─ Jupyter → Snowflake connector → Query
├─ Dbt models → Auto-tests → Great experience
└─ Role-based access control (RBAC) intuitive

Cost of complexity: Low
├─ Doesn't punish experimentation
├─ Can spin up expensive warehouse then delete
└─ Query costs transparent
```

#### BigQuery
```
Developer experience: ⭐⭐⭐⭐
├─ SQL + some special syntax
├─ Requires understanding partitioning for cost
├─ Jupyter integration very smooth
└─ Python UDFs available

Data scientist workflow:
├─ Jupyter → BigQuery client library → Query
├─ Dbt models → Partitioning/clustering key
└─ IAM integration with GCP (good if all Google Cloud)

Cost of complexity: Medium
├─ Can easily blow up costs by scanning full table
├─ Requires discipline and monitoring
└─ Query cost audit trail not always obvious
```

#### Redshift
```
Developer experience: ⭐⭐⭐
├─ SQL + cluster tuning knowledge
├─ Requires distkey/sortkey optimization
├─ Dev sandbox costs same as prod (discourages experimentation)
└─ Less native Python integration

Data scientist workflow:
├─ Connect via Jupyter → psycopg2
├─ Cluster ops skills needed (vacuum, analyze)
└─ Requires coordination with DBA

Cost of complexity: High
├─ Mistakes expensive (larger cluster for week)
├─ Limited experimentation (fixed cost)
└─ Requires deeper AWS knowledge
```

## Architectural Decision Framework

### Choose Snowflake if:
```
✓ Multi-cloud strategy (AWS + GCP + Azure)
✓ Frequent ad-hoc queries from analysts
✓ Growing data org (scaling team easily)
✓ Data scientists doing exploratory work
✓ Want SQL simplicity (no special syntax)
✓ Budget: $50K-$500K/month is OK
✓ Timeline: Need solution fast (fastest onboarding)
```

### Choose BigQuery if:
```
✓ All infrastructure on Google Cloud
✓ Petabyte-scale analytics (true big data)
✓ Need real-time analytics (Dataflow integration)
✓ Data scientists building ML models (BigQuery ML)
✓ Cost-conscious on query patterns (ad-hoc friendly)
✓ Already invested in GCP (Dataflow, Pub/Sub, etc.)
✓ Serverless preferred (no cluster management)
```

### Choose Redshift if:
```
✓ Deep AWS commitment (EC2, RDS, etc.)
✓ Mostly stable, known query patterns
✓ Cost predictability critical (fixed clusters)
✓ Mixed OLTP+OLAP workload
✓ Already have Redshift (migration inertia)
✓ Data size <50TB (plays to Redshift's strengths)
✓ Team proficient in AWS ops
```

## Hybrid Approach (Recommended for Growing SaaS)

```
Architecture:
┌────────────────────────────────────────────┐
│ Data Sources (App DB, APIs, Events)       │
├────────────────────────────────────────────┤
│         ETL/ELT Orchestration (dbt/Airflow) │
├────────────────────────────────────────────┤
│  Staging/Lake (Low-cost storage)           │
│  ├─ S3 (AWS) / GCS (GCP) / Blob (Azure)   │
│  └─ Parquet/Avro format                    │
├────────────────────────────────────────────┤
│  Warehouse (Primary analytics)             │
│  ├─ Snowflake (primary for flexibility)   │
│  ├─ BigQuery (parallel for DataStudio)    │
│  └─ Redshift (optional, for AWS-only)     │
├────────────────────────────────────────────┤
│  Marts (Analytics Ready)                   │
│  ├─ Revenue mart                           │
│  ├─ Product mart                           │
│  └─ Customer mart                          │
├────────────────────────────────────────────┤
│  BI Tools & Dashboards                     │
│  ├─ Tableau                                │
│  ├─ Looker                                 │
│  └─ Superset                               │
└────────────────────────────────────────────┘
```

**Why Hybrid?**:
```
✓ Snowflake as primary (cost-efficient, flexible)
✓ BigQuery for real-time dashboards (lower latency)
✓ Lake as single source (avoid duplication)
✓ Marts for clean data (BI tools query marts, not raw)
✓ A/B test new tools (Redshift spike testing)
```

## Implementation Recommendation for Your SaaS

### Month 1-3 (MVP)
```
Choose: Snowflake
Reason: Fast to onboard, SQL user-friendly, scales easily

Setup:
├─ 1 prod warehouse (8-16 credits)
├─ dbt for transformations
├─ Fivetran for data loading
└─ Tableau for visualization
```

### Month 4-6 (Growth)
```
Add: BigQuery (parallel)
Reason: Test real-time analytics, compare costs

Setup:
├─ Replicate core marts to BigQuery
├─ DataStudio for operational dashboards
├─ Python for ML experiments
└─ Monitor cost differences
```

### Month 7-12 (Optimization)
```
Decision point:
├─ If Snowflake cost acceptable → Stick with it
├─ If BigQuery cost lower → Migrate to BigQuery
├─ If AWS-only strategy → Add Redshift
└─ If all three tools needed → Keep both
```

## Migration Patterns

### Snowflake → BigQuery
```
Steps:
1. Export from Snowflake (Parquet format)
2. Load to GCS
3. Create BigQuery tables from GCS
4. Rewrite dbt macros (some differences)
5. Migrate BI tool connections
6. Validate data matches
7. Switch read traffic

Downtime: 2-4 hours (can schedule off-hours)
Estimated effort: 2-3 weeks
```

### BigQuery → Snowflake
```
Steps:
1. Export BigQuery tables (Parquet to GCS)
2. Transfer to Snowflake S3 stage
3. COPY into Snowflake tables
4. Rewrite dbt macros (some differences)
5. Migrate BI tool connections
6. Validate data matches
7. Switch read traffic

Downtime: 2-4 hours
Estimated effort: 2-3 weeks
```

## Cost Optimization Tips

### Universal
```
✓ Partition tables by date (80% cost reduction)
✓ Use columnar formats (Parquet, not CSV)
✓ Archive cold data (>6 months inactive)
✓ Clean data before loading (garbage in = garbage out)
✓ Set query timeout (prevent runaway queries)
✓ Monitor unused tables (delete weekly)
```

### Snowflake-specific
```
✓ Auto-suspend warehouses (save 50%+)
✓ Use smaller warehouses for non-critical queries
✓ Query result caching (free feature)
✓ Materialized views for repeated queries
├─ Frees up warehouse (pre-computed)
```

### BigQuery-specific
```
✓ Use clustered tables (different columns for different marts)
✓ Partition by ingestion date + custom column
✓ Use BigQuery Editions (slots) for committed workload
✓ Nested/STRUCT types to reduce joins
├─ Often cheaper than materialized views
```

### Redshift-specific
```
✓ Right-size cluster to actual workload
✓ Use RA3 nodes (managed storage) vs DC2
✓ Vacuum tables regularly (maintenance)
✓ ANALYZE for query planner (performance)
```

## Lessons for Your SaaS

1. **Cost model drives behavior**: Query-based (BigQuery) vs compute-based (Snowflake/Redshift) changes how teams work
2. **Scaling is different**: Snowflake scales users, BigQuery scales queries, Redshift scales data size
3. **Vendor lock-in is real**: Choose based on long-term cloud strategy, not just DW
4. **SQL dialect matters**: Teams prefer simple SQL (Snowflake wins here)
5. **Hybrid is realistic**: Many companies use 2-3 warehouses eventually
6. **Cost tracking is essential**: Set up alerts, audit queries, archive aggressively
7. **Data modeling doesn't change**: Star schema works everywhere (implementation details vary)

## Quick Decision Tree

```
Q1: Are you Google Cloud native?
├─ Yes → BigQuery
└─ No → Q2

Q2: Does cost predictability matter more than cost?
├─ Yes → Redshift (if AWS) or Snowflake
├─ No → BigQuery or Snowflake

Q3: Do you need simplicity/fast onboarding?
├─ Yes → Snowflake
└─ No → Any (but Redshift hardest)

Q4: Team size and SQL experience?
├─ <5 people, SQL novices → Snowflake
├─ >10 people, SQL experts → Any
└─ AWS-only ops team → Redshift
```

## Next Steps

1. Determine your data size (GB, projected TB)
2. Estimate query frequency (queries/day)
3. Pick warehouse based on framework
4. Run proof of concept (1 week)
5. Compare real numbers (cost + performance)
6. Commit for 12 months minimum
