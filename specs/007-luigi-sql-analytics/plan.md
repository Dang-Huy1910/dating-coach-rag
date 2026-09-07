# Implementation Plan: Batch Usage Analytics (Phase B)

**Branch**: `007-luigi-sql-analytics` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-luigi-sql-analytics/spec.md`

## Summary

Add a **second Luigi pipeline** that treats coach usage like ads batch logs: date-partitioned events → **Hive-style** daily intent mart (DuckDB) → **Presto-style** explore query → CSV. Seed command for demo without LLM. Optional API append of metrics **without** message text. Phase A ingest DAG unchanged.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: Existing (Luigi, FastAPI, pydantic-settings) + **duckdb**. Tests: pytest. Lint: ruff.

**Storage**: Files. Bronze JSONL under `data/lake/events/dt=YYYY-MM-DD/`. Mart parquet under `data/warehouse/`. CSV/JSON under `reports/analytics/`. No RDBMS, no TD.

**Testing**: pytest; Luigi `luigi.build(..., local_scheduler=True)`; tmp_path lakes; no LLM.

**Target Platform**: Linux laptop / intern demo.

**Project Type**: Batch CLI + small API side-effect (event append).

**Performance Goals**: Seed (~tens of events) + SQL chain under 30 seconds.

**Constraints**: No user text in events; event-write failures must not break coaching; no second orchestrator; no cloud warehouse.

**Scale/Scope**: Demo tens–hundreds of events, 2–3 UTC days, ~5 intents.

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | spec + this plan before application code | PASS |
| II. RAG-Grounded Coaching | No retrieve/prompt changes | PASS |
| III. Backend-First | No UI; API remains chat SoR; analytics is CLI | PASS |
| IV. Safety & Privacy | Events exclude message/bio/question text; ephemeral chat unchanged | PASS |
| V. Solo YAGNI | DuckDB + Luigi extra | **Justified** — DAC JD is Luigi + Hive/Presto; DuckDB is the local analog. See Complexity Tracking. |

Post-design: no new coaching endpoints; analytics CLI + best-effort append. Gates PASS with justification below.

## Project Structure

### Documentation (this feature)

```text
specs/007-luigi-sql-analytics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── analytics-batch.md
├── spec.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/pipelines/analytics.py     # Luigi tasks + main()
backend/analytics/
  __init__.py
  events.py                       # schema, append, seed, read
  emit.py                         # API-safe append wrapper
sql/hive_daily_metrics.sql
sql/presto_explore.sql
backend/app/config.py              # lake_dir, warehouse_dir, analytics_report_dir
backend/app/api/router.py          # best-effort emit after coach handle
pyproject.toml                    # duckdb; dating-coach-analytics script
README.md
tests/unit/test_analytics_events.py
tests/unit/test_luigi_analytics_tasks.py
tests/integration/test_luigi_analytics_pipeline.py
tests/unit/test_analytics_emit_api.py   # append hook does not store text; failures swallowed
data/lake/.gitkeep
data/warehouse/.gitkeep
reports/analytics/.gitkeep
```

**Structure Decision**: SQL files at repo `sql/` so reviewers open them like TD query files. Event helpers in `backend/analytics/` (not inside FastAPI router). Luigi stays under `backend/pipelines/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| DuckDB + second Luigi DAG | JD: Hive/Presto batch SQL after Luigi | Only Phase A ingest — no SQL story for DAC |
| API event append | Optional live lake | Seed-only — weaker “pipeline fed by product” story; keep append best-effort and text-free |

## Phase 0 / Phase 1 outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/analytics-batch.md](./contracts/analytics-batch.md)
- [quickstart.md](./quickstart.md)
