# Research: Batch Usage Analytics (Phase B)

**Branch**: `007-luigi-sql-analytics` | **Date**: 2026-09-07

## Decision: DuckDB as local Hive + Presto stand-in

**Decision**: Use **DuckDB** to execute two SQL files:
- `sql/hive_daily_metrics.sql` — rebuild `mart_daily_intent` from raw events (batch aggregate / INSERT OVERWRITE analog)
- `sql/presto_explore.sql` — SELECT on the mart (ad-hoc analog)

**Rationale**: DAC teaches Hive + Presto on Treasure Data. A laptop cannot run TD. DuckDB is one process, zero ops, reads JSONL/Parquet, enough to show two-stage SQL. Comments at the top of each `.sql` file map to Hive vs Presto.

**Alternatives considered**:
- Trino/Presto Docker — closer to Presto, heavier than intern demo (YAGNI).
- SQLite — weaker nested/parquet story.
- Real Treasure Data — needs account/keys; out of scope.

## Decision: Second Luigi pipeline, not an extra ingest task

**Decision**: New module `backend/pipelines/analytics.py` and console script `dating-coach-analytics`. Do not fold SQL into `backend/pipelines/ingest.py`.

**Rationale**: Phase A ingest vs Phase B analytics are different DAGs (like separate Luigi apps under `/apps` in luigi-td-example). Interview talking point: two pipelines.

**Alternatives considered**: One mega-DAG ingest→analytics — couples knowledge rebuild to metrics; wrong.

## Decision: Bronze JSONL partitions + Parquet mart

**Decision**:
- Raw: `data/lake/events/dt=YYYY-MM-DD/events.jsonl` (append-friendly for API)
- Gold: `data/warehouse/mart_daily_intent.parquet` (or Hive-style directory) written by the Hive SQL task
- Export: `reports/analytics/presto_explore.csv` as Luigi output of the last task

**Rationale**: JSONL append is simple and privacy-auditable (one JSON object per line). Columnar mart matches “Hive builds a table, Presto reads it.”

**Alternatives considered**: One parquet file per API event — tiny files, painful. Only parquet bronze — awkward appends.

## Decision: Seed CLI, not a Luigi task that always runs

**Decision**: `dating-coach-analytics --seed` writes a **deterministic** 3-day fixture (overwrite those `dt=` folders). Default `dating-coach-analytics` only runs Luigi SQL+export. If lake empty, Luigi fails.

**Rationale**: Separates “generate demo data” from “batch SQL jobs” — closer to production (events already landed). Tests can write their own JSONL in `tmp_path`.

## Decision: API hook is best-effort, no user text

**Decision**: After a successful `handle()` (or equivalent) in the API layer, append a UsageEvent. Catch I/O errors and log; never raise to the client. Fields: event_id, event_ts, dt, session_id, intent, refused, hedged, citation_count, latency_ms. Never prompt/body.

**Rationale**: Constitution IV. FR-007, FR-011.

## Decision: Luigi graph mirrors luigi-td-example

```text
HiveDailyMetrics (DuckDB + hive_daily_metrics.sql)
        │
        ▼
PrestoExplore    (DuckDB + presto_explore.sql)
        │
        ▼
ExportCsv        (write reports/analytics/presto_explore.csv)
```

PrestoExplore `output()` can be a JSON/parquet result; ExportCsv copies to CSV (Task3 in TD example). If explore already writes CSV, ExportCsv can be a thin `LocalTarget` of that CSV — still keep **three tasks** so the interview graph matches TD samples.

## Decision: No new HTTP analytics endpoints / no UI

**Decision**: CLI + files only for the chain. API only **emits** events.

**Rationale**: FR-010, YAGNI.
