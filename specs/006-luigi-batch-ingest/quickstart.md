# Quickstart: Luigi batch ingest (Phase A)

**Branch**: `006-luigi-batch-ingest`

## Prerequisites

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
export DATING_COACH_EMBEDDER=hash
```

Luigi is a core extra of this feature (`luigi` in `pyproject.toml` dependencies).

## Run the chain

```bash
dating-coach-batch
# or: python -m backend.pipelines.ingest
```

Expected:

- `data/pipeline/extract/manifest.json`
- `data/pipeline/chunks/chunks.jsonl`
- `data/pipeline/index/complete.json`
- `data/index/index.faiss` and `data/index/meta.json`
- `reports/ingest-report.json` with `success: true`, `source_count` ≥ 1, `chunk_count` ≥ 1, `chunk_count` == `ntotal`

Second run (no `--force`): Luigi skips tasks whose targets already exist.

Full rebuild:

```bash
dating-coach-batch --force
```

## Tests

```bash
DATING_COACH_EMBEDDER=hash pytest tests/unit/test_ingest_helpers.py tests/unit/test_luigi_ingest_tasks.py tests/integration/test_luigi_ingest_pipeline.py
```

All four must pass without network.

## Coaching smoke (optional)

Existing API still uses `data/index/`. After a successful batch run:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Ask a bio question; citations still point at `data/knowledge/...`.

## Phase B (not this slice)

Event lake, Hive/Presto-style SQL, Treasure Data — **not** included. See product conversation / future spec.
