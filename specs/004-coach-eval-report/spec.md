# Feature Specification: Coach Eval Report & Retrieval Quality

**Feature Branch**: `004-coach-eval-report`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Eval dashboard + retrieval quality trên Dating Coach để gây ấn tượng AI Engineering; áp dụng vào dự án hiện tại."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a fixed coach quality suite with a readable report (Priority: P1)

A portfolio reviewer runs one command and gets pass/fail for core dating-coach promises: cited answer, refuse-when-unknown, bio rewrite, message rewrite, plus safety refusals (matchmaking, NSFW companion, therapy) and profile-context refusals (scrape, private, matchmaking). Results appear in a Markdown report with overall pass rate.

**Independent Test**: Run the eval command with mocked LLM; open the report and read pass rate + per-case outcomes without reading source.

### User Story 2 - Measure retrieval Hit@k / MRR on dating queries (Priority: P2)

The same reviewer runs a fixed set of dating-domain queries against the local FAISS index and sees Hit@k and MRR, with expected knowledge source ids (bio, openers, pacing, boundaries, red flags, public-profile guide). Hash embedder always runs; MiniLM compared when the optional embed extra is installed.

**Independent Test**: Run retrieval eval alone; report shows metrics per query and a summary table.

### User Story 3 - Document how to re-run after product changes (Priority: P3)

README and the report explain how to re-run the suite after coaching changes to catch regressions.

**Independent Test**: A new contributor follows README steps and regenerates `docs/EVAL.md` successfully.

## Requirements *(mandatory)*

- **FR-001**: Provide a CLI-runnable quality suite for the dating coach.
- **FR-002**: Suite MUST cover cite, refuse-unknown, bio rewrite, message rewrite.
- **FR-003**: Suite MUST cover safety refusals: matchmaking, NSFW companion, therapy.
- **FR-004**: Suite MUST cover profile-context refusals: scrape Instagram, private account, matchmaking-with-bio.
- **FR-005**: Produce a human-readable Markdown report with overall pass rate and per-case reasons.
- **FR-006**: Provide a fixed retrieval gold set (≥15 dating queries) with expected `source_id`s.
- **FR-007**: Report Hit@k (k=4) and MRR for the retrieval gold set.
- **FR-008**: Default eval mode MUST be deterministic (mocked LLM for generate paths); live LLM optional and off by default.
- **FR-009**: Document re-run steps in README.

## Success Criteria *(mandatory)*

- **SC-001**: Reviewer completes quality suite in one sitting and states overall pass rate within one minute of reading the report.
- **SC-002**: Safety/profile refusal examples refuse in 100% of deterministic suite runs when product is correct.
- **SC-003**: Retrieval report includes Hit@4 and MRR for the gold set.
- **SC-004**: Intentional missing-citation failure is marked fail when introduced.
- **SC-005**: Re-running after a change produces a comparable report for regression spotting.

## Assumptions

- Builds on shipped 001 + 003 coaching behaviors; this slice measures and reports, it does not replace the coach UI.
- Extends the intent of `002-coach-quality-eval` with an executable report and retrieval metrics.
- No end-user accounts; fixture text is project-owned evaluation material.
