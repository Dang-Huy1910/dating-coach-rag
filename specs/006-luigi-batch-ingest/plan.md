# Implementation Plan: Luigi Batch Knowledge Ingest (Phase A)

**Branch**: `006-luigi-batch-ingest` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-luigi-batch-ingest/spec.md`

## Summary

Wrap the existing RAG knowledge ingest in a **Luigi** local-scheduler batch chain: `ExtractKnowledge` → `TransformChunks` → `BuildIndex` → `WriteIngestReport`. Tasks reuse `backend.app.rag.ingest` / chunk / embed / index. Completion artifacts live under `data/pipeline/`. The FAISS index still lands in `data/index/` so the coaching API is unchanged. Tests use the hash embedder. No warehouse, no Airflow, no UI.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: Existing stack (FastAPI, FAISS, pydantic-settings, numpy) + **luigi** (new). Tests: pytest. Lint: ruff.

**Storage**: File artifacts only. Pipeline targets under `data/pipeline/`. Search index remains `data/index/` (`index.faiss` + `meta.json`). Report under `reports/ingest-report.json` (and optional `.md`). No RDBMS.

**Testing**: pytest; Luigi `--local-scheduler`; `DATING_COACH_EMBEDDER=hash`; tmp_path fixture corpora; no LLM, no MiniLM download.

**Target Platform**: Linux laptop / intern demo (`--local-scheduler`).

**Project Type**: Batch CLI + library next to existing web service (no new HTTP endpoints).

**Performance Goals**: Starter library ingest (hash) finishes well under 2 minutes. Skip-on-complete second run is visibly faster / no-op for finished tasks.

**Constraints**: Constitution YAGNI — Luigi local only, no central planner. Reuse ingest internals; do not duplicate chunkers. Safety/RAG/UI unchanged. FR-011: no second orchestrator, no warehouse.

**Scale/Scope**: One operator, ~7 curated markdown files + optional uploads. Four Luigi tasks. Phase A only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-First | `spec.md` + this `plan.md` before application code | PASS |
| II. RAG-Grounded Coaching | Ingest still produces the same FAISS index the coach retrieves from | PASS — no prompt/retrieve changes |
| III. Backend-First | No UI; batch CLI orchestrates backend ingest modules; API still system of record for chat | PASS — no new browser knowledge access |
| IV. Safety, Ethics & Privacy | No new retention of intimate chat; knowledge files only | PASS |
| V. Solo YAGNI | Luigi is an extra dependency | **Justified** — intern JD (DAC) names Luigi + batch; local-scheduler only; no Airflow/Spark/warehouse. See Complexity Tracking. |

Post-design re-check: contracts are CLI + artifact schemas, not new coaching endpoints. Gates still PASS with the YAGNI justification below.

## Project Structure

### Documentation (this feature)

```text
specs/006-luigi-batch-ingest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ingest-batch.md
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/pipelines/
  __init__.py
  ingest.py                 # Luigi Task classes + main()
backend/app/rag/ingest.py    # Split helpers used by both CLI and Luigi
backend/app/config.py        # optional pipeline_dir setting
pyproject.toml              # luigi dep + dating-coach-batch script
README.md                   # Phase A run commands
tests/unit/test_ingest_helpers.py
tests/unit/test_luigi_ingest_tasks.py
tests/integration/test_luigi_ingest_pipeline.py
data/pipeline/.gitkeep
```

**Structure Decision**: Keep Luigi tasks in `backend/pipelines/` (importable via existing `backend*` package) rather than a top-level `pipelines/` package (avoids setuptools include changes). RAG algorithms stay in `backend/app/rag/`. Tests mirror existing `tests/unit` + `tests/integration` layout.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extra orchestrator (Luigi) on a solo RAG demo | DAC intern JD teaches Luigi + batch; CV must show `requires`/`output`/`run`, not a single `ingest()` script | Keep calling `python -m backend.app.rag.ingest` — does not demonstrate batch jobs or skip-on-complete |

## Phase 0 / Phase 1 outputs

- [research.md](./research.md) — Luigi vs wrapping ingest, target paths, force rebuild
- [data-model.md](./data-model.md) — artifacts and fields
- [contracts/ingest-batch.md](./contracts/ingest-batch.md) — CLI + JSON schemas
- [quickstart.md](./quickstart.md) — validation commands
