-- Hive-style batch aggregate (Treasure Data analog)
-- Rebuilds mart_daily_intent from bronze events.jsonl partitions.
-- Placeholders {{EVENTS_GLOB}} and {{MART_PATH}} are substituted by Python.

COPY (
  SELECT
    dt,
    intent,
    COUNT(*) AS event_count,
    SUM(CASE WHEN refused THEN 1 ELSE 0 END) AS refusal_count,
    SUM(CASE WHEN hedged THEN 1 ELSE 0 END) AS hedge_count,
    CAST(SUM(CASE WHEN refused THEN 1 ELSE 0 END) AS DOUBLE) / COUNT(*) AS refusal_rate,
    AVG(latency_ms) AS avg_latency_ms
  FROM read_json_auto('{{EVENTS_GLOB}}', format = 'newline_delimited')
  WHERE intent IS NOT NULL
    AND dt IS NOT NULL
    AND intent <> ''
    AND CAST(dt AS VARCHAR) <> ''
  GROUP BY dt, intent
  HAVING COUNT(*) > 0
  ORDER BY dt, intent
) TO '{{MART_PATH}}' (FORMAT PARQUET);
