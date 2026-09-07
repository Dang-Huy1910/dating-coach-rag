-- Presto-style query on mart
-- Ad-hoc explore over mart_daily_intent (Treasure Data Presto analog).
-- Placeholder {{MART_PATH}} is substituted by Python.

SELECT
  intent,
  SUM(event_count) AS event_count,
  SUM(refusal_count) AS refusal_count,
  SUM(hedge_count) AS hedge_count,
  CAST(SUM(refusal_count) AS DOUBLE) / NULLIF(SUM(event_count), 0) AS refusal_rate,
  AVG(avg_latency_ms) AS avg_latency_ms
FROM read_parquet('{{MART_PATH}}')
GROUP BY intent
ORDER BY event_count DESC, intent;
