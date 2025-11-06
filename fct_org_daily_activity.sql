-- dbt model: fct_org_daily_activity
-- Purpose: Daily org-level activity aggregation (ONE ROW PER ORG PER DAY)
-- Grain: organization_id, activity_date
-- Refresh: Daily, incremental

{{ config(
    materialized='table',
    unique_key=['org_id', 'activity_date'],
    partition_by={
        'field': 'activity_date',
        'data_type': 'date'
    },
    cluster_by=['org_id'],
    indexes=[
        {'columns': ['org_id', 'activity_date']}
    ]
) }}

WITH event_with_org AS (
  SELECT
    -- Resolve org ID (priority: direct org ID → user's org)
    COALESCE(spe.org_id_direct, pu.ORGANIZATION_ID) AS org_id,
    spe.activity_date,
    spe.distinct_id,
    spe.event,
    spe.event_category,
    -- Classify as AI event
    CASE WHEN spe.event_category = 'AI Features' THEN 1 ELSE 0 END AS is_ai_event
  FROM {{ ref('stg_product_events') }} spe
  LEFT JOIN {{ source('airbyte', 'PYLON_USERS') }} pu 
    ON spe.distinct_id = pu.ID
  -- Only include events with valid org assignment
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
    -- Top event
    MAX(CASE WHEN event_rank = 1 THEN event END) OVER (PARTITION BY org_id, activity_date) AS top_event_type,
    MAX(CASE WHEN event_rank = 1 THEN event_count END) OVER (PARTITION BY org_id, activity_date) AS top_event_count,
    -- Events per user
    ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT distinct_id), 0), 2) AS avg_events_per_user,
    -- Feature breakdown
    SUM(CASE WHEN event_category = 'Issue Management' THEN 1 ELSE 0 END) AS issue_events,
    SUM(CASE WHEN event_category = 'AI Features' THEN 1 ELSE 0 END) AS ai_events,
    SUM(CASE WHEN event_category = 'Frontend/Navigation' THEN 1 ELSE 0 END) AS frontend_events,
    SUM(CASE WHEN event_category = 'Knowledge Base' THEN 1 ELSE 0 END) AS kb_events,
    -- All event types used
    LISTAGG(DISTINCT event_category, ', ') WITHIN GROUP (ORDER BY event_category) AS feature_categories_used
  FROM event_with_org
  GROUP BY org_id, activity_date
  QUALIFY ROW_NUMBER() OVER (PARTITION BY org_id, activity_date ORDER BY activity_date) = 1
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
    -- Business context
    sa.NAME AS salesforce_account_name,
    sa.INDUSTRY,
    sa.SEGMENT__C AS account_segment,
    sa.SEAT_TIER__C AS seat_tier,
    sa.CURRENT_ARR__C AS current_arr,
    sa.ANNUALREVENUE,
    CASE WHEN sa.CURRENT_ARR__C > 0 THEN TRUE ELSE FALSE END AS is_paying_customer,
    -- Metadata
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM daily_aggregation da
  LEFT JOIN {{ ref('dim_organizations') }} po ON da.org_id = po.organization_id
  LEFT JOIN {{ source('salesforce', 'ACCOUNTS') }} sa ON da.org_id = sa.PYLON_ORGANIZATION_ID__C
)

SELECT * FROM with_org_context
ORDER BY activity_date DESC, org_id