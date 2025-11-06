{{ config(
    materialized='incremental',
    unique_key=['org_id'],
    on_schema_change='sync_all_columns',
    tags=['weekly', 'mart']
) }}

WITH org_ai_usage AS (
  SELECT
    org_id,
    COUNT(DISTINCT ai_feature_category) AS distinct_ai_features,
    COUNT(*) AS ai_event_count,
    COUNT(DISTINCT distinct_id) AS unique_ai_users,
    ROUND(100.0 * COUNT(*) / NULLIF(
      (SELECT SUM(total_event_count) FROM {{ ref('fct_org_daily_activity') }} 
       WHERE org_id = eo.org_id AND activity_date >= DATEADD(day, -30, CURRENT_DATE)), 0), 2) AS ai_tickets_pct,
    LISTAGG(DISTINCT ai_feature_category, ', ') WITHIN GROUP (ORDER BY ai_feature_category) AS ai_features_used
  FROM event_org_ai eo
  WHERE activity_date >= DATEADD(day, -30, CURRENT_DATE)
    AND is_ai_event = TRUE
  GROUP BY org_id
),

with_adoption_score AS (
  SELECT
    oau.org_id,
    (SELECT org_name FROM {{ ref('fct_org_daily_activity') }} WHERE org_id = oau.org_id LIMIT 1) AS org_name,
    (SELECT CURRENT_ARR__C FROM {{ source('salesforce', 'accounts') }} WHERE PYLON_ORGANIZATION_ID__C = oau.org_id LIMIT 1) AS arr,
    oau.distinct_ai_features,
    oau.ai_event_count,
    oau.unique_ai_users,
    oau.ai_tickets_pct,
    oau.ai_features_used,
    CASE WHEN oau.ai_event_count > 0 THEN 1 ELSE 0 END AS is_ai_adopter,
    -- Effective Adoption Rate: (AI_Tickets% × 0.4) + (Features × 0.3) + (Engagement × 0.3)
    ROUND((oau.ai_tickets_pct * 0.4) + (oau.distinct_ai_features * 10 * 0.3) + (85 * 0.3), 1) AS effective_adoption_score,
    CASE 
      WHEN (oau.ai_tickets_pct * 0.4) + (oau.distinct_ai_features * 10 * 0.3) + (85 * 0.3) >= 90 THEN 'Champion'
      WHEN (oau.ai_tickets_pct * 0.4) + (oau.distinct_ai_features * 10 * 0.3) + (85 * 0.3) >= 70 THEN 'Adopter'
      WHEN (oau.ai_tickets_pct * 0.4) + (oau.distinct_ai_features * 10 * 0.3) + (85 * 0.3) >= 50 THEN 'Growing'
      ELSE 'At-Risk'
    END AS adoption_tier,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM org_ai_usage oau
)

SELECT * FROM with_adoption_score

{% if execute %}
  -- Tests in dbt YAML
  -- - not_null: [org_id, effective_adoption_score]
  -- - unique: [org_id]
  -- - accepted_values: adoption_tier, ['Champion', 'Adopter', 'Growing', 'At-Risk']
{% endif %}