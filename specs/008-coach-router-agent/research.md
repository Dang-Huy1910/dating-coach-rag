# Research: Coach Router Agent (P1)

**Branch**: `008-coach-router-agent` | **Date**: 2026-09-08

All Technical Context items resolved. No remaining NEEDS CLARIFICATION.

---

## Decision 1: Additive `/agent` resource (do not overload `/ask`)

**Decision**: `POST /v1/sessions/{session_id}/agent` with body `{ "message": string, "stream": bool = false }`. Response is the existing `CoachReply`; `intent` is the **routed** capability.

**Rationale**: `/ask` is contracted as `intent=ask`. Changing it would break contract/golden tests and blur dedicated vs routed behavior. An additive resource keeps 001–007 clients stable (constitution III, YAGNI on breakage).

**Alternatives considered**:
- `POST /ask` + `route: true` — ambiguous contract; existing clients must learn a flag.
- Replace `/ask` entirely — breaks dedicated Ask semantics and tests.
- One endpoint per routed intent from the UI — that is today’s product; it does not deliver FR-001.

---

## Decision 2: Constrained LLM classifier, then exactly one `handle()` call

**Decision**: After `safety.screen`, call `complete()` with a short JSON-only prompt that returns `{ "intent": "<enum>", "needs_draft": bool }`. Allowlist the five existing intents. Invalid/missing JSON → `ask`. Then call `handle()` **once** with that intent and the same `extra` strings the dedicated endpoints already pass.

**Rationale**: Vietnamese mixed with pasted drafts is brittle for regex-only routing. A constrained enum avoids invented tools. One `handle()` call is the P1 definition (FR-002, FR-018). Reusing `handle()` preserves RAG, citations, hedge, and session turns.

**Alternatives considered**:
- Regex/keyword router only — cheap but fails on “bio này nhạt quá, góp ý” vs “sửa giúp: …”.
- LangGraph / tool-calling loop — that is P2; violates constitution V for this slice.
- Fine-tuned classifier model — out of scope (001 non-goal).
- Browser-side classification — violates constitution III.

---

## Decision 3: Safety before classify

**Decision**: `safety.screen(message)` first. If blocked → `_refusal_reply(intent="ask")` (or the screened category’s existing copy) with empty citations. Do **not** classify into rewrite/openers.

**Rationale**: FR-004. A “sửa tin nhắn này cho gian dối hơn” must not become `analyze_message` with a helpful draft.

**Alternatives considered**:
- Classify first, then safety inside `handle()` — `handle()` already screens, but a classifier might still “helpfully” pick rewrite. Screening twice is cheap; skip classify on block so tests can assert no generate-for-advice.

---

## Decision 4: Missing draft is a 200 coach ask-to-paste, not a 400 form error

**Decision**: If classifier returns `rewrite_bio` / `analyze_message` / `openers` / `profile_context` with `needs_draft=true` (or equivalent “no usable paste”), return **200** `CoachReply` asking the user to paste, `intent` = chosen capability, `improved_draft`/`openers` null, no invented content. Empty/whitespace unified message remains **400** `empty_input` like other coaching posts.

**Rationale**: Unified chat is not a form. 400 is right for blank send; “sửa bio giúp” with no bio should stay in the thread (FR-010, US2.3). Dedicated Bio Studio can keep 400 for empty `draft`.

**Alternatives considered**:
- 400 `empty_input` for missing draft — fights chat UX; user thinks the send failed.
- Fall through to `ask` — hides that the coach understood the job (FR-012).

---

## Decision 5: Ask Coach UI is the unified chat

**Decision**: `AskCoachView` calls `/agent` instead of `/ask`. Show a Vietnamese capability label from `reply.intent`. Dedicated Bio/Message/Openers/Profile views keep their current clients. No new nav item.

**Rationale**: FR-001 + FR-013. Users already treat “Hỏi coach” as the free-form box. A second “Agent” tab is extra UI (YAGNI).

**Alternatives considered**:
- New “Coach Agent” mode — extra navigation, splits the chat.
- Route inside every dedicated view — out of P1 scope; those views already know their intent.

---

## Decision 6: Profile-context from unified chat is paste-only; optional public URL

**Decision**: If routed `profile_context`, build `ProfileContextRequest(visible_text=message, question=message)`. If the message contains a YouTube/Reddit URL, reuse `fetch_public_profile` the same way the dedicated endpoint does. Instagram/TikTok URLs remain labels. No screenshots on this path. Handle/URL-only with no paste → ask-to-paste (Decision 4), never a live Instagram load.

**Rationale**: Matches 003 paste-only rules and US4. Screenshots stay on the dedicated form.

**Alternatives considered**:
- Never route `profile_context` in P1 — simpler, but FR-009 allows it when the paste is already in the message.
- Upload images on `/agent` — YAGNI; dedicated form exists.

---

## Decision 7: Streaming

**Decision**: Accept `stream` on the wire for symmetry with `/ask`, but P1 JSON is the test surface. If `stream=true`, reuse the same SSE event names as `/ask` (`citation`, `token`/`refusal`, `done`) after routing completes. Do not stream classifier tokens.

**Rationale**: Ask Coach today uses JSON (`api.askCoach`). Keep tests on JSON. Optional SSE must not invent a new event protocol.

**Alternatives considered**:
- No stream field — fine, but `/ask` already has it; copying the flag avoids a later contract break.
- Stream the classifier — user-visible noise; out of P1.

---

## Decision 8: Evaluation

**Decision**: Golden routing cases with **stubbed** classifier JSON plus stubbed `complete()` for generate. Contract tests for `/agent` shape, 404, empty, safety refuse, and `intent` on known stubs. Unit tests for allowlist, invalid JSON → `ask`, safety short-circuit, `needs_draft`. Do not require a live LLM in CI.

**Rationale**: Same pattern as 001/003. SC-002 is a reviewer sitting; CI proves wiring.

---

## Dependencies

- Existing `handle()`, `safety.screen`, dedicated `extra` strings in `backend/app/api/router.py`, `CoachReply`, session store, Ask Coach view.
- Index readiness: agent path must raise/return the same “library not ready” as `/ask`.
