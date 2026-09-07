# Tasks: Luigi Batch Knowledge Ingest (Phase A)

**Input**: Design documents from `/specs/006-luigi-batch-ingest/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ingest-batch.md, quickstart.md

**Tests**: Required by FR-009 (dependency order, skip-on-complete, report counts, empty corpus failure). Hash embedder only.

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 from spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package layout and Luigi dependency

- [x] T001 Create package `backend/pipelines/__init__.py` and `data/pipeline/.gitkeep`
- [x] T002 Add `luigi>=3.5` to `pyproject.toml` dependencies and console script `dating-coach-batch = "backend.pipelines.ingest:main"`
- [x] T003 [P] Ignore pipeline artifacts in `.gitignore` (`data/pipeline/**` except `.gitkeep`; do not ignore `reports/ingest-report.json` if we want a sample — prefer ignoring `reports/ingest-report.json` and `reports/ingest-report.md` as generated)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reusable ingest helpers Luigi tasks will call; no Luigi Task classes yet

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T004 Refactor `backend/app/rag/ingest.py` to export helpers used by both one-shot `ingest()` and Luigi: `build_source_manifest(...)`, `transform_to_chunks(...)` (returns chunk records + skipped list), `build_and_save_index(chunks, index_dir, embedder)` — keep existing `ingest()` and `dating-coach-ingest` behavior
- [x] T005 Add `pipeline_dir` (default `REPO_ROOT / "data" / "pipeline"`) and `ingest_report_path` (default `REPO_ROOT / "reports" / "ingest-report.json"`) to `backend/app/config.py` Settings
- [x] T006 [P] Unit tests for helpers in `tests/unit/test_ingest_helpers.py` (tiny tmp corpus: one good `.md`, one unreadable file; empty dir raises; chunk_count matches)

**Checkpoint**: `python -m backend.app.rag.ingest` still indexes; helpers are importable

---

## Phase 3: User Story 1 - Run a full batch ingest as one dependent job chain (Priority: P1) 🎯 MVP

**Goal**: Four Luigi tasks with requires/output/run; one command builds index + report

**Independent Test**: `DATING_COACH_EMBEDDER=hash python -m backend.pipelines.ingest` on starter library (or tmp dirs) produces all artifacts; report `success` true

### Tests for User Story 1

- [x] T007 [P] [US1] Unit tests for task graph in `tests/unit/test_luigi_ingest_tasks.py`: `TransformChunks.requires` is `ExtractKnowledge`; `BuildIndex` requires transform; `WriteIngestReport` requires index; each `output()` path matches data-model
- [x] T008 [US1] Integration test in `tests/integration/test_luigi_ingest_pipeline.py`: `luigi.build` `WriteIngestReport` with tmp knowledge/uploads/pipeline/index/report paths; assert SUCCESS, FAISS+meta exist, report `chunk_count == ntotal >= 1`

### Implementation for User Story 1

- [x] T009 [US1] Implement `ExtractKnowledge` in `backend/pipelines/ingest.py` (`luigi.Task`, path Parameters, writes `manifest.json`, fails if zero files)
- [x] T010 [US1] Implement `TransformChunks` in `backend/pipelines/ingest.py` (reads manifest, writes `chunks.jsonl` + `skipped.json`, fails if zero chunks)
- [x] T011 [US1] Implement `BuildIndex` in `backend/pipelines/ingest.py` (embeds via configured embedder, `save_index` to `index_dir`, writes `complete.json`; rebuild if marker exists but FAISS missing)
- [x] T012 [US1] Implement `WriteIngestReport` in `backend/pipelines/ingest.py` (writes `reports/ingest-report.json` schema from data-model.md)
- [x] T013 [US1] Implement `main()` in `backend/pipelines/ingest.py` using `luigi.build([WriteIngestReport(...)], local_scheduler=True)` — do **not** use `luigi.run()` (pytest argv). Exit 0 on SUCCESS else non-zero. Wire Settings defaults for dirs.

**Checkpoint**: US1 integration test passes; one-shot `dating-coach-ingest` still works

---

## Phase 4: User Story 2 - Re-run skips completed jobs (Priority: P2)

**Goal**: Second build skips complete targets; `--force` deletes pipeline + report then reruns

**Independent Test**: Two `luigi.build` calls; second does not rewrite manifest mtime (or Luigi summary shows skipped); `--force` recreates

- [x] T014 [US2] Extend `tests/integration/test_luigi_ingest_pipeline.py`: after success, capture manifest mtime; build again; assert mtime unchanged and SUCCESS; delete only report target; build again; assert report recreated and manifest mtime still unchanged
- [x] T015 [US2] Implement `--force` in `backend/pipelines/ingest.py` `main()` (argparse): remove `pipeline_dir` contents and ingest report file, then `luigi.build`. Document in module docstring.

**Checkpoint**: Skip-on-complete and force rebuild both tested

---

## Phase 5: User Story 3 - Ingest report with counts and skipped files (Priority: P3)

**Goal**: Report includes skipped unreadable files; empty corpus fails

**Independent Test**: Unreadable upload counted; empty dirs fail with no success report claiming index

- [x] T016 [P] [US3] Extend `tests/integration/test_luigi_ingest_pipeline.py` (or unit helper test): valid md + unreadable upload → `success` true, `skipped_count >= 1`
- [x] T017 [US3] Empty knowledge+uploads → `luigi.build` not SUCCESS; no `success: true` report; extract does not leave a successful empty manifest target

**Checkpoint**: Report counts trustworthy; empty corpus cannot look successful

---

## Phase 6: User Story 4 - Document batch chain for a reviewer (Priority: P4)

**Goal**: README + keep one-shot ingest

- [x] T018 [P] [US4] Add a README section “Batch ingest (Luigi)” with `dating-coach-batch`, `--force`, artifact paths, hash embedder, and a one-liner that Phase B (SQL analytics) is not in this slice — `README.md`
- [x] T019 [P] [US4] Confirm `dating-coach-ingest` still listed as the one-shot path in `README.md` (do not remove)

**Checkpoint**: Reviewer can follow README without reading tasks.md

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 Run `ruff check backend/pipelines backend/app/rag/ingest.py backend/app/config.py tests/unit/test_ingest_helpers.py tests/unit/test_luigi_ingest_tasks.py tests/integration/test_luigi_ingest_pipeline.py` and fix issues
- [x] T021 Run `DATING_COACH_EMBEDDER=hash pytest` (full suite) and fix regressions
- [x] T022 Walk `specs/006-luigi-batch-ingest/quickstart.md` commands on hash embedder and fix docs if paths differ
- [x] T023 Mark this tasks.md items `[x]` as each task completes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: start immediately
- **Foundational (Phase 2)**: after Setup — BLOCKS stories
- **US1 (Phase 3)**: after Foundational — MVP
- **US2 (Phase 4)**: after US1 (same Luigi module)
- **US3 (Phase 5)**: after US1 (report fields); can overlap US2 in tests file — sequential if same test file
- **US4 (Phase 6)**: after US1 CLI exists
- **Polish**: after desired stories

### User Story Dependencies

- **US1**: no other stories
- **US2**: extends US1 `main()` and integration tests
- **US3**: extends US1 report + failure paths
- **US4**: docs only

### Parallel Opportunities

- T003 with T001/T002
- T006 with T005 after T004
- T007 with T008 after helpers exist (T008 needs implementation — write test first so it fails, then T009–T013)
- T018/T019 in parallel after CLI works
- T016 parallel with T017 if split across files; same file → sequential

---

## Parallel Example: User Story 1

```bash
# After T004–T006:
Task: "Unit tests for task graph in tests/unit/test_luigi_ingest_tasks.py"
Task: "Integration test in tests/integration/test_luigi_ingest_pipeline.py"
# Then implement T009–T013 sequentially in backend/pipelines/ingest.py (same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational
2. US1 tests then Luigi tasks + `main()`
3. STOP and run integration test
4. Then US2 → US3 → US4 → polish

### Notes

- Tests MUST use `tmp_path` for pipeline/index/report so they never clobber the developer’s real `data/index/`.
- Never call `luigi.run()` from library code.
- Do not add FastAPI routes.
- Do not add Airflow/Prefect/dbt/Spark.
- Mark tasks `[x]` in this file when done (T023).
