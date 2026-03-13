# DBT Best Practices: Data Build Tool for Modern Analytics

## DBT Fundamentals

### What is DBT?
```
DBT = "Data Build Tool"
- Build analytics code in SQL (not Python, not Java)
- Version control your transformations (GitHub)
- TDD for analytics (write tests for data quality)
- Documentation as code (self-documenting data models)
- DRY (Don't Repeat Yourself): Reusable SQL macros

Philosophy: "Analytics as engineering discipline"
(not: "SQL scripts scattered in Jupyter notebooks")
```

### DBT Project Structure
```
analytics/
├── dbt_project.yml          # Project configuration
├── models/                   # SQL transformation models
│   ├── staging/             # Raw → cleaned transformations
│   │   ├── stg_users.sql
│   │   ├── stg_orders.sql
│   │   └── stg_payments.sql
│   ├── marts/               # Business logic (final tables)
│   │   ├── dim_users.sql    # Dimension table
│   │   ├── dim_products.sql
│   │   └── fct_orders.sql   # Fact table
│   └── intermediate/        # Temporary models (staging between)
│       └── int_user_order_history.sql
├── tests/                    # Data quality tests
│   ├── relationships.yml     # Foreign key tests
│   ├── unique.yml           # Uniqueness tests
│   └── not_null.yml         # NOT NULL tests
├── macros/                   # Reusable SQL code (like functions)
│   ├── generate_surrogate_key.sql
│   └── clean_email.sql
├── seeds/                    # Reference data (CSV files)
│   ├── dim_regions.csv
│   └── dim_products.csv
└── analyses/                 # Ad-hoc queries (not part of models)
    └── revenue_analysis.sql
```

---

## Best Practices for SaaS Analytics

### Practice 1: Staging Layer Architecture

```typescript
interface StagingLayerPattern {
  // Goal: Transform raw data into clean, consistent format

  raw_databases: {
    source: "PostgreSQL database (production OLTP)",
    tables: ["users", "orders", "payments"],
    characteristics: "Optimized for transactions, not analytics",
  },

  staging: {
    purpose: "Clean and standardize raw data",
    patterns: [
      "Rename columns to meaningful names",
      "Cast to correct types",
      "Handle NULLs and outliers",
      "Fix data quality issues early",
    ],
  },

  marts: {
    purpose: "Business-ready tables for reports",
    tables: [
      "dim_users (dimension table with user info)",
      "dim_products (product dimension)",
      "fct_orders (order fact table with metrics)",
    ],
  },
}

// Implementation: Staging Model
export const stg_users_sql = `
select
  user_id as user_pk,                          -- Rename for clarity
  lower(email) as email,                       -- Standardize
  created_at::date as signup_date,             -- Cast to date
  coalesce(last_name, '') as last_name,        -- Handle NULLs
  case
    when signup_date < '2020-01-01' then 'old_user'
    else 'recent_user'
  end as user_cohort,
  current_timestamp as loaded_at
from raw.public.users
where deleted_at is null                       -- Filter deleted users
`;

// Implementation: Mart Model (Fact Table)
export const fct_orders_sql = `
select
  o.order_id as order_pk,
  o.user_id as user_fk,
  o.product_id as product_fk,
  o.order_date,
  o.quantity,
  o.unit_price,
  o.quantity * o.unit_price as revenue,
  case
    when o.status = 'completed' then 1
    else 0
  end as is_completed_order,
  p.payment_method,
  p.processed_at
from {{ ref('stg_orders') }} o           -- Reference staging model
left join {{ ref('stg_payments') }} p
  on o.order_id = p.order_id
where o.order_date >= '2023-01-01'       -- Filter historical cutoff
`;
```

### Practice 2: Naming Conventions

```typescript
interface NamingConventions {
  // Prefix: What is the table type?
  prefixes: {
    stg_: "Staging (raw → cleaned)",
    dim_: "Dimension (master data tables)",
    fct_: "Fact (event/transaction tables)",
    int_: "Intermediate (temporary, not exposed)",
    m_: "Materialized views (expensive to compute)",
  },

  // Naming examples:
  good_names: {
    stg_users: "Raw users staged & cleaned",
    dim_users: "User dimension (business-ready)",
    fct_orders: "Order facts with metrics",
    int_user_order_summary: "Temp: user-level order summaries",
  },

  bad_names: {
    users_v2: "Version numbers (confusing)",
    user_fact: "Mixing prefixes",
    temp_table: "No clear purpose",
    result: "Vague name",
  },

  // Column naming
  columns: {
    surrogate_keys: "{table}_pk",           // order_pk (surrogate key)
    foreign_keys: "{table}_fk",             // order_fk (references orders table)
    measures: "{verb}_{object}",            // total_revenue, count_orders
    dimensions: "{adjective}_{object}",     // primary_category, is_active
    timestamps: "{verb}_at",                // created_at, updated_at

    examples: [
      "order_pk (surrogate key)",
      "user_fk (foreign key to users)",
      "total_revenue (metric)",
      "is_completed (boolean dimension)",
      "created_at (timestamp)",
    ],
  },
}
```

### Practice 3: Testing for Data Quality

```typescript
interface DBTTestingStrategy {
  // Type 1: Generic Tests (column-level)
  generic_tests: {
    unique: "Every value must be unique",
    not_null: "No NULL values allowed",
    accepted_values: "Column must be in specific list",
    relationships: "Foreign key referential integrity",
  },

  // Implementation: tests/models.yml
  example_tests: `
models:
  - name: dim_users
    columns:
      - name: user_pk
        tests:
          - unique
          - not_null
        description: "Primary key, should be unique"

      - name: email
        tests:
          - unique
          - not_null
          - custom_regex                    # Custom test

      - name: status
        tests:
          - accepted_values:
              values: ['active', 'inactive', 'trial']
              description: "Only known statuses"

  - name: fct_orders
    columns:
      - name: user_fk
        tests:
          - relationships:
              to: ref('dim_users')
              field: user_pk
              description: "FK must match dim_users"

      - name: revenue
        tests:
          - dbt_expectations.expect_column_values_to_be_of_type:
              column_type: 'numeric'
              description: "Revenue must be numeric"
  `,

  // Type 2: Custom Tests (row-level)
  custom_test_example: `
-- tests/assert_revenue_positive.sql
-- Test: Revenue should never be negative
select *
from {{ ref('fct_orders') }}
where revenue < 0
  `,

  // Type 3: dbt_expectations (statistical tests)
  statistical_tests: [
    "not_null (no NULLs)",
    "expect_column_max_to_be_between (outlier detection)",
    "expect_column_mean_to_be_between (sanity check)",
    "expect_row_count_to_be_between (row count sanity)",
  ],

  // Run tests
  command: "dbt test",
  output: "PASS if no rows returned from test query",
}

// Implementation: Custom test macro
export const test_no_negative_values_sql = `
-- macros/test_no_negative_values.sql
{% macro test_no_negative_values(model, column_name) %}

select *
from {{ model }}
where {{ column_name }} < 0

{% endmacro %}

-- Usage in tests/models.yml:
-- - name: revenue
--   tests:
--     - no_negative_values
`;
```

### Practice 4: Macros for Code Reusability

```typescript
interface DBTMacros {
  // Goal: Write SQL once, use everywhere

  example1_SurrogateKey: `
-- macros/generate_surrogate_key.sql
{% macro generate_surrogate_key(columns) %}
  {{ dbt_utils.surrogate_key(columns) }}
{% endmacro %}

-- models/dim_users.sql
select
  {{ dbt_utils.surrogate_key(['user_id', 'created_date']) }} as user_pk,
  user_id,
  email,
  created_date
from {{ ref('stg_users') }}
  `,

  example2_CleanEmail: `
-- macros/clean_email.sql
{% macro clean_email(email_column) %}
  lower(trim({{ email_column }}))
{% endmacro %}

-- models/stg_users.sql
select
  user_id,
  {{ clean_email('email') }} as email,
  created_at
from raw_users
  `,

  example3_DateSpine: `
-- macros/generate_date_spine.sql
-- Generate all dates between two dates (for fact table grain)
{% macro generate_date_spine(start_date, end_date) %}
  with date_spine as (
    select
      cast('{{ start_date }}' as date) + row_number() over (order by null) - 1 as date_day
    from table(generator(rowcount => datediff(day, '{{ start_date }}', '{{ end_date }}')))
  )
  select date_day
  from date_spine
{% endmacro %}

-- Usage: model with one row per order per day
  `,
}
```

### Practice 5: Incremental Models (For Performance)

```typescript
interface IncrementalModels {
  // Problem: Each dbt run recalculates entire dataset (slow!)
  // Solution: Only process new/changed rows

  fullRefresh: {
    problem: "Processing all data every run (1 billion rows)",
    time: "30 minutes per run",
    cost: "$$$",
  },

  incremental: {
    benefit: "Only process NEW rows since last run",
    time: "2 minutes per run",
    cost: "1/10 of full refresh",
  },

  // Implementation
  example: `
-- models/fct_orders_incremental.sql
{{
  config(
    materialized='incremental',
    unique_key='order_pk',
    on_schema_change='fail'
  )
}}

select
  o.order_id as order_pk,
  o.user_id as user_fk,
  o.order_date,
  o.total_amount,
  current_timestamp as inserted_at
from raw.public.orders o
left join raw.public.users u on o.user_id = u.user_id

{% if execute %}
  -- Only include rows modified since last dbt run
  where o.updated_at >= (select max(inserted_at) from {{ this }})
{% endif %}
  `,

  // Full refresh only on demand
  command: {
    incremental: "dbt run",
    fullRefresh: "dbt run --full-refresh",
  },
}
```

---

## DBT Deployment Best Practices

### Version Control
```typescript
interface DBTVersionControl {
  gitWorkflow: {
    main_branch: "Production (auto-deployed nightly)",
    develop_branch: "Staging (test environment)",
    feature_branches: "Feature/{feature_name} (for development)",
  },

  // Main branch protection
  protection_rules: [
    "Require pull request reviews (2 people)",
    "Require dbt test pass (must be 100% test pass)",
    "Require dbt parse success (no syntax errors)",
  ],

  // Commit messages
  good_commits: [
    "feat: add user lifetime value metric to fct_users",
    "refactor: extract email cleaning to macro",
    "fix: handle NULL values in payment_method",
    "test: add uniqueness test to dim_products",
  ],
}
```

### CI/CD Pipeline for DBT

```typescript
interface DBTCIPipeline {
  // GitHub Actions example
  workflow: {
    on_push_to_feature: [
      "1. dbt parse (check syntax)",
      "2. dbt compile (compile Jinja templates)",
      "3. dbt test --select state:modified+ (test affected models)",  
      "4. dbt docs generate (generate documentation)",
    ],

    on_merge_to_main: [
      "1. dbt parse",
      "2. dbt run --full-refresh (full recalculate)",
      "3. dbt test (all tests)",
      "4. dbt docs generate + upload",
      "5. dbt run-operation post_dbt_run (cleanup temp tables)",
    ],

    on_schedule_nightly: [
      "1. dbt run --full-refresh (every night)",
      "2. dbt test",
      "3. Refresh dashboards",
    ],
  },

  // GitHub Actions implementation
  example_workflow: `
name: dbt Tests
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [main]

jobs:
  dbt-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: dbt parse
        run: dbt parse
      
      - name: dbt test modified models
        run: dbt test --select state:modified+
        if: github.event_name == 'pull_request'
      
      - name: dbt test all (on main)
        run: dbt test
        if: github.ref == 'refs/heads/main'
      
      - name: dbt docs generate
        run: dbt docs generate
      
      - name: Upload to S3
        run: aws s3 sync target/compiled s3://docs-bucket/dbt-docs/
  `,
}
```

### Environment Configuration

```typescript
interface DBTEnvironments {
  // Development (local)
  development: {
    target: "dev",
    database: "analytics_dev",
    schema: "dbt_{{ env_var('DBT_CLOUD_RUN_ID') }}",
    materialization: "view (fast iteration)",
    refresh: "On-demand (dbt run)",
  },

  // Staging (pre-production)
  staging: {
    target: "stage",
    database: "analytics_staging",
    schema: "stg",
    materialization: "table (test before prod)",
    refresh: "Nightly + manual triggers",
  },

  // Production (business-critical)
  production: {
    target: "prod",
    database: "analytics",
    schema: "public",
    materialization: "table (performance critical)",
    refresh: "Nightly + incremental",
  },

  // Configuration: profiles.yml
  profiles_yml: `
analytics_project:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: ABC123
      user: "{{ env_var('DBT_USER') }}"
      password: "{{ env_var('DBT_PASSWORD') }}"
      database: analytics_dev
      schema: dbt_{{ env_var('DBT_CLOUD_RUN_ID', 'local') }}
      threads: 4
      
    prod:
      type: snowflake
      account: ABC123
      user: "{{ env_var('DBT_PROD_USER') }}"
      password: "{{ env_var('DBT_PROD_PASSWORD') }}"
      database: analytics
      schema: public
      threads: 8
  `,
}
```

---

## Common DBT Patterns for SaaS

### Pattern 1: Slowly Changing Dimensions (SCD)

```typescript
interface SlowlyChangingDimensions {
  // Problem: Customer information changes (SCD Type 2)
  // Example: User changes email, is_premium status

  problem: `
User 123: email = alice@example.com (Jan 2024)
User 123: email = alice.new@example.com (Mar 2024)

Question: Which email for historical orders in January?
Answer: SCD Type 2 tracks history
  `,

  implementation: `
-- models/dim_users_scd.sql
with user_changes as (
  select
    user_id,
    email,
    is_premium,
    updated_at as change_date,
    lead(updated_at) over (partition by user_id order by updated_at) as next_change_date
  from {{ ref('stg_users_history') }}
)
select
  {{ dbt_utils.surrogate_key(['user_id', 'change_date']) }} as user_sk,
  user_id,
  email,
  is_premium,
  change_date as effective_date,
  coalesce(next_change_date, '9999-12-31'::date) as expiration_date,
  case
    when next_change_date is null then true
    else false
  end as is_current
from user_changes
  `,
}
```

### Pattern 2: Grain Consistency

```typescript
interface GrainConsistency {
  // Problem: Confusion about what each table represents
  // Solution: Clearly define grain (level of detail)

  definition: {
    "Grain = The detail level of each row",
    "Example: fct_orders has grain of ONE ROW PER ORDER",
  },

  // Good practice: Document grain
  example_schema: `
-- models/fct_orders.yml
models:
  - name: fct_orders
    description: |
      **Grain**: One row per order
      **Uniqueness**: order_id + order_date
      **Late arrivals**: Orders can arrive up to 7 days late
    
    columns:
      - name: order_pk
        tests:
          - unique
          - not_null

  - name: fct_user_daily_activity
    description: |
      **Grain**: One row per user per day
      **Uniqueness**: user_id + date_day
      **Recalculate**: Daily (previous 3 days recalculated for late arrivals)
    
    columns:
      - name: user_day_pk
        tests:
          - dbt_expectations.expect_compound_columns_to_be_unique:
              column_list: [user_id, date_day]
  `,
}
```

### Pattern 3: Golden Dataset

```typescript
interface GoldenDataset {
  // Concept: Single source of truth
  // All reports use same underlying data

  problem: `
Report A: Revenue = $1M (uses old join logic)
Report B: Revenue = $1.2M (uses different logic)

Result: Executives confused, data distrust
  `,

  solution: `
Create "Golden Dataset":
- fct_orders (single, well-tested revenue table)
- All reports use fct_orders
- Grain: One row per order
- Fully tested (100% test pass)
- Well-documented (data dictionary)

Result: Everyone agrees on metrics
  `,

  implementation: `
-- fct_orders is the golden dataset
-- All revenue reports reference it
-- No ad-hoc SQL creating new definition

-- reports/
-- └── revenue_by_month.sql
select
  date_trunc('month', order_date)::date as month,
  sum(revenue) as total_revenue
from {{ ref('fct_orders') }}
where dbt_valid_from <= current_timestamp
  and (dbt_valid_to > current_timestamp or dbt_valid_to is null)
group by 1
  `,
}
```

---

## Performance Optimization

```typescript
interface DBTPerformanceOptimizations {
  // Optimization 1: Incremental models
  incremental: "Only compute new data",

  // Optimization 2: Selective graph execution
  selectiveGraph: {
    command: "dbt run --select path:models/staging/",
    benefit: "Only run certain subdirectory",
  },

  // Optimization 3: Staging models as views
  staging_as_views: {
    rationale: "Staging is just cleaning, views are fast",
    implementation: "config(materialized='view')",
  },

  // Optimization 4: Materialized marts as tables
  marts_as_tables: {
    rationale: "Marts are often queried, need speed",
    implementation: "config(materialized='table')",
  },

  // Optimization 5: Seed for reference data
  seeds: {
    use: "Small reference data (states, countries, product categories)",
    uploaded_as: "CSV file",
    command: "dbt seed",
    benefit: "Version controlled, can use in tests",
  },

  // Optimization 6: Snowflake-specific
  snowflake_optimization: {
    clustering: "Cluster keys on common filters",
    materialization: "dynamic_table for near-real-time",
  },
}
```

---

## Resources

- [DBT Official Documentation](https://docs.getdbt.com/)
- [DBT Analytics Engineering Best Practices](https://docs.getdbt.com/guides/analytics-engineering)
- [dbt-expectations](https://github.com/calogica/dbt-expectations) (Testing library)
- [dbt-utils](https://github.com/dbt-labs/dbt-utils) (Macros library)
- [The Coalesce Conference](https://coalesce.getdbt.com/) (Annual DBT community)
- ["Fundamentals of Analytics Engineering" - Claire Carroll](https://www.analyst.bi/) (Best practices guide)
