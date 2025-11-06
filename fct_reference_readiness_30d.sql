{{ config(
    materialized='table',
    unique_key=['org_id'],
    tags=['weekly', 'mart']
) }}

WITH customer_health AS (
  SELECT
    org_id,
    org_name,
    (SELECT CURRENT_ARR__C FROM {{ source('salesforce', 'accounts') }} WHERE PYLON_ORGANIZATION_ID__C = oda.org_id LIMIT 1) AS arr,
    unique_user_count,
    -- Health Components
    ROUND(CASE 
      WHEN COUNT(DISTINCT activity_date) / 30.0 > 0.9 THEN 95
      WHEN COUNT(DISTINCT activity_date) / 30.0 > 0.7 THEN 85
      WHEN COUNT(DISTINCT activity_date) / 30.0 > 0.5 THEN 70
      ELSE 50
    END * 0.35, 1) AS usage_component,
    
    ROUND(CASE 
      WHEN AVG(unique_user_count / NULLIF(seats, 0)) > 0.75 THEN 95
      WHEN AVG(unique_user_count / NULLIF(seats, 0)) > 0.5 THEN 80
      ELSE 65
    END * 0.35, 1) AS engagement_component,
    
    85 * 0.20 AS support_component,  -- Placeholder
    10 AS renewal_component
  FROM {{ ref('fct_org_daily_activity') }} oda
  LEFT JOIN (SELECT organization_id, COUNT(ID) AS seats FROM {{ source('airbyte', 'pylon_users') }} GROUP BY organization_id) pu
    ON oda.org_id = pu.organization_id
  WHERE activity_date >= DATEADD(day, -90, CURRENT_DATE)
  GROUP BY org_id, org_name
),

with_reference_score AS (
  SELECT
    org_id,
    org_name,
    arr,
    unique_user_count AS engagement_level,
    (usage_component + engagement_component + support_component + renewal_component) AS health_score,
    -- Reference Readiness Calculation
    ROUND(
      (usage_component + engagement_component + support_component + renewal_component) * 0.35 +  -- Health
      (CASE WHEN arr > 150000 THEN 100 ELSE 75 END * 0.25) +  -- Engagement
      (CASE WHEN arr > 250000 THEN 100 WHEN arr > 150000 THEN 90 ELSE 75 END * 0.20) +  -- Size
      (CASE WHEN DATEDIFF(month, '2023-01-01', CURRENT_DATE) > 12 THEN 95 ELSE 70 END * 0.15) +  -- Tenure
      5,  -- Willingness
      1
    ) AS reference_readiness_score,
    CASE 
      WHEN (usage_component + engagement_component + support_component + renewal_component) >= 90 THEN 'Low'
      WHEN (usage_component + engagement_component + support_component + renewal_component) >= 70 THEN 'Medium'
      ELSE 'High'
    END AS retention_risk,
    CASE 
      WHEN arr > 150000 AND (usage_component + engagement_component + support_component + renewal_component) >= 90 THEN TRUE
      ELSE FALSE
    END AS case_study_ready,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM customer_health
)

SELECT * FROM with_reference_score
ORDER BY reference_readiness_score DESC