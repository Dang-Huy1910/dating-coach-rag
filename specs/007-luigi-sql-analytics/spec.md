# Feature Specification: Batch Usage Analytics (Phase B)

**Feature Branch**: `007-luigi-sql-analytics`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Phase B for DAC intern CV: Luigi batch SQL analytics on coach usage, analogous to Hive + Presto on Treasure Data. Date-partitioned event lake. Hive-style daily aggregate table. Presto-style explore query. Export CSV. Seed data so the chain runs locally without live traffic. Optional metric events from the coaching API with no message/bio text. No Airflow, no real Treasure Data account, no UI dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a batch analytics chain on usage events (Priority: P1)

An operator (builder or hiring reviewer) wants to show **batch analytics**, not only knowledge ingest. They load a small set of coach-usage events (seeded is enough), partitioned by calendar day. They start one top-level analytics run. The system (1) builds a **daily summary table** with batch SQL (counts and rates by day and intent — the “heavy aggregate” step), (2) runs a **follow-up analytic query** on that table (the “ad-hoc explore” step), (3) writes a CSV the operator can open. Later steps wait on earlier completion artifacts.

**Why this priority**: This is the DAC-shaped slice: batch SQL jobs in a dependent chain. Without it, Phase A only proves ingest orchestration.

**Independent Test**: Seed a fixture of events spanning at least two calendar days and more than one intent, including at least one refused turn. Run the top-level analytics job. Confirm a daily summary exists, an explore result exists, and a CSV opens with matching totals. No live chatbot session required.

**Acceptance Scenarios**:

1. **Given** seeded usage events for at least two days, **When** the operator starts the top-level analytics run, **Then** the daily-summary job completes before the explore job, and both produce durable outputs plus a CSV export.
2. **Given** a successful run, **When** the operator opens the CSV, **Then** they can see metrics grouped by day and intent, including event counts and a refusal rate, and row totals are consistent with the seeded events.
3. **Given** no usage events exist, **When** the operator starts analytics without seeding, **Then** the chain fails with a clear error and does not write a successful empty summary presented as success.

---

### User Story 2 - Re-run skips completed analytics jobs (Priority: P2)

The operator runs analytics again with the same event lake and intact completion artifacts. Finished jobs are skipped. A documented full rebuild clears artifacts and reruns the chain.

**Why this priority**: Same Luigi skill as Phase A, now on SQL jobs — interviewers ask if aggregates are idempotent.

**Independent Test**: Complete one successful analytics run. Run again; confirm skip. Force rebuild; confirm jobs run again.

**Acceptance Scenarios**:

1. **Given** a successful prior analytics run and unchanged events, **When** the operator starts the same run again, **Then** jobs whose completion artifacts exist are skipped.
2. **Given** the operator requested a documented full rebuild, **When** they start analytics, **Then** summary, explore, and export jobs run again.
3. **Given** only the CSV/export artifact is missing, **When** they start the top-level run, **Then** completed upstream SQL jobs stay skipped and only the missing export is redone.

---

### User Story 3 - Record usage metrics without storing message text (Priority: P3)

When someone uses the local coaching API (ask, bio, message, openers, profile-context), the system **may append a usage event** for analytics: time, intent, refused/hedged, citation count, latency. It MUST NOT store the user’s bio, message draft, question text, or pasted profile content. Seeded demo events follow the same rule (synthetic ids only).

**Why this priority**: Makes the lake “real” for a local demo; privacy is non-negotiable. The SQL chain (P1) must work from seed alone if the API is never started.

**Independent Test**: Seed-only path never includes a `text`/`body`/`prompt` field. Optional: one mocked API coach call appends one event with intent + refused flag and no user text.

**Acceptance Scenarios**:

1. **Given** a seeded event file, **When** a reviewer inspects event fields, **Then** they see operational metrics (day, intent, refused, citation count, latency) and do **not** see user-authored message or bio text.
2. **Given** the coaching API handles a turn (when this hook is enabled), **When** the reply is returned, **Then** one usage event is appended for that calendar day with the turn’s intent and refuse/hedge flags.
3. **Given** event append fails (disk error), **When** the user asks the coach, **Then** the coaching reply still succeeds; analytics failure must not break the product path.

---

### User Story 4 - Document the analytics chain for a reviewer (Priority: P4)

A reviewer can follow README: seed events, run the analytics batch locally, open the CSV, and see that this slice maps to **batch aggregate then ad-hoc query** (Hive-style then Presto-style), with warehouse analytics as local files — not a cloud account.

**Why this priority**: CV/demo. Product SQL behavior is covered by P1–P3.

**Independent Test**: Follow README seed + run; open the CSV in under ten minutes without reading source.

**Acceptance Scenarios**:

1. **Given** the README analytics section, **When** a reviewer copies the documented commands, **Then** they can seed, run the chain with a local scheduler, and find the CSV path named in the docs.
2. **Given** the README, **When** they look for stack mapping, **Then** they see Phase A = knowledge ingest jobs, Phase B = usage-event SQL jobs, and a live Treasure Data cluster is **not** required.

---

### Edge Cases

- Empty lake: fail clearly; no success CSV claiming zero-as-success unless explicitly an empty-but-valid seed (empty seed is a failure).
- Events for a single day only: chain still succeeds; CSV has one day.
- Duplicate seed: running seed twice must not corrupt metrics beyond a documented overwrite-or-append rule (prefer **overwrite seed partitions** so demos are reproducible).
- Mixed seed + live API events on the same day: allowed; aggregates count both; still no user text.
- Invalid event (missing intent or day): skip that row in aggregate; do not crash the whole job if other rows are valid; if **all** rows invalid, fail.
- Concurrent analytics runs: out of scope; one operator at a time.
- Timezone: partition day is **UTC date** of the event timestamp.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The operator MUST be able to start analytics as **one top-level batch run** that executes: build daily summary → run explore query on that summary → export CSV.
- **FR-002**: Each job MUST declare dependencies and a completion artifact so later jobs cannot start early; re-runs skip complete jobs unless a documented rebuild is requested.
- **FR-003**: Usage events MUST be stored **partitioned by calendar day** so a reviewer can point at a day’s folder/files.
- **FR-004**: The operator MUST be able to **seed** a deterministic demo lake (at least two days, multiple intents, at least one refusal) without calling a live LLM.
- **FR-005**: Daily summary MUST include, per day and intent: event count, refusal count, refusal rate, hedge count, average latency when latency is present.
- **FR-006**: The explore step MUST query the **summary table** (not re-scan raw events as the primary path) and feed the CSV export.
- **FR-007**: Event records MUST NOT persist user-authored content (question, bio, message draft, pasted profile, images).
- **FR-008**: Automated tests MUST cover: successful chain on a fixture lake, skip-on-complete, empty lake failure, and absence of user-text fields. Tests MUST NOT require network LLM.
- **FR-009**: README MUST document seed, run, `--force`, output paths, and Phase A vs Phase B. No claim of a production Treasure Data deployment.
- **FR-010**: This slice MUST NOT add a second orchestrator, a cloud warehouse account, a metrics UI, or new coaching advice behavior.
- **FR-011**: If the API emits events, a failure to write an event MUST NOT fail the user’s coaching request.
- **FR-012**: Batch SQL for the summary step and the explore step MUST live in **reviewable query files** (not only inline Python strings), so a reviewer can see “aggregate job” vs “ad-hoc job” as in a Hive-then-Presto workflow.

### Key Entities

- **UsageEvent**: One coaching turn’s operational metrics (id, timestamp, UTC day, session id, intent, refused, hedged, citation count, latency). No message body.
- **EventPartition**: All events for one UTC calendar day.
- **DailyIntentSummary**: Aggregated counts/rates for one day + one intent.
- **ExploreResult**: Rows from the follow-up query over the summary table.
- **AnalyticsExport**: CSV (and optional JSON summary) the operator opens.
- **JobCompletionArtifact**: Marker that a SQL/export job finished.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer following README can seed, run analytics, and open a CSV in under 10 minutes on a local machine (no cloud account).
- **SC-002**: 100% of automated tests for this slice pass without a network LLM.
- **SC-003**: On a second run with unchanged events and intact artifacts, at least the daily-summary job is skipped.
- **SC-004**: CSV event counts by day+intent match the seeded fixture (100% of reviewed runs).
- **SC-005**: Inspecting stored events finds **zero** fields that contain user message/bio/question text in the fixture and in the API-append path.
- **SC-006**: Empty lake fails the run in 100% of reviewed attempts.

## Assumptions

- **Orchestrator**: Luigi with `--local-scheduler`, same as Phase A. Chosen for DAC intern JD.
- **SQL engines (local analog)**: One embedded SQL engine runs (1) a **Hive-style** rebuild of a summary table from raw daily events and (2) a **Presto-style** SELECT on that table. Queries are separate `.sql` files labeled hive vs presto in comments/paths for interview mapping. No Treasure Data login.
- **Seed vs live**: Seed is the default demo. API metric append is in-scope but must not be required to pass P1 tests.
- **Privacy**: Events are operational telemetry, not a chat archive. Session id is an opaque UUID already used by the API.
- **Phase A unchanged**: Knowledge ingest Luigi chain stays; this is a **second** Luigi pipeline (analytics), not a rewrite of ingest.
- **No dashboard**: CSV + JSON is enough; no Grafana/Streamlit analytics page.
- **Languages**: Identifiers and SQL in English; README may include a short Vietnamese note.

## Out of Scope

- Treasure Data account, `luigi-td`, real HiveServer, Presto/Trino cluster
- Airflow, Spark, dbt Cloud, Postgres warehouse
- Storing or analyzing message contents
- Real-time streaming (Kafka)
- Production cron on a remote server
- New coaching features or React charts
