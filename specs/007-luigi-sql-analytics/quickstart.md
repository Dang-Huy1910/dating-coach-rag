# Quickstart: Batch usage analytics (Phase B)

**Branch**: `007-luigi-sql-analytics`

## Prerequisites

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

DuckDB is a core dependency of this feature.

## Seed + run (local only — not a server deploy)

```bash
dating-coach-analytics --seed
dating-coach-analytics
# rebuild SQL/export, keep lake:
dating-coach-analytics --force
```

Expected:

- `data/lake/events/dt=*/events.jsonl`
- `data/warehouse/mart_daily_intent.parquet`
- `reports/analytics/presto_explore.csv`
- Luigi skip on second `dating-coach-analytics` without `--force`

Open:

```bash
python3 -m json.tool data/lake/events/dt=2026-09-05/events.jsonl || head data/lake/events/dt=*/events.jsonl
column -s, -t reports/analytics/presto_explore.csv | head
```

## Tests

```bash
DATING_COACH_EMBEDDER=hash pytest tests/unit/test_analytics_events.py tests/unit/test_luigi_analytics_tasks.py tests/integration/test_luigi_analytics_pipeline.py tests/unit/test_analytics_emit_api.py
```

No network LLM.

## Coaching API (optional)

Existing `uvicorn` path. After a coach turn, one JSONL line may appear under today’s `dt=` partition. Chatbot still works if that write fails.

## Phase A vs B

- Phase A: `dating-coach-batch` — knowledge ingest jobs
- Phase B: `dating-coach-analytics` — usage SQL jobs (Hive-style then Presto-style, local DuckDB)

Not Treasure Data production.
