# Data Model: Batch Usage Analytics (Phase B)

**Branch**: `007-luigi-sql-analytics` | **Date**: 2026-09-07

Persistence: **files only**.

---

## UsageEvent

One JSON object per line in `data/lake/events/dt=YYYY-MM-DD/events.jsonl`.

| Field | Type | Rules |
|-------|------|--------|
| `event_id` | UUID string | Unique |
| `event_ts` | ISO-8601 UTC | With `Z` or offset |
| `dt` | string `YYYY-MM-DD` | UTC date of `event_ts`; must match folder |
| `session_id` | UUID string | Opaque; no PII |
| `intent` | string | `ask` \| `rewrite_bio` \| `analyze_message` \| `openers` \| `profile_context` |
| `refused` | bool | From coach reply |
| `hedged` | bool | From coach reply |
| `citation_count` | int | ≥ 0 |
| `latency_ms` | int \| null | ≥ 0 when present |

**Forbidden keys**: `text`, `body`, `prompt`, `message`, `bio`, `question`, `visible_text`, `content`, image payloads.

**Validation**: Missing `intent` or `dt` → skip row in aggregate. Seed never emits forbidden keys.

---

## EventPartition

Directory `data/lake/events/dt=YYYY-MM-DD/` containing `events.jsonl`.

Seed overwrites the demo dates’ files (reproducible). API **appends** lines for “today” UTC.

---

## DailyIntentSummary (mart)

Written by Hive SQL task. Suggested path: `data/warehouse/mart_daily_intent.parquet`

| Field | Type | Rules |
|-------|------|--------|
| `dt` | date/string | UTC day |
| `intent` | string | |
| `event_count` | int | ≥ 0 |
| `refusal_count` | int | |
| `hedge_count` | int | |
| `refusal_rate` | float | `refusal_count / event_count` (0 if count=0, but such rows omitted) |
| `avg_latency_ms` | float \| null | Average of non-null latencies |

Luigi marker (if parquet overwrite confuses skip): `data/pipeline/analytics/hive_complete.json` with `{ "row_count", "completed_at" }`. Prefer **Luigi `output()` = hive_complete.json**; parquet is the data product.

---

## ExploreResult

Output of Presto SQL: e.g. `data/pipeline/analytics/presto_result.json` (list of rows). Typical query: totals by intent across days, plus overall refusal rate.

---

## AnalyticsExport

Luigi output of `ExportCsv`: `reports/analytics/presto_explore.csv`

Optional sibling `reports/analytics/metrics-report.json`:

| Field | Type |
|-------|------|
| `success` | bool |
| `event_count` | int |
| `day_count` | int |
| `csv_path` | string |
| `generated_at` | ISO-8601 UTC |

---

## Relationships

```text
EventPartition 1—* UsageEvent
UsageEvent *—* DailyIntentSummary   (aggregated by dt, intent)
DailyIntentSummary *—* ExploreResult
ExploreResult 1—1 AnalyticsExport
```
