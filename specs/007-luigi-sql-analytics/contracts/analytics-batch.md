# Contract: Analytics batch CLI and artifacts

**Feature**: `007-luigi-sql-analytics`

## Console script

```text
dating-coach-analytics --seed
dating-coach-analytics
dating-coach-analytics --force
```

Module form:

```text
python -m backend.pipelines.analytics --seed
python -m backend.pipelines.analytics
python -m backend.pipelines.analytics --force
```

| Flag | Behavior |
|------|----------|
| `--seed` | Overwrite deterministic demo partitions (3 UTC days of synthetic events). Does not require Luigi success after write; may then exit 0 **or** continue to build — **prefer seed then stop** so operator runs a second command for SQL (clearer demo). README: two commands. |
| (none) | `luigi.build` top-level `ExportCsv` |
| `--force` | Delete analytics pipeline markers, warehouse mart, and export CSV, then build (does **not** delete the event lake unless documented; default: keep lake) |

Exit 0 on Luigi SUCCESS; ≠0 if lake empty or SQL/job fail.

## Luigi graph

```text
HiveDailyMetrics     → sql/hive_daily_metrics.sql
        │
        ▼
PrestoExplore        → sql/presto_explore.sql
        │
        ▼
ExportCsv            → reports/analytics/presto_explore.csv
```

`luigi.build(..., local_scheduler=True)` only — never `luigi.run()`.

## SQL files (reviewer-facing)

- `sql/hive_daily_metrics.sql` — header comment: “Hive-style batch aggregate (Treasure Data analog)”. Rebuilds mart from `events.jsonl` partitions.
- `sql/presto_explore.sql` — header comment: “Presto-style query on mart”. SELECT only.

DuckDB executes both; table/file names parameterized or documented as DuckDB `read_json_auto` / `read_parquet` paths passed via `SET`/`replace` in Python.

## Event JSON (one line)

```json
{
  "event_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "event_ts": "2026-09-05T10:00:00+00:00",
  "dt": "2026-09-05",
  "session_id": "11111111-1111-1111-1111-111111111111",
  "intent": "ask",
  "refused": false,
  "hedged": false,
  "citation_count": 2,
  "latency_ms": 120
}
```

Forbidden keys listed in data-model.md.

## API emit (optional path)

No new route. Existing coach POST handlers, after building `CoachReply`, call `emit_usage_event(...)`. Must not include request body. Swallow errors.

## Non-goals

- No `/v1/analytics` HTTP
- No Treasure Data API
- No `luigid`
