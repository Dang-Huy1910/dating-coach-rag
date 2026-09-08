---
description: "Task list for Coach Router Agent (P1)"
---

# Tasks: Coach Router Agent (P1)

**Input**: Design documents from `/specs/008-coach-router-agent/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required (FR-017, constitution evaluation). Write failing tests before implementation in each story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/`, tests at repo `tests/`
- Frontend: `frontend/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Agent package scaffolding without behavior

- [X] T001 Create `backend/app/agent/__init__.py` exporting nothing yet (package marker)
- [X] T002 [P] Add empty `backend/app/agent/classify.py` and `backend/app/agent/run.py` modules with module docstrings pointing at specs/008-coach-router-agent/plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared request model, extras, classifier allowlist — no user-story routing yet

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Add `AgentRequest` (`message` 1–8000, `stream: bool = False`, extra fields forbidden) in `backend/app/models.py`
- [X] T004 Extract dedicated-path `extra` strings into `backend/app/agent/extras.py` (`REWRITE_BIO_EXTRA`, `ANALYZE_MESSAGE_EXTRA`, `OPENERS_EXTRA`, `PROFILE_CONTEXT_EXTRA` re-export) and switch `backend/app/api/router.py` dedicated endpoints to import them so agent and dedicated paths stay identical
- [X] T005 Implement allowlisted JSON parse + default-to-`ask` in `backend/app/agent/classify.py` (`ALLOWED_INTENTS`, `parse_classifier_json`, `RoutingDecision` dataclass matching `specs/008-coach-router-agent/data-model.md`)
- [X] T006 Implement `safety.screen` short-circuit then classifier `complete()` call in `backend/app/agent/classify.py` (`classify_message`); never return an intent outside the allowlist
- [X] T007 [P] Unit tests for allowlist, invalid JSON → `ask`, safety short-circuit (no classifier `complete` call) in `tests/unit/test_agent_classify.py`

**Checkpoint**: Foundation ready — `/agent` not wired yet; dedicated endpoints still pass

---

## Phase 3: User Story 1 - Ask without picking a mode (Priority: P1) 🎯 MVP

**Goal**: Unified chat sends a natural-language question to `/agent` and gets grounded `intent=ask` coaching

**Independent Test**: `POST /v1/sessions/{id}/agent` with a general question returns `intent=ask` and citations; Ask Coach UI uses this endpoint; `/ask` still works

### Tests for User Story 1

- [X] T008 [P] [US1] Contract tests in `tests/contract/test_agent.py`: session 404, whitespace 400, JSON shape, `intent=ask` with stubbed classifier+`complete`, index-not-ready 400
- [X] T009 [P] [US1] Golden ask-via-agent case in `tests/golden/test_agent_golden.py` (mocked LLM; cited reply; refuse-when-unknown still holds)

### Implementation for User Story 1

- [X] T010 [US1] Implement `run_agent()` in `backend/app/agent/run.py`: empty handled by API; safety/classify; if `ask` and not `needs_draft`, call `handle(..., intent="ask")`; emit usage with routed intent
- [X] T011 [US1] Add `POST /v1/sessions/{session_id}/agent` in `backend/app/api/router.py` (JSON default; optional SSE with same event names as `/ask` after routing; reuse `_require_text` / `_session_or_404` / `_emit_reply` / IndexNotReadyError / LLMProviderError)
- [X] T012 [US1] Add `askAgent(sessionId, message)` in `frontend/src/api/client.ts` and `AgentRequest` in `frontend/src/api/types.ts`
- [X] T013 [US1] Switch `frontend/src/views/AskCoachView.tsx` to call `askAgent` instead of `askCoach`; keep empty-input client check; copy still Vietnamese
- [X] T014 [US1] Confirm dedicated `POST /v1/sessions/{id}/ask` is unchanged (existing `tests/contract/test_ask.py` still passes)

**Checkpoint**: Hỏi coach is unified chat for general ask; MVP demoable

---

## Phase 4: User Story 2 - Route bio rewrite and message analysis (Priority: P2)

**Goal**: Same `/agent` turn can become `rewrite_bio` or `analyze_message` with dedicated extras; missing draft asks to paste (200)

**Independent Test**: Stub classifier `rewrite_bio` with a pasted bio → `improved_draft`; stub `analyze_message` → tone/clarity/risk; “sửa bio giúp” with no paste → hedged ask-to-paste

### Tests for User Story 2

- [X] T015 [P] [US2] Contract cases in `tests/contract/test_agent.py` for routed rewrite, routed analyze, and needs-draft 200 (`hedged=true`, null `improved_draft`)
- [X] T016 [P] [US2] Golden cases in `tests/golden/test_agent_golden.py` for bio rewrite and message analysis via agent
- [X] T017 [P] [US2] Unit cases in `tests/unit/test_agent_classify.py` for `needs_draft=true` on rewrite/analyze without a usable paste

### Implementation for User Story 2

- [X] T018 [US2] Extend `classify_message` / classifier prompt in `backend/app/agent/classify.py` so bio-rewrite and message-analysis requests set the matching intent and `needs_draft` when no draft is present
- [X] T019 [US2] In `backend/app/agent/run.py`, on `needs_draft` return a 200 Vietnamese ask-to-paste `CoachReply` (no generate); otherwise `handle()` with `REWRITE_BIO_EXTRA` / `ANALYZE_MESSAGE_EXTRA` from `backend/app/agent/extras.py`
- [X] T020 [US2] Ask Coach already uses `/agent` — ensure `CoachBubble` still shows `improved_draft` / analysis fields when `intent` is rewrite or analyze (reuse existing cards in `frontend/src/views/AskCoachView.tsx` if missing)

**Checkpoint**: Unified chat can rewrite a bio or analyze a message without opening those tabs

---

## Phase 5: User Story 3 - Route openers (Priority: P3)

**Goal**: Opener requests in unified chat return at least two options via existing openers path

**Independent Test**: Stub classifier `openers` → `openers` length ≥ 2; matchmaking still refused by safety before classify

### Tests for User Story 3

- [X] T021 [P] [US3] Contract + golden opener-via-agent cases in `tests/contract/test_agent.py` and `tests/golden/test_agent_golden.py`
- [X] T022 [P] [US3] Unit `needs_draft` when opener request has no context in `tests/unit/test_agent_classify.py`

### Implementation for User Story 3

- [X] T023 [US3] Classifier prompt/rules in `backend/app/agent/classify.py` for opener requests vs general ask
- [X] T024 [US3] `run_agent()` branch in `backend/app/agent/run.py` uses `OPENERS_EXTRA` and existing `handle(intent="openers")`; needs-draft asks for context

**Checkpoint**: Unified chat can suggest openers

---

## Phase 6: User Story 4 - Route public-profile coaching (Priority: P4)

**Goal**: Paste-in-message public-profile coaching via agent; URL-only / scrape still blocked or ask-to-paste

**Independent Test**: Pasted public bio + approach question → `intent=profile_context`; Instagram URL only → ask-to-paste; scrape language → refused

### Tests for User Story 4

- [X] T025 [P] [US4] Contract/golden cases in `tests/contract/test_agent.py` and `tests/golden/test_agent_golden.py` for profile-context paste, URL-only ask-to-paste, scrape refuse
- [X] T026 [P] [US4] Unit tests that agent profile path does not treat Instagram URLs as live fetches in `tests/unit/test_agent_classify.py` (and reuse `tests/unit/test_public_fetch.py` behavior)

### Implementation for User Story 4

- [X] T027 [US4] Classifier rules in `backend/app/agent/classify.py` for public-profile coaching vs rewriting the user’s own bio
- [X] T028 [US4] In `backend/app/agent/run.py`, build `ProfileContextRequest(visible_text=message)`; extract YouTube/Reddit URL if present and reuse `fetch_public_profile`; never fetch Instagram; call `handle(..., intent="profile_context", extra=PROFILE_CONTEXT_EXTRA, profile_request=...)`; needs-draft / need_visible_text → 200 ask-to-paste

**Checkpoint**: Unified chat can coach from a pasted public profile without the dedicated form; screenshots stay on the dedicated view

---

## Phase 7: User Story 5 - Show routed capability; keep dedicated screens (Priority: P5)

**Goal**: User-visible Vietnamese capability label; ambiguous → ask; dedicated screens unchanged; two-job messages use one capability

**Independent Test**: Badge visible on Ask Coach replies; Bio Studio still hits `/rewrite-bio`; ambiguous golden → `intent=ask`; existing contract tests for dedicated endpoints still pass

### Tests for User Story 5

- [X] T029 [P] [US5] Golden ambiguous → `ask` and two-job message still a single intent in `tests/golden/test_agent_golden.py`
- [X] T030 [P] [US5] Safety refuse via `/agent` (matchmaking, scrape, therapy) has empty citations in `tests/contract/test_agent.py`
- [X] T031 [US5] Run dedicated contract tests `tests/contract/test_ask.py`, `tests/contract/test_rewrite_bio.py`, `tests/contract/test_analyze_message.py`, `tests/contract/test_openers.py`, `tests/contract/test_profile_context.py` and fix any regressions from extras extraction

### Implementation for User Story 5

- [X] T032 [P] [US5] Add `frontend/src/components/RoutedIntentBadge.tsx` mapping intent → Vietnamese labels from `specs/008-coach-router-agent/data-model.md`
- [X] T033 [US5] Show the badge on each coach turn in `frontend/src/views/AskCoachView.tsx` (and subtitle on `frontend/src/components/CoachBubble.tsx` if that is the smallest hook)
- [X] T034 [US5] Update Hỏi coach header copy in `frontend/src/views/AskCoachView.tsx` so it is clear the user need not pick a specialized tab; do **not** add a new nav mode in `frontend/src/components/Header.tsx`
- [X] T035 [US5] Classifier fallback for ambiguous / two-job messages in `backend/app/agent/classify.py` (exactly one intent; prefer clearest job else `ask`)

**Checkpoint**: Transparency + non-regression of dedicated screens

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docs and full validation

- [X] T036 [P] Add a short “unified chat / P1 router” note to `README.md` and `docs/PRODUCT_BRIEF.md` (Ask Coach routes; dedicated tabs remain; no multi-step chaining)
- [X] T037 Run `pytest tests/unit/test_agent_classify.py tests/contract/test_agent.py tests/golden/test_agent_golden.py tests/contract/test_ask.py tests/contract/test_rewrite_bio.py tests/contract/test_analyze_message.py tests/contract/test_openers.py tests/contract/test_profile_context.py -q` and fix failures
- [X] T038 Walk `specs/008-coach-router-agent/quickstart.md` sitting against the running API (or document what could not be live-verified if no LLM key)
- [X] T039 Mark completed tasks `[X]` in `specs/008-coach-router-agent/tasks.md` as each task lands

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on US1 endpoint existing (`run_agent` + `/agent`)
- **US3 (Phase 5)**: Depends on US1 endpoint; can follow US2
- **US4 (Phase 6)**: Depends on US1 endpoint; can follow US3
- **US5 (Phase 7)**: Depends on US1 UI; badge after Ask Coach uses `/agent`
- **Polish (Phase 8)**: After desired stories (all for this slice)

### User Story Dependencies

- **US1**: After Phase 2 only — independently demoable
- **US2–US4**: Extend the same `/agent` resource; independently testable with stubbed classifier JSON
- **US5**: UI + fallback rules; dedicated screens must not regress

### Parallel Opportunities

- T002, T007, T008/T009, T015–T017, T021/T022, T025/T026, T029/T030, T032 can be parallel with non-overlapping files
- Solo implementer: sequential T001 → T039
- Same-file caution: `classify.py`, `run.py`, `router.py`, `test_agent.py`, `AskCoachView.tsx` are sequential choke points

---

## Parallel Example: User Story 1

```bash
# After T007:
Task: "Contract tests in tests/contract/test_agent.py"
Task: "Golden ask-via-agent in tests/golden/test_agent_golden.py"
# Then sequential: T010 run_agent → T011 endpoint → T012 client → T013 AskCoachView
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. Validate: pytest US1 tests + Ask Coach send a question
5. Continue US2–US5 in this slice (product asked for full P1, not ask-only)

### Incremental Delivery

1. Setup + Foundational
2. US1 unified ask
3. US2 bio + message
4. US3 openers
5. US4 profile paste
6. US5 badge + dedicated non-regression
7. Polish / quickstart

### Notes

- Do **not** add LangGraph, tool loops, or a second chatbot nav item
- Do **not** classify in the browser
- Do **not** start simulation from `/agent`
- Constitution: reuse `handle()`; routing is not a free-form ungrounded advisor
- Mark tasks `[X]` in this file when done
