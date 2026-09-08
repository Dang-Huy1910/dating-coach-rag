# Feature Specification: Multi-Step Coach Agent (P2)

**Feature Branch**: `009-multi-step-agent`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "P2 multi-step coach agent: one natural-language message in the unified chat can run up to four existing coaching capabilities in order (for example rewrite a pasted bio then suggest openers). The user sees which steps ran. Safety screening happens before any step. Each step stays RAG-grounded. Dedicated mode screens remain. Copy-ready drafts remain for the user to paste elsewhere — the product does not send messages or publish bios. No multi-agent crew and no starting chat simulation from this chat."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Finish two jobs in one message (Priority: P1)

A demo user pastes a weak bio (or a message draft) into the unified chat and asks for **two** things in one sentence — for example “sửa bio này rồi gợi ý opener cho Tinder.” The coach completes **both** jobs in that same turn: an improved bio they can copy **and** at least two opener options. The user does not send a second message and does not open Bio Studio then Openers.

**Why this priority**: This is the P2 product gap after P1. P1 picked one job and left the rest as a follow-up. Users already type two jobs in one breath.

**Independent Test**: In Hỏi coach only, send a pasted bio plus “sửa rồi gợi ý opener.” Confirm one turn returns a copy-ready bio **and** at least two openers. A single-job P1 message is not required for this test.

**Acceptance Scenarios**:

1. **Given** a usable bio draft and a request to rewrite it **and** suggest openers, **When** the user sends that one unified-chat message, **Then** the same turn includes an improved bio they can copy and at least two distinct opener options.
2. **Given** a usable message draft and a request to analyze it **and** suggest a next reply or openers, **When** the user sends that one message, **Then** the same turn includes tone/clarity (and interpersonal risk when relevant), a revised draft, and at least two next-message or opener options.
3. **Given** two requested jobs where the second needs the first’s output (rewrite then openers), **When** the coach runs the turn, **Then** opener suggestions are based on the improved draft, not only the original weak paste.
4. **Given** the knowledge library covers the jobs, **When** both complete, **Then** the user can see source citations for material used (or a clear hedge if a step is weakly supported).

---

### User Story 2 - See the steps; one-job messages still work (Priority: P2)

After a multi-job turn, the user can tell **which coaching capabilities ran and in what order** (Vietnamese-friendly labels). A message that only asks one job still behaves as P1 (one capability, one badge). Dedicated Bio / Message / Openers / Profile screens still work as before.

**Why this priority**: Trust and non-regression. Multi-step must not hide the plan or break the P1 sitting.

**Independent Test**: Send a two-job message and confirm ordered step labels; send a general question and confirm a single general-ask step with no extra invented jobs; complete a Bio Studio rewrite on the dedicated screen.

**Acceptance Scenarios**:

1. **Given** a two-job unified-chat reply, **When** the user looks at that turn, **Then** they can see at least two human-readable capability labels in the order they ran.
2. **Given** a single general coaching question, **When** sent in the unified chat, **Then** the coach uses only general ask (no extra bio rewrite or opener list invented).
3. **Given** dedicated Bio / Message / Openers / Profile screens, **When** used as before, **Then** those paths still produce their existing outcomes and are not forced through a multi-step plan.
4. **Given** optional progressive delivery, **When** a multi-step turn is running, **Then** the user MAY see that a later step is in progress (for example “đang gợi ý opener”) instead of a frozen chat until everything is done.

---

### User Story 3 - Stop safely when a step cannot run (Priority: P3)

If the message is unsafe, the coach refuses **before** running any rewrite or opener step. If a specialized job is requested without a usable draft, the coach asks to paste and does **not** invent a bio/openers for the missing job. If the user names more jobs than the product will run in one turn, the coach runs the first allowed jobs up to the cap and says the rest can be a follow-up. Chat simulation is not started from this chat.

**Why this priority**: Multi-step must not become a way around safety or a hallucination engine.

**Independent Test**: Send a two-job scrape/matchmaking request and confirm a refusal with no drafts; send “sửa bio rồi viết opener” with no paste and confirm ask-to-paste without invented content; confirm a five-job wishlist stops after the allowed cap.

**Acceptance Scenarios**:

1. **Given** matchmaking, scrape, therapy, coercion, or NSFW-companion language in a multi-job message, **When** the user sends it, **Then** the coach refuses, attaches no knowledge citations, and does not produce a helpful deceptive draft or opener playbook.
2. **Given** two specialized jobs but no usable draft/context, **When** the user sends it, **Then** the coach asks them to paste what is missing and does not invent a bio or opener list.
3. **Given** more distinct coaching jobs than the one-turn cap, **When** the user lists them all, **Then** the coach runs at most that many, in a sensible order, and tells the user the remainder can be a follow-up.
4. **Given** a request to roleplay as the other person / start simulation, **When** sent in the unified chat, **Then** the coach does not start simulation; the dedicated simulation screen remains that path.

---

### Edge Cases

- Single-job messages: identical user-visible outcomes to P1 (one capability, copy-ready when that job produces it).
- Duplicate jobs in one message (“sửa bio, sửa bio”): run once.
- Second job does not apply after a refused or empty first step: skip it; do not invent.
- Weak retrieval on one step: that step hedges/refuses; later independent steps MAY still run if they do not depend on the failed step’s invented content.
- Index not ready: same as P1 — cannot generate advice; session stays up.
- Empty/whitespace message: reject as empty input; do not start a plan.
- Extremely long input: same length spirit as existing coaching paths.
- Mixed Vietnamese/English: reply in the language of the latest user message when practical; step labels Vietnamese-friendly.
- Safety refusals MUST NOT attach knowledge citations.
- Follow-up after a partial turn: the next message is a new plan (P1 or P2), using recent session turns as context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A user MUST be able to request two or more existing coaching jobs in **one** unified-chat message and receive the completed jobs in **that same turn**, without opening dedicated screens.
- **FR-002**: Allowed jobs remain the existing capabilities only: general ask, bio rewrite, message analysis, openers, public-profile coaching. No new coaching domain.
- **FR-003**: The coach MUST run at most **four** jobs in one turn, in a determined order, each job at most once.
- **FR-004**: Each job MUST use the same grounding, citation, hedge/refuse, disclaimer, and safety rules as that capability already uses. Chaining MUST NOT become an ungrounded free-form advisor.
- **FR-005**: Safety screening MUST run before **any** job. A blocked message MUST refuse the whole turn.
- **FR-006**: When a later job depends on an earlier rewrite (openers after bio rewrite or message analysis), the later job MUST use the improved draft when one exists.
- **FR-007**: A one-job message MUST keep P1 behavior (exactly one capability; no extra jobs invented).
- **FR-008**: The user MUST be able to see which jobs ran, in order, with Vietnamese-friendly labels.
- **FR-009**: If a required draft/context is missing, the coach MUST ask to paste it and MUST NOT invent that job’s deliverable. Later jobs that depend on the missing draft MUST NOT run.
- **FR-010**: Dedicated Bio, Message, Openers, Profile, Simulation, and Library paths MUST remain unchanged in behavior.
- **FR-011**: Chat simulation MUST NOT be started from the unified-chat multi-step path.
- **FR-012**: The coaching service remains the system of record. The chat client MUST NOT plan jobs or call a language model in the browser.
- **FR-013**: Copy-ready drafts and openers remain for the user to paste elsewhere. This feature MUST NOT send messages, publish a bio, or log into dating apps.
- **FR-014**: A reviewer MUST be able to run known examples covering: two-job bio+openers, one-job ask (P1 regression), safety refuse of a multi-job scrape/match request, missing-draft ask-to-paste, and over-cap truncation.
- **FR-015**: Session memory stays ephemeral by default. Multi-step MUST NOT create a people dossier.
- **FR-016**: Progressive status for in-flight steps is allowed (so the chat does not look frozen) but MUST NOT require a new transport as a user-visible product. JSON remains a valid complete-turn result.

### Key Entities

- **Job Plan**: The ordered list of existing coaching capabilities chosen for this one turn (1–4 items, unique).
- **Job Step**: One capability in that plan, with a user-visible label and an outcome (completed, skipped for missing draft, or refused).
- **Turn Outcome**: The combined coach reply for the turn: narrative, citations, optional improved draft, optional openers, disclaimer, and the step list.
- **Unified Chat Turn**: Unchanged sitting model; one user message still produces one coach reply object, now possibly multi-step.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a known “sửa bio rồi gợi ý opener” example with a pasted bio, one unified-chat turn returns both a copy-ready improved bio and at least two openers, without the user opening another screen.
- **SC-002**: On a labeled set of at least eight examples (two-job happy path, one-job ask, one-job rewrite, safety multi-job refuse, missing draft, over-cap, ambiguous single ask, analyze+next-message), a reviewer finds the expected jobs (or refusal) in at least 80% of cases.
- **SC-003**: A single general question still receives a cited general-ask reply and does **not** include an unsolicited improved bio or opener list in 100% of the known ask examples.
- **SC-004**: Known matchmaking/scrape/therapy examples that also ask for openers or rewrites refuse in 100% of those cases, with empty citations and no copy-ready deceptive draft.
- **SC-005**: On each multi-job reply, a reviewer can name the jobs that ran without reading server logs.
- **SC-006**: Dedicated Bio Studio happy path still completes in the same demo sitting as a multi-job unified-chat turn.
- **SC-007**: A reviewer can finish the primary P2 demo (one two-job message, including reading) in under five minutes on a typical laptop connection.

## Assumptions

- Built on shipped P1 (`/agent` unified chat). P2 extends that sitting; it does not add a second chatbot.
- Cap of four jobs per turn is enough for demo (rewrite + analyze + openers + ask, or similar). A fifth job is a follow-up, not a defect.
- Order: specialized drafts first (bio rewrite / message analysis / profile context), then openers, then general ask if still requested. Classifier may refine order when the user is explicit.
- “Depends on earlier output” applies to openers after a rewrite/analysis. Independent ask after a rewrite MAY still run.
- Copy-to-clipboard on generate is out of scope (user still taps Sao chép). Auto-send to dating apps is forbidden.
- No LangGraph / multi-agent crew. P2 is a **short ordered list of existing jobs**, not a planner-critic team.
- Evaluation uses mocked language models in CI; a live sitting is the reviewer demo.
- Vietnamese-friendly step labels reuse P1 mapping (Hỏi coach, Sửa bio, Phân tích tin nhắn, Gợi ý opener, Profile công khai).

## Out of Scope

- Multi-agent crews (separate planner, researcher, critic agents)
- Starting chat simulation from unified chat
- Removing dedicated screens
- Publishing bios or sending messages to real people / dating apps
- Auto-copy to clipboard without a user tap
- New knowledge corpus or second vector store
- Auth, payments, mobile apps, voice
- Browser-side planning
