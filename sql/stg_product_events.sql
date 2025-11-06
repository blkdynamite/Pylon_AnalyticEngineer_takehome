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
    -- Deduplicate: take most recent version
    ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY _airbyte_extracted_at DESC) AS rn
  FROM {{ source('airbyte', 'PRODUCT_EVENTS') }}
  WHERE _airbyte_meta.changes IS NULL  -- Exclude soft deletes
  QUALIFY rn = 1
),

classify_events AS (
  SELECT
    uuid,
    event,
    distinct_id,
    timestamp,
    timestamp::DATE AS activity_date,
    -- Resolve org ID from two patterns
    CASE 
      WHEN distinct_id LIKE 'org-%' THEN SUBSTRING(distinct_id, 5)
      ELSE NULL 
    END AS org_id_direct,
    -- Classify event source
    CASE 
      WHEN distinct_id LIKE 'org-%' THEN 'system_level'
      ELSE 'user_level'
    END AS event_source,
    -- Classify event category
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
