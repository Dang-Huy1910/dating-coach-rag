# Tasks: Batch Usage Analytics (Phase B)

**Input**: Design documents from `/specs/007-luigi-sql-analytics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/analytics-batch.md, quickstart.md

**Tests**: Required by FR-008.

## Phase 1: Setup

- [x] T001 Create dirs `backend/analytics/__init__.py`, `sql/.gitkeep`, `data/lake/.gitkeep`, `data/warehouse/.gitkeep`, `reports/analytics/.gitkeep`
- [x] T002 Add `duckdb>=1.1` to `pyproject.toml` dependencies and console script `dating-coach-analytics = "backend.pipelines.analytics:main"`
- [x] T003 [P] Update `.gitignore` for `data/lake/**` (keep gitkeep), `data/warehouse/**` (keep gitkeep), `reports/analytics/**` except gitkeep

---

## Phase 2: Foundational

**⚠️ BLOCKS user stories**

- [x] T004 Add Settings `lake_dir`, `warehouse_dir`, `analytics_dir` (report dir) in `backend/app/config.py`
- [x] T005 Implement event schema + `append_event`, `iter_events`, `seed_demo_events` (deterministic 3 days, ≥2 intents, ≥1 refused, **no forbidden keys**) in `backend/analytics/events.py`
- [x] T006 [P] Write `sql/hive_daily_metrics.sql` (Hive-style header comment; aggregate to mart columns in data-model)
- [x] T007 [P] Write `sql/presto_explore.sql` (Presto-style header comment; SELECT from mart)
- [x] T008 [P] Unit tests in `tests/unit/test_analytics_events.py`: seed field set, no forbidden keys, partition folders `dt=`, overwrite seed is deterministic

**Checkpoint**: Seed writes JSONL; SQL files exist; no Luigi yet

---

## Phase 3: User Story 1 - Batch analytics chain (P1) 🎯 MVP

**Goal**: Hive → Presto → CSV via Luigi

**Independent Test**: tmp lake with 2 days → `luigi.build(ExportCsv)` SUCCESS and CSV counts match

### Tests

- [x] T009 [P] [US1] Unit tests in `tests/unit/test_luigi_analytics_tasks.py`: requires/output graph HiveDailyMetrics → PrestoExplore → ExportCsv
- [x] T010 [US1] Integration test in `tests/integration/test_luigi_analytics_pipeline.py`: fixture JSONL in tmp_path; build; mart parquet exists; CSV rows match day+intent counts; empty lake is not SUCCESS

### Implementation

- [x] T011 [US1] Implement DuckDB helpers to run the two SQL files with substituted lake/warehouse paths in `backend/analytics/events.py` or `backend/pipelines/analytics.py` (keep SQL in `.sql` files)
- [x] T012 [US1] Implement `HiveDailyMetrics` in `backend/pipelines/analytics.py` (fails if zero valid events; writes mart + Luigi marker)
- [x] T013 [US1] Implement `PrestoExplore` in `backend/pipelines/analytics.py` (reads mart, writes explore result artifact)
- [x] T014 [US1] Implement `ExportCsv` in `backend/pipelines/analytics.py` (CSV + optional metrics-report.json)
- [x] T015 [US1] Implement `main()` argparse: `--seed` writes demo lake and exits 0; default `luigi.build([ExportCsv(...)], local_scheduler=True)`; never `luigi.run()`; exit non-zero on Luigi failure

**Checkpoint**: `dating-coach-analytics --seed && dating-coach-analytics` works on repo paths; tests use tmp_path only

---

## Phase 4: User Story 2 - Skip-on-complete (P2)

- [x] T016 [US2] Extend `tests/integration/test_luigi_analytics_pipeline.py`: second build skips Hive marker mtime; delete CSV only then rebuild export; `--force` reruns Hive
- [x] T017 [US2] Implement `--force` in `backend/pipelines/analytics.py` `main()`: delete analytics pipeline markers, warehouse mart, export CSV; **keep** event lake

**Checkpoint**: Skip and force covered by tests

---

## Phase 5: User Story 3 - Metric events, no user text (P3)

- [x] T018 [P] [US3] Implement `emit_usage_event` in `backend/analytics/emit.py` (best-effort try/except; never stores request text)
- [x] T019 [US3] Call emit from `backend/app/api/router.py` after successful coach replies (ask, rewrite_bio, analyze_message, openers, profile_context) with intent, refused, hedged, citation_count, latency_ms, session_id
- [x] T020 [US3] Tests in `tests/unit/test_analytics_emit_api.py`: payload has no forbidden keys; emit exception does not raise to caller; optional TestClient path if easy without LLM (mock handle)

**Checkpoint**: Product path still works if lake is read-only / emit fails

---

## Phase 6: User Story 4 - README (P4)

- [x] T021 [P] [US4] Add README section “Usage analytics (Luigi + SQL)” with seed, run, `--force`, artifact paths, Phase A vs B, local-only (not server deploy) — `README.md`
- [x] T022 [P] [US4] Keep Phase A `dating-coach-batch` section intact in `README.md`

**Checkpoint**: Reviewer can follow README without tasks.md

---

## Phase 7: Polish

- [x] T023 Run `ruff check` on touched Python files and fix
- [x] T024 Run `DATING_COACH_EMBEDDER=hash pytest` full suite; fix regressions (existing API tests must still pass with emit mocked or writable tmp lake — do not write to repo lake during pytest; inject lake_dir via Settings or monkeypatch)
- [x] T025 Walk `specs/007-luigi-sql-analytics/quickstart.md`; fix path drift
- [x] T026 Mark this tasks.md items `[x]` as each task completes

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 / US3 / US4 (US3 touches router; do after US1 so lake helpers exist)
- US2 and US3 sequential if sharing files with US1
- T006/T007 parallel after T001
- Tests in pytest must **monkeypatch** `lake_dir` / Settings so they never append to the developer’s real `data/lake/`

## Implementation Strategy

MVP = T001–T015 (seed + Luigi SQL + CSV). Then skip/force, API emit, README, polish.

### Notes

- Never `luigi.run()`
- Never store user text
- Do not modify Phase A ingest tasks except if Settings import needs new fields
- Do not add FastAPI analytics routes
- Mark `[x]` in this file when done (T026)
