# Data Model: Luigi Batch Knowledge Ingest (Phase A)

**Branch**: `006-luigi-batch-ingest` | **Date**: 2026-09-07

Persistence: **files only**. No relational database.

---

## SourceManifest

Output of `ExtractKnowledge`. Path: `data/pipeline/extract/manifest.json`

| Field | Type | Rules |
|-------|------|--------|
| `generated_at` | ISO-8601 UTC string | Set on write |
| `knowledge_dir` | string | Absolute or repo-relative path used |
| `uploads_dir` | string | Absolute or repo-relative path used |
| `files` | list[SourceFile] | Sorted by path; empty → task should fail |
| `source_count` | int | `len(files)` |

### SourceFile

| Field | Type | Rules |
|-------|------|--------|
| `path` | string | Repo-relative if possible |
| `source_id` | string | Filename stem (same as current ingest) |
| `kind` | `curated` \| `upload` | Curated = under knowledge_dir |
| `suffix` | string | Lowercase extension including dot |
| `sha256` | string | Hex digest of file bytes |
| `size_bytes` | int | ≥ 0 |

**Validation**: Zero files → fail extract (do not write a “success” empty manifest as a completed Luigi target). Prefer raising before `output().open("w")`.

---

## ChunkBatch

Output of `TransformChunks`. Path: `data/pipeline/chunks/chunks.jsonl`

Each line is one **ChunkRecord**:

| Field | Type | Rules |
|-------|------|--------|
| `chunk_id` | string | `{source_id}#{n}` as today |
| `source_id` | string | From source file |
| `title` | string | Display title |
| `heading` | string \| null | Nearest heading |
| `text` | string | Non-empty |
| `path` | string | Citation path |

Sidecar `data/pipeline/chunks/skipped.json`:

| Field | Type | Rules |
|-------|------|--------|
| `skipped` | list[{path, reason}] | Unreadable or zero-chunk files |
| `skipped_count` | int | |
| `chunk_count` | int | Lines in jsonl |

**Validation**: If `chunk_count == 0`, fail transform; do not leave a successful Luigi target.

---

## IndexComplete (Luigi marker)

Path: `data/pipeline/index/complete.json`

Written **after** `save_index` to `data/index/` (or parameterized `index_dir`).

| Field | Type | Rules |
|-------|------|--------|
| `index_dir` | string | Where FAISS was written |
| `ntotal` | int | Vector count; must equal chunk_count |
| `embedder` | string | `hash` \| `minilm` \| other settings name |
| `completed_at` | ISO-8601 UTC string | |

**Product files** (unchanged schema from 001): `index.faiss`, `meta.json` list of ChunkMeta.

**Guard**: If marker exists but `index.faiss` or `meta.json` is missing, `BuildIndex` must rebuild (do not skip).

---

## IngestReport

Luigi output of `WriteIngestReport`. Path: `reports/ingest-report.json` (tests may override directory).

| Field | Type | Rules |
|-------|------|--------|
| `success` | bool | True only if index ntotal > 0 |
| `generated_at` | ISO-8601 UTC string | |
| `embedder` | string | |
| `source_count` | int | From manifest |
| `chunk_count` | int | |
| `skipped_count` | int | |
| `skipped` | list[{path, reason}] | May be empty |
| `index_dir` | string | |
| `manifest_path` | string | |
| `chunks_path` | string | |
| `ntotal` | int | From index |

Optional human copy: `reports/ingest-report.md` is allowed but is **not** the Luigi target (keep one primary `output()`).

---

## Relationships

```text
SourceManifest 1—* SourceFile
SourceFile 1—* ChunkRecord
ChunkRecord *—1 IndexArtifact (FAISS + meta)
BatchRun produces IngestReport summarizing the above
```

## State transitions (job)

`pending` → `running` → `complete` (artifact exists) | `failed` (no complete artifact; Luigi will retry next invocation).

Force rebuild: delete pipeline dir + report target → all jobs `pending` again.
