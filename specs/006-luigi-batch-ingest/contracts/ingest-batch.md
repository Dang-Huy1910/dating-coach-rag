# Contract: Batch ingest CLI and artifacts

**Feature**: `006-luigi-batch-ingest`  
**Audience**: Operator / pytest — not a public HTTP API.

## Console script

```text
dating-coach-batch [--force]
```

Equivalent module form:

```text
DATING_COACH_EMBEDDER=hash python -m backend.pipelines.ingest
DATING_COACH_EMBEDDER=hash python -m backend.pipelines.ingest --force
```

| Flag | Default | Behavior |
|------|---------|----------|
| `--force` | off | Delete `data/pipeline/` and the ingest report target, then run the full chain |
| (none) | | `luigi.build` top-level `WriteIngestReport`; skip tasks whose `output()` exists |

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | Top-level task SUCCESS |
| ≠0 | Luigi failure (empty corpus, transform produced 0 chunks, I/O error) |

Environment (existing):

- `DATING_COACH_EMBEDDER` = `hash` \| `minilm`
- Knowledge / uploads / index dirs from `backend.app.config.Settings` unless Luigi parameters override in tests.

## Luigi graph

```text
ExtractKnowledge
        │
        ▼
TransformChunks
        │
        ▼
   BuildIndex
        │
        ▼
WriteIngestReport     ← top-level task
```

Each task: `requires()` → upstream; `output()` → `luigi.LocalTarget` as in [data-model.md](../data-model.md).

## Artifact JSON

Schemas: [data-model.md](../data-model.md).

Minimum report keys a test may assert:

```json
{
  "success": true,
  "source_count": 1,
  "chunk_count": 1,
  "skipped_count": 0,
  "embedder": "hash",
  "ntotal": 1
}
```

## Non-goals (this contract)

- No `/v1/...` HTTP ingest endpoints.
- No Luigi JSON visualizer requirement (`luigid`).
- `dating-coach-ingest` (one-shot) remains a separate entry point.
