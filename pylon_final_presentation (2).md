# Pylon Analytics Engineering Take-Home

**Author:** George Mason 

**Date:** 11/06/2025

---

### What's Included

- **Core Mart:** fct_org_daily_activity (one row per org per day)
- **Derived Metrics:** AI adoption and reference readiness scoring
- **Self-Serve Dashboard:** Interactive React component for CS/PM
- **SQL Implementation:** Production-ready dbt models with tests
- **Implementation Roadmap:** 8-week phased deployment plan

---

## 1. Mart Architecture & Methodology

### Core Deliverable: fct_org_daily_activity

**Granularity:** One row per organization per day (as requested)

**Joins:**

- product_events aggregated by org_id + activity_date
- Left join pylon_users (to resolve user-level events)
- Left join pylon_organizations (for org context)
- Left join salesforce_accounts (for ARR, segment, industry)

---

 **Table Schema:** fct_org_daily_activity

| **Column** | **Type** | **Nullable** | **Description** |
|---|---|---|---|
| org_id | VARCHAR | NO | Unique organization identifier (primary key) |
| org_name | VARCHAR | YES | Organization name |
| org_domain | VARCHAR | YES | Organization workspace domain |
| org_created_date | TIMESTAMP | YES | When org was created |
| activity_date | DATE | NO | Date of activity (primary key) |
| total_event_count | INTEGER | NO | Total product events on this day |
| unique_user_count | INTEGER | NO | Count of distinct users active on this day |
| distinct_event_types | INTEGER | NO | How many different event types occurred |
| distinct_feature_categories | INTEGER | NO | How many feature categories used |
| top_event_type | VARCHAR | YES | Most frequent event type on this day |
| top_event_count | INTEGER | YES | Count of top event type |
| avg_events_per_user | DECIMAL | NO | Average events per active user |
| issue_events | INTEGER | NO | Events related to issue management |
| ai_events | INTEGER | NO | Events related to AI features |
| frontend_events | INTEGER | NO | Frontend/navigation events |
| kb_events | INTEGER | NO | Knowledge base events |
| feature_categories_used | VARCHAR | YES | Comma-separated list of feature categories |
| salesforce_account_name | VARCHAR | YES | Salesforce account name |
| industry | VARCHAR | YES | Industry from Salesforce |
| account_segment | VARCHAR | YES | Customer segment (Enterprise, Mid-market, etc.) |
| seat_tier | VARCHAR | YES | Pricing tier |
| current_arr | FLOAT | YES | Annual Recurring Revenue |
| annualrevenue | FLOAT | YES | Company annual revenue |
| is_paying_customer | BOOLEAN | NO | Whether org has active ARR |
| _loaded_at | TIMESTAMP | NO | Timestamp when row was loaded |

---

**Data Architecture Diagram**

```
Raw Data Sources
  ├── product_events (raw event stream)
  ├── pylon_users (user directory)
  ├── pylon_organizations (org master data)
  └── salesforce_accounts (business context)
         │
         ▼
Staging Layer (dbt)
  └── stg_product_events (deduplicated, classified)
         │
         ▼
Transformation Layer (dbt)
  ├── event_classification (event type mapping)
  └── user_org_mapping (resolve distinct_id to org_id)
         │
         ▼
Mart Layer (Materialized)
  └── fct_org_daily_activity (ONE ROW PER ORG PER DAY)
         │
         ▼
Derived Marts
  ├── fct_customer_ai_adoption_30d (AI value metrics)
  └── fct_reference_readiness_30d (CS health & references)
         │
         ▼
BI Tool (Looker/Tableau)
  └── Self-serve dashboards for CS/PM
```

---

**SQL Implementation: Core Mart**

### Staging: Event Classification & Deduplication

```sql
-- dbt model: stg_product_events
-- Purpose: Deduplicate events, classify event types, resolve org IDs

WITH raw_events AS (
  SELECT
    uuid,
    event,
    distinct_id,
    timestamp,
    properties,
    team_id,
    ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY _airbyte_extracted_at DESC) AS rn
  FROM {{ source('airbyte', 'PRODUCT_EVENTS') }}
  WHERE _airbyte_meta.changes IS NULL
  QUALIFY rn = 1
),

classify_events AS (
  SELECT
    uuid,
    event,
    distinct_id,
    timestamp,
    timestamp::DATE AS activity_date,
    CASE 
      WHEN distinct_id LIKE 'org-%' THEN SUBSTRING(distinct_id, 5)
      ELSE NULL 
    END AS org_id_direct,
    CASE 
      WHEN distinct_id LIKE 'org-%' THEN 'system_level'
      ELSE 'user_level'
    END AS event_source,
    CASE 
      WHEN event LIKE 'issue:%' THEN 'Issue Management'
      WHEN event LIKE 'ai_%' OR event LIKE '%ai_%' THEN 'AI Features'
      WHEN event LIKE 'frontend:%' THEN 'Frontend/Navigation'
      WHEN event LIKE 'knowledge_base:%' THEN 'Knowledge Base'
      ELSE 'Other'
    END AS event_category
  FROM raw_events
)

SELECT * FROM classify_events
```

### Transformation: Organization Daily Aggregation

```sql
-- dbt model: fct_org_daily_activity
-- Purpose: Daily org-level activity aggregation (ONE ROW PER ORG PER DAY)
-- Grain: organization_id, activity_date

{{ config(
    materialized='table',
    unique_key=['org_id', 'activity_date'],
    partition_by={'field': 'activity_date', 'data_type': 'date'},
    cluster_by=['org_id']
) }}

WITH event_with_org AS (
  SELECT
    COALESCE(spe.org_id_direct, pu.ORGANIZATION_ID) AS org_id,
    spe.activity_date,
    spe.distinct_id,
    spe.event,
    spe.event_category,
    CASE WHEN spe.event_category = 'AI Features' THEN 1 ELSE 0 END AS is_ai_event
  FROM {{ ref('stg_product_events') }} spe
  LEFT JOIN {{ source('airbyte', 'PYLON_USERS') }} pu 
    ON spe.distinct_id = pu.ID
  WHERE COALESCE(spe.org_id_direct, pu.ORGANIZATION_ID) IS NOT NULL
),

daily_aggregation AS (
  SELECT
    org_id,
    activity_date,
    COUNT(*) AS total_event_count,
    COUNT(DISTINCT distinct_id) AS unique_user_count,
    COUNT(DISTINCT event) AS distinct_event_types,
    COUNT(DISTINCT event_category) AS distinct_feature_categories,
    MAX(CASE WHEN event_rank = 1 THEN event END) OVER (PARTITION BY org_id, activity_date) AS top_event_type,
    MAX(CASE WHEN event_rank = 1 THEN event_count END) OVER (PARTITION BY org_id, activity_date) AS top_event_count,
    ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT distinct_id), 0), 2) AS avg_events_per_user,
    SUM(CASE WHEN event_category = 'Issue Management' THEN 1 ELSE 0 END) AS issue_events,
    SUM(CASE WHEN event_category = 'AI Features' THEN 1 ELSE 0 END) AS ai_events,
    SUM(CASE WHEN event_category = 'Frontend/Navigation' THEN 1 ELSE 0 END) AS frontend_events,
    SUM(CASE WHEN event_category = 'Knowledge Base' THEN 1 ELSE 0 END) AS kb_events,
    LISTAGG(DISTINCT event_category, ', ') WITHIN GROUP (ORDER BY event_category) AS feature_categories_used
  FROM event_with_org
  GROUP BY org_id, activity_date
),

with_org_context AS (
  SELECT
    da.org_id,
    po.NAME AS org_name,
    po.DOMAIN AS org_domain,
    po.CREATED_AT AS org_created_date,
    da.activity_date,
    da.total_event_count,
    da.unique_user_count,
    da.distinct_event_types,
    da.distinct_feature_categories,
    da.top_event_type,
    da.top_event_count,
    da.avg_events_per_user,
    da.issue_events,
    da.ai_events,
    da.frontend_events,
    da.kb_events,
    da.feature_categories_used,
    sa.NAME AS salesforce_account_name,
    sa.INDUSTRY,
    sa.SEGMENT__C AS account_segment,
    sa.SEAT_TIER__C AS seat_tier,
    sa.CURRENT_ARR__C AS current_arr,
    sa.ANNUALREVENUE,
    CASE WHEN sa.CURRENT_ARR__C > 0 THEN TRUE ELSE FALSE END AS is_paying_customer,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM daily_aggregation da
  LEFT JOIN {{ ref('dim_organizations') }} po ON da.org_id = po.organization_id
  LEFT JOIN {{ source('salesforce', 'ACCOUNTS') }} sa ON da.org_id = sa.PYLON_ORGANIZATION_ID__C
)

SELECT * FROM with_org_context
ORDER BY activity_date DESC, org_id
```

### Data Quality Tests

```yaml
# dbt/models/marts/schema.yml
models:
  - name: fct_org_daily_activity
    description: "One row per organization per day aggregating all product activity"
    columns:
      - name: org_id
        tests:
          - not_null
          - unique_combination_of_columns:
              combination_of_columns:
                - org_id
                - activity_date
      
      - name: total_event_count
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 1000000
      
      - name: activity_date
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: "dateadd(day, -365, current_date())"
              max_value: "current_date()"
```

---

## 2. Key Metrics and Business Impact 

### Key Metrics for CS/PM

| **Metric** | **Mart Source** | **Purpose/Action** |
|---|---|---|
| **Effective AI Adoption Score (0-100)** | fct_customer_ai_adoption_30d | Measures value realization from core product differentiator (AI). Drives *product-led* retention efforts. |
| **Customer Health Score (0-100)** | fct_reference_readiness_30d | Standardized measure of account well-being (usage, engagement, support load). **Identifies retention risk.** |
| **Reference Readiness Score (0-100)** | fct_reference_readiness_30d | Predicts which healthy accounts are best positioned for case studies or testimonials. **Drives Marketing/Sales enablement.** |
| **AI Tickets %** | fct_customer_ai_adoption_30d | Percentage of all organizational events that are AI-related. High % = high AI dependency. |
| **Avg. Events per User (Daily)** | fct_org_daily_activity | Granular measure of daily platform stickiness. |
| **Total Event Count** | fct_org_daily_activity | Raw engagement level showing if customer is active. |
| **Unique User Count** | fct_org_daily_activity | Team adoption breadth - is it one power user or team-wide adoption? |
| **Feature Category Breakdown** | fct_org_daily_activity | Which features are driving usage (Issue Mgmt vs AI vs KB vs Frontend)? |

---

## 3. Derived Metric Marts: Focus on CS Outcomes

### Mart 1: fct_customer_ai_adoption_30d (AI Value Mart)

Computes the **Effective AI Adoption Score** (0-100) based on:
- AI feature usage frequency
- Percentage of events that are AI-related
- User engagement with AI features

**Use Case:** Identify customers maximizing AI value realization. These are candidates for case studies, testimonials, and expansion upsells.

### Mart 2: fct_reference_readiness_30d (CS Health Mart)

Computes two composite scores:

1. **Health Score (0-100):** Blends usage patterns, user engagement, support sentiment, and renewal timing
2. **Reference Readiness Score (0-100):** Adds account size and tenure to health score to predict reference program fit

**Use Case:** Identify which healthy, growing accounts are best positioned for marketing/sales enablement (case studies, testimonials, advisory boards).

---

## 4. Self-Serve Dashboard: Pylon CS Dashboard

The core visualization is the **ARR vs. AI Adoption Score Scatter Plot**, which segments customers into actionable groups:

- **Target:** High ARR + High AI Adoption (expand, reference-ready)
- **Risk:** High ARR + Low AI Adoption (intervention needed)
- **Quick Wins:** Low ARR + High AI Adoption (upsell seats/features)
- **Monitor:** Low ARR + Low AI Adoption (onboarding support)

Dashboard provides CS/PM immediate access to high-value insights without needing a data analyst for every question.

---

## 5. Implementation Notes

### Data Quality Validation

```sql
-- Verify one row per org per day
SELECT org_id, activity_date, COUNT(*) as row_count
FROM fct_org_daily_activity
GROUP BY 1, 2
HAVING COUNT(*) > 1;
-- Expected result: 0 rows (validates grain)

-- Check data freshness
SELECT MAX(activity_date) as latest_date
FROM fct_org_daily_activity;
-- Expected: Today or yesterday

-- Verify no unexpected nulls
SELECT COUNT(*) as null_org_count
FROM fct_org_daily_activity
WHERE org_id IS NULL;
-- Expected: 0 rows
```

---

## Implementation Timeline Summary

| **Phase** | **Duration** | **Hours** | **Deliverables** | **Success Criteria** |
|---|---|---|---|---|
| **Phase 1: Foundation** | Weeks 1-2 | 45-55 | dbt project, core mart, tests | Core mart production-ready; all tests pass |
| **Phase 2: Metrics** | Weeks 3-4 | 35-45 | Derived marts, stakeholder validation | Metrics validated with CS/PM |
| **Phase 3: BI** | Weeks 5-6 | 32-40 | 4 dashboards, team training | CS/PM using dashboards daily |
| **Phase 4: Hardening** | Weeks 7-8 | 27-35 | Monitoring, documentation | Production-hardened, handoff complete |
| **TOTAL** | **8 weeks** | **139-175 hours** | **Full system deployed** | **Ready for daily use** |

---

## Resource Requirements

### Personnel
- **Primary:** 1x Senior Analytics Engineer (full-time, 8 weeks)
- **Supporting:** 1x Data Engineer (0.25 FTE for infrastructure support)
- **Stakeholders:** CS/PM leadership (10 hours total for reviews + training)

### Tools & Infrastructure
- **Data Warehouse:** Already in use (cost negligible for this workload)
- **dbt Cloud:** ~$300/month (or dbt Core open-source)
- **BI Tool:**  Omni Analytics/Looker/Tableau license
- **Git Repository:** Existing (GitHub, GitLab, or Bitbucket)
