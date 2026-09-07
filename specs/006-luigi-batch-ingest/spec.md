# Feature Specification: Luigi Batch Knowledge Ingest (Phase A)

**Feature Branch**: `006-luigi-batch-ingest`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase A for a Data Engineering intern CV aligned with DAC (Luigi + batch). Add a Luigi-orchestrated batch pipeline that runs knowledge ingest as dependent jobs: discover sources → transform chunks → build the searchable index → write an ingest report. Jobs must have completion artifacts so a re-run skips finished work. Reuse existing curated knowledge + user-upload ingest behavior. Out of scope: Airflow/Prefect/Dagster, Treasure Data, Hive/Presto analytics warehouse, event logging (those are Phase B), UI changes, new coaching modes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a full batch ingest as one dependent job chain (Priority: P1)

A builder (or reviewer) wants to rebuild the coaching knowledge index as a **batch job**, not by calling one monolithic script they cannot explain in an interview. They start a single top-level ingest run. The system executes ordered steps: (1) discover knowledge sources, (2) turn them into chunks, (3) build the searchable index the coach already uses, (4) write a run report. Later steps do not start until earlier steps have produced their completion artifacts. The existing coaching API still reads the same index location after a successful run.

**Why this priority**: This is the demoable Phase A slice. Without a real dependent batch chain, the project still looks like a RAG app, not a batch-processing intern portfolio.

**Independent Test**: From a clean pipeline-output directory, start the top-level ingest run against the starter knowledge library (hash embedder is enough). Confirm each step produced a completion artifact, the coach index exists, and the report lists source and chunk counts greater than zero. No analytics warehouse or UI is required.

**Acceptance Scenarios**:

1. **Given** the starter knowledge library is present and pipeline outputs are empty, **When** the operator starts the top-level ingest run, **Then** discovery, chunking, index build, and report jobs all complete in that order and the searchable index is available at the same location the coaching API already uses.
2. **Given** a successful ingest run, **When** the operator inspects completion artifacts, **Then** each job has a durable output (file or equivalent) that marks it complete, and the report job’s artifact exists only after the index job succeeded.
3. **Given** the ingest chain finished successfully, **When** the coaching API retrieves from the index, **Then** it can still cite curated starter guides (no change to coaching product behavior).
4. **Given** no knowledge sources exist, **When** the operator starts the ingest run, **Then** the chain fails at the discovery or transform step with a clear error and does not pretend to have built an index.

---

### User Story 2 - Re-run skips completed jobs (Priority: P2)

The operator runs the same ingest again without changing sources. Jobs that already have valid completion artifacts are not redone. If they need a full rebuild, they clear those artifacts (or pass a documented force-rebuild action) and the whole chain runs again.

**Why this priority**: Idempotent re-runs are the Luigi/batch skill interviewers ask about (`requires` / `output`). It is independently demoable once Story 1 works.

**Independent Test**: Complete one successful run. Start the same top-level job again without deleting outputs. Confirm already-complete jobs are skipped. Then force a rebuild and confirm jobs run again.

**Acceptance Scenarios**:

1. **Given** a successful prior run and unchanged knowledge sources, **When** the operator starts the same ingest again, **Then** jobs whose completion artifacts already exist are skipped rather than recomputing from scratch.
2. **Given** the operator has cleared pipeline completion artifacts (or requested a documented full rebuild), **When** they start ingest, **Then** all jobs in the chain run again and produce new artifacts.
3. **Given** only the final report artifact is missing but earlier artifacts remain, **When** the operator starts the top-level run, **Then** only the report job (and any missing upstream jobs) run; completed upstream jobs stay skipped.

---

### User Story 3 - Read an ingest report with counts and skipped files (Priority: P3)

After a run, the operator opens a report that states how many source files were discovered, how many chunks were produced, how many files were skipped as unreadable, and whether the run succeeded. Unreadable individual uploads do not abort the whole batch if at least one valid source produced chunks (same skip behavior as today’s ingest).

**Why this priority**: A report is the artifact a reviewer can screenshot for a CV; it is not required to prove the chain itself.

**Independent Test**: Run ingest on the starter library; open the report and match source/chunk counts to the built index. Add one unreadable file under uploads; confirm it is counted as skipped and the run still succeeds.

**Acceptance Scenarios**:

1. **Given** a successful run on the starter library, **When** the operator opens the ingest report, **Then** they see at least: source-file count, chunk count, skipped-file count, and a success indicator.
2. **Given** one unreadable upload alongside valid knowledge files, **When** ingest runs, **Then** the unreadable file is listed or counted as skipped, valid sources are still indexed, and the run is marked successful.
3. **Given** every source is unreadable or empty, **When** ingest runs, **Then** the run fails and the report (if written) does not claim a successful index.

---

### User Story 4 - Document how to run the batch chain for a reviewer (Priority: P4)

A hiring reviewer (or the builder preparing a CV) can follow README instructions to install, run the batch ingest with a local scheduler, and see the job chain plus the report without reading source code first.

**Why this priority**: Demo/docs for the intern application. Product behavior is already covered by P1–P3.

**Independent Test**: Follow README steps in a fresh venv using the hash embedder; complete a run and locate the report in under ten minutes.

**Acceptance Scenarios**:

1. **Given** the README batch section, **When** a reviewer copies the documented commands, **Then** they can run the full ingest chain with a local scheduler and find the report path named in the docs.
2. **Given** the README, **When** a reviewer looks for stack mapping, **Then** they can see that this slice is **batch ingest with dependent jobs** (Phase A) and that warehouse-style analytics are explicitly later (Phase B).

---

### Edge Cases

- Knowledge directory missing or empty and uploads empty: fail clearly; do not write a successful index.
- Individual unreadable upload: skip that file; continue; count it in the report.
- File with no extractable chunks: skip; do not crash the chain if other files produced chunks.
- Operator deletes the search index but leaves pipeline completion artifacts: documented rebuild/force path must be able to recreate the index (do not leave the coach on a missing index while jobs claim “already done” with no way to recover).
- Concurrent two ingest runs: out of scope for Phase A; last-writer-wins is acceptable; document that operators run one chain at a time.
- MiniLM vs hash embedder: tests and CI use hash; operator may use MiniLM locally. Report should record which embedder name was used when known.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The operator MUST be able to start a full knowledge ingest as **one top-level batch run** that executes an ordered chain of jobs (discover sources → transform chunks → build index → write report).
- **FR-002**: Each job MUST declare what it depends on and what completion artifact it produces so later jobs cannot start before earlier artifacts exist.
- **FR-003**: A re-run MUST skip jobs whose completion artifacts already exist, unless the operator requests a documented full rebuild or has removed those artifacts.
- **FR-004**: The index job MUST write the searchable index to the **same location** the coaching API already uses, preserving current retrieve/citation behavior.
- **FR-005**: Source discovery MUST include curated knowledge files and user uploads using the same eligibility rules as the existing ingest (allowed extensions; ignore dotfiles).
- **FR-006**: Unreadable individual files MUST be skipped rather than failing the entire run, provided at least one valid chunk is produced; if zero chunks are produced, the run MUST fail.
- **FR-007**: The report MUST include source-file count, chunk count, skipped-file count, success/failure, and embedder name when available. It MUST be a durable file the operator can open without the coaching UI.
- **FR-008**: Existing one-shot ingest entry point MAY remain, but the **dependent job chain** MUST be the documented batch path for this feature (not a hidden script).
- **FR-009**: Automated tests MUST cover: (a) job dependency order, (b) skip-on-complete on second run, (c) report counts on a tiny fixture corpus, (d) empty corpus failure. Tests MUST NOT require a paid LLM or downloading MiniLM.
- **FR-010**: README MUST document the exact local-scheduler command, output locations, how to force a rebuild, and that Phase B (analytics SQL) is out of this slice.
- **FR-011**: This slice MUST NOT add a second orchestrator, a warehouse, event logging, analytical SQL jobs, or new coaching API endpoints.
- **FR-012**: Coaching safety, RAG grounding, and UI behavior MUST remain unchanged.

### Key Entities

- **BatchRun**: One operator-triggered ingest chain; has a start time, embedder name, success flag, and pointers to job artifacts.
- **SourceManifest**: List of discovered knowledge files (curated + uploads) with path, kind, and a content fingerprint used to reason about rebuilds.
- **ChunkRecord**: One embeddable slice (chunk id, source id, title, heading, text, path) produced by the transform job.
- **IndexArtifact**: The searchable vector index plus sidecar metadata consumed by the coach.
- **IngestReport**: Operator-facing summary: counts, skipped files, success, embedder, artifact paths.
- **JobCompletionArtifact**: Durable marker that a given job finished; presence allows skip-on-re-run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer following README can complete a full batch ingest of the starter library and open the report in under 10 minutes (hash embedder, local machine).
- **SC-002**: 100% of automated tests for this slice pass without a network LLM and without MiniLM weights.
- **SC-003**: On a second run with unchanged sources and intact completion artifacts, at least the discovery and transform jobs are skipped (operator can observe skip vs re-execute).
- **SC-004**: After a successful run, chunk count in the report equals the number of records in the index sidecar (no silent mismatch).
- **SC-005**: Coaching Q&A still returns citations from starter guides after switching ingest to the batch chain (no product regression on a smoke ask).
- **SC-006**: Empty corpus fails the run in 100% of reviewed attempts; it never publishes a “successful” empty index as a completed report success.

## Assumptions

- **Orchestrator**: Phase A uses **Luigi** (Spotify) with `--local-scheduler` only. No Luigi central planner daemon, no cloud scheduler. Chosen to match DAC intern JD (Luigi + batch), not because the product needs a new UI.
- **Reuse**: Chunking, extraction, embedding, and FAISS save logic stay in the existing RAG ingest modules; Luigi tasks **orchestrate** them. Do not reimplement chunkers inside task files.
- **Embedder**: Tests use `DATING_COACH_EMBEDDER=hash`. Operators may use MiniLM after extra install.
- **Single operator**: Local laptop / intern demo. No multi-tenant locking.
- **Phase B out of scope**: Date-partitioned event lake, Hive/Presto-style SQL, Treasure Data, dbt, dashboards.
- **Force rebuild**: Clearing `data/pipeline/` (or a documented `--force` flag) is sufficient; content-hash-parameterized target paths are a nice-to-have, not required if force-rebuild is documented and tests cover skip + rebuild.
- **Languages**: Code and identifiers English; README may include a short Vietnamese note for the builder; job/report field names English.
- **No new coaching features, no UI.**

## Out of Scope

- Airflow, Prefect, Dagster, Spark, Kubernetes
- Treasure Data account, Hive, Presto/Trino warehouse
- Coach API event logging / analytics marts
- Changing upload UI or coaching endpoints
- Scheduling cron in production
- Concurrent ingest locking
