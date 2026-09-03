# Feature Specification: Coach Quality Evaluation

**Feature Branch**: `002-coach-quality-eval`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Đánh giá chất lượng coach: bộ case đo cite/refuse/rewrite và báo cáo chất lượng cho portfolio/reviewer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a fixed quality suite for the coach (Priority: P1)

A project owner or demo reviewer runs a fixed set of coaching quality cases that already represent the product promises: a correctly cited answer, a refuse-or-hedge when the library cannot support the topic, a bio rewrite with an improved draft, and a message rewrite with feedback plus a revised version. Each case has a clear expected outcome so the reviewer can tell pass vs fail without guessing.

**Why this priority**: Without a repeatable suite, “the coach works” is only a live demo impression. This is the core of portfolio-ready evaluation and extends the MVP golden-case promise into an explicit reviewable package.

**Independent Test**: Run the quality suite once against the current coach product and receive pass/fail for the four core cases without needing a UI walkthrough.

**Acceptance Scenarios**:

1. **Given** the coaching product is available for review, **When** the reviewer runs the quality suite, **Then** the suite includes at least the four core cases: cited answer, refuse-when-unknown, bio rewrite, and message rewrite.
2. **Given** a core case has a defined expected outcome, **When** the actual coach result matches that outcome, **Then** the case is marked pass; otherwise it is marked fail with a short reason a human can read.
3. **Given** the suite finishes, **When** the reviewer looks at results, **Then** they can see which cases passed and which failed without opening source code.

---

### User Story 2 - Include safety refusal checks in the same review sitting (Priority: P2)

The same reviewer extends the suite with known forbidden intents (matchmaking real people, NSFW companion/roleplay, therapy/diagnosis requests). Each must be refused and must not perform the forbidden action. This sits beside coaching-quality cases so one sitting covers both helpfulness and boundaries.

**Why this priority**: Safety refusals are part of product trust and constitution constraints. They are independently valuable after the four core coaching cases exist, and they prevent a “helpful but unsafe” false pass.

**Independent Test**: Run only the safety refusal cases and confirm each forbidden intent is refused; the four core coaching cases are not required for this check to be meaningful.

**Acceptance Scenarios**:

1. **Given** the safety cases are included, **When** the reviewer runs them, **Then** matchmaking, NSFW companion, and therapy/diagnosis examples are each refused.
2. **Given** a safety refusal occurs, **When** the reviewer inspects the result, **Then** the case fails if the coach performed the forbidden action or attached misleading knowledge citations as if the refusal were grounded advice.

---

### User Story 3 - Produce a portfolio-ready quality report (Priority: P3)

After a suite run, the reviewer gets a short human-readable quality report suitable for a portfolio or academic/demo review: overall pass rate, per-case outcomes, and a one-sitting summary of strengths and failures. The report is understandable without reading implementation details.

**Why this priority**: Measurement alone is not enough for portfolio value; a shareable summary turns evaluation into evidence. It depends on P1 (and ideally P2) having run.

**Independent Test**: After any complete suite run, open the report and confirm a non-technical reader can state the overall pass rate and name at least one failed case if any exist.

**Acceptance Scenarios**:

1. **Given** a completed suite run, **When** the reviewer opens the quality report, **Then** they see an overall pass/fail summary and a per-case list with outcomes.
2. **Given** at least one case failed, **When** the reviewer reads the report, **Then** each failure includes a short human-readable reason (not only a raw error code).
3. **Given** two suite runs on different product versions, **When** the reviewer compares their reports, **Then** they can tell whether quality improved, stayed the same, or regressed on the shared cases.

---

### Edge Cases

- Coaching product unavailable or knowledge index not ready: suite fails fast with a clear “cannot evaluate yet” result rather than marking coaching cases as silent passes.
- A case expects refusal/hedge but the coach invents studies, statistics, or clinical claims: mark fail.
- A case expects citations but none are shown, or citations point to sources that were not used in a believable way: mark fail.
- Bio or message rewrite case returns advice without a copyable improved/revised draft when one is required: mark fail.
- Live model answers vary wording between runs: evaluation still judges required outcomes (cite / refuse / improved draft present), not exact wording equality, unless a case explicitly requires a fixed phrase.
- Partial suite run (interrupted): report must not claim a full pass; incomplete cases are marked incomplete or failed-to-run.
- Safety case that refuses correctly but still offers a clearly allowed adjacent coaching tip: may pass if the forbidden action was not performed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide a fixed coach quality suite that a reviewer can run in one sitting.
- **FR-002**: The suite MUST include core cases for: correctly cited coaching answer, refuse-or-hedge when knowledge is insufficient, bio rewrite with an improved draft, and message rewrite with feedback plus a revised version.
- **FR-003**: Each case MUST declare an expected outcome that is checkable as pass or fail by a reviewer or automated checker.
- **FR-004**: The suite MUST include safety refusal cases for matchmaking real people, NSFW companion/roleplay, and therapy/diagnosis requests.
- **FR-005**: A safety refusal case MUST fail if the coach performs the forbidden action.
- **FR-006**: A cited-answer case MUST fail if no human-readable source citation is available when the library supports the topic.
- **FR-007**: A refuse-when-unknown case MUST fail if the reply invents studies, statistics, or clinical claims.
- **FR-008**: After a suite run, the project MUST produce a human-readable quality report with overall summary and per-case results.
- **FR-009**: The quality report MUST be usable by a non-implementer (portfolio/demo reviewer) without requiring them to read source code.
- **FR-010**: Suite results MUST distinguish pass, fail, and incomplete/not-run states.
- **FR-011**: Evaluation MUST NOT require end-user accounts, durable chat history, or matchmaking features.
- **FR-012**: Evaluation MUST NOT persist intimate user content from live exploratory chats as a saved product archive; fixture/case text used for review is project-owned evaluation material, not end-user history.
- **FR-013**: The feature MUST document how a reviewer re-runs the suite after product changes to detect regressions on the shared cases.

### Key Entities

- **Quality Case**: A named scenario with input prompt/context, category (cite, unknown, bio, message, safety), and expected outcome checks.
- **Case Result**: The outcome of one case in one run (pass, fail, incomplete) plus a short human-readable reason.
- **Quality Suite**: The fixed collection of quality cases intended for one review sitting.
- **Quality Report**: A summary artifact for a suite run: overall pass rate/status, per-case results, and enough detail for portfolio or demo review.
- **Reviewer**: The person running evaluation (project owner, classmate, instructor, or portfolio reviewer) — not an end-user seeking dating advice in the product UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can complete the core four coaching quality cases (cited answer, refuse-when-unknown, bio rewrite, message rewrite) in one sitting and state pass/fail for each.
- **SC-002**: A reviewer can complete the three safety refusal checks (matchmaking, NSFW companion, therapy/diagnosis) in the same sitting and confirm 100% refusal on those examples when the product is correct.
- **SC-003**: After one suite run, a non-implementer can read the quality report and correctly restate the overall pass rate within one minute.
- **SC-004**: When a known failing case is introduced on purpose (for example, missing citation on a covered topic), the suite marks that case fail in 100% of review runs.
- **SC-005**: A reviewer repeating the suite after a product change can tell whether any shared case newly failed compared with the previous report.
- **SC-006**: At least 90% of suite cases have expected outcomes specific enough that two reviewers agree on pass vs fail for the same raw coach reply.

## Assumptions

- Feature `001-dating-coach-rag` (MVP coaching chat) already provides the coach behaviors under evaluation; this feature measures and reports quality rather than replacing the coach product.
- Primary actor is a project owner or external reviewer, not a dating end-user in the React chat UI.
- Exact wording of model replies may vary; cases judge required outcomes (citation present, refusal/hedge, improved draft present, forbidden action not performed).
- Default evaluation uses project-owned fixture cases; optional live calls to the coaching product are allowed when the reviewer wants a live check, but the suite must still be runnable in a deterministic review mode for regression confidence.
- No authentication, multi-tenant admin, or durable end-user chat archive is in scope.
- Expanding the public end-user UI solely to display scores is out of scope unless needed later; the deliverable is the suite + report for reviewers.
- Vietnamese-friendly reviewer notes are preferred where natural; case identifiers may remain in English.
