-- Verify one row per org per day (grain validation)

SELECT org_id, activity_date, COUNT(*) as row_count
FROM {{ ref('fct_org_daily_activity') }}
GROUP BY 1, 2
HAVING COUNT(*) > 1
