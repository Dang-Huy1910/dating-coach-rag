# Research: Luigi Batch Knowledge Ingest (Phase A)

**Branch**: `006-luigi-batch-ingest` | **Date**: 2026-09-07

## Decision: Luigi local-scheduler, four tasks

**Decision**: Add `luigi` and implement four `luigi.Task` subclasses with `requires` / `output` / `run`. Invoke via `luigi.build([...], local_scheduler=True)` from `backend.pipelines.ingest:main` and a console script `dating-coach-batch`.

**Rationale**: DAC intern program lists Luigi (not Airflow). Treasure Data’s public examples are Luigi tasks that call Hive/Presto; Phase A only needs the Luigi task pattern. `--local-scheduler` avoids running a long-lived Luigi daemon.

**Alternatives considered**:
- Airflow/Prefect/Dagster — more popular generally, **wrong JD**.
- Single existing `ingest()` — no job graph to show in interview.
- Luigi central planner (`luigid`) — extra process, YAGNI for laptop demo.

## Decision: Orchestrate existing RAG helpers; do not duplicate chunk/embed

**Decision**: Refactor `backend.app.rag.ingest` into small functions (`iter_knowledge_files` already exists; add `build_source_manifest`, `transform_to_chunks`, `build_and_save_index`, `summarize_ingest`) and call them from Luigi `run()` methods.

**Rationale**: Constitution: backend ingest remains source of truth for chunking rules. Luigi is glue.

**Alternatives considered**: Copy chunk logic into `backend/pipelines/ingest.py` — drift risk vs upload API reindex.

## Decision: LocalTarget files under `data/pipeline/`

**Decision**:
- Extract → `data/pipeline/extract/manifest.json`
- Transform → `data/pipeline/chunks/chunks.jsonl` (+ optional `skipped.json`)
- BuildIndex → Luigi target `data/pipeline/index/complete.json` **and** write FAISS to existing `data/index/`
- Report → `reports/ingest-report.json` (this file is the Luigi `output()` of `WriteIngestReport`)

**Rationale**: Luigi skip-on-complete keys off `output().exists()`. The FAISS files are product artifacts; a small `complete.json` (chunk count, embedder, timestamp) is the Luigi marker so we can detect “index missing but task complete” and document `--force`.

**Force rebuild**: `--force` deletes `data/pipeline/` and `reports/ingest-report.json` (does **not** delete curated knowledge). Then the chain runs fully. If `data/index/` is missing but `complete.json` exists, `BuildIndex.run` should still rebuild (complete marker is not sufficient without the real index files) — implement `complete()` or `run()` guard: if `index.faiss`/`meta.json` missing, rebuild even if marker exists.

**Alternatives considered**: Parameterize targets by corpus hash (more “correct” incremental). Deferred; `--force` + skip-on-complete meets FR-003 with less code.

## Decision: Hash embedder in tests; MiniLM optional for humans

**Decision**: Tests set `DATING_COACH_EMBEDDER=hash` (already used repo-wide). Do not download MiniLM in CI.

**Rationale**: FR-009. Matches existing pytest convention.

## Decision: Keep `dating-coach-ingest` one-shot CLI

**Decision**: Leave `dating-coach-ingest` working as a thin call to `ingest()`. README documents Luigi as the **batch** path.

**Rationale**: FR-008. Avoid breaking current README/quickstarts for coaching features.

## Decision: No new FastAPI endpoints

**Decision**: Phase A is CLI + files only.

**Rationale**: FR-011, constitution Backend-First does not require HTTP for an operator batch job. Upload/reindex API from 005 stays as-is.

## Luigi usage notes (implementer)

- `output()` must return `luigi.LocalTarget(path)` (or a list if multiple; prefer one primary target per task).
- `requires()` returns upstream task instance(s).
- Idempotency: Luigi skips `run()` when `output().exists()`.
- Tests: `luigi.build([WriteIngestReport(...)], local_scheduler=True, detailed_summary=True)` and assert `LuigiStatusCode.SUCCESS`.
- Pass `pipeline_dir`, `knowledge_dir`, `uploads_dir`, `index_dir` as Luigi `luigi.Parameter` (paths as strings) so tests can use `tmp_path`.
- Do not call `luigi.run()` in a way that parses pytest argv; use `luigi.build` from `main()`.
