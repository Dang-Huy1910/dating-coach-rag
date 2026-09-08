---
description: "Task list for Multi-Step Coach Agent (P2)"
---

# Tasks: Multi-Step Coach Agent (P2)

**Input**: Design documents from `/specs/009-multi-step-agent/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required (FR-014). Write failing tests before implementation in each story.

## Phase 1: Setup

- [X] T001 Confirm P1 package exists (`backend/app/agent/classify.py`, `run.py`) and document P2 loop in module docstrings pointing at `specs/009-multi-step-agent/plan.md`

---

## Phase 2: Foundational

**⚠️ BLOCKS user stories**

- [X] T002 Add `AgentStep` (`intent`, `status`, `label`) and optional `CoachReply.steps` in `backend/app/models.py`
- [X] T003 Add Vietnamese label helper (same mapping as P1 badge) in `backend/app/agent/labels.py` for server-filled `AgentStep.label`
- [X] T004 Extend `RoutingDecision` in `backend/app/agent/classify.py` with `intents: list[Intent]`; keep `intent` as `intents[0]` for P1 callers
- [X] T005 Implement `parse_classifier_json` to accept `intents[]` **or** legacy `intent`; allowlist; unique; cap 4; draft-job before openers; ask last; empty → `["ask"]`
- [X] T006 [P] Unit tests in `tests/unit/test_agent_classify.py` for legacy single intent, `intents[]`, cap, unique, invalid → ask, safety still skips complete()

**Checkpoint**: Classifier can return a plan; `/agent` still one-job until run.py changes

---

## Phase 3: User Story 1 - Two jobs in one message (Priority: P1) 🎯 MVP

**Goal**: Bio rewrite + openers (and analyze + next-message) in one `/agent` turn; later openers use `improved_draft`

**Independent Test**: Stub `intents=["rewrite_bio","openers"]` → reply has draft + ≥2 openers + two completed steps

### Tests

- [X] T007 [P] [US1] Contract two-job case in `tests/contract/test_agent.py`
- [X] T008 [P] [US1] Golden bio+openers and analyze+openers in `tests/golden/test_agent_golden.py`
- [X] T009 [P] [US1] Unit merge/pass-draft tests in `tests/unit/test_agent_run.py`

### Implementation

- [X] T010 [US1] Classifier prompt in `backend/app/agent/classify.py`: allow 1–4 jobs; two-job examples; still default single `ask` when unclear
- [X] T011 [US1] `run_agent()` in `backend/app/agent/run.py`: loop `handle()` per intent with extras; pass `improved_draft` into later openers/analyze; merge CoachReply per research.md Decision 4; fill `steps`
- [X] T012 [US1] Ensure `POST /v1/sessions/{id}/agent` in `backend/app/api/router.py` still returns the merged `CoachReply` (no new path)
- [X] T013 [US1] Frontend types `AgentStep` + `CoachReply.steps` in `frontend/src/api/types.ts`

**Checkpoint**: Two-job API works; UI types compile

---

## Phase 4: User Story 2 - Show steps; one-job P1 regression (Priority: P2)

**Goal**: Step chips on Ask Coach; single-job still P1; dedicated screens untouched

**Independent Test**: UI shows two labels for two-job; ask-only golden has no unsolicited draft/openers; `/rewrite-bio` contract still passes

### Tests

- [X] T014 [P] [US2] Golden single-ask regression in `tests/golden/test_agent_golden.py` (no extra draft/openers)
- [X] T015 [US2] Dedicated `tests/contract/test_rewrite_bio.py` and `tests/contract/test_openers.py` still pass

### Implementation

- [X] T016 [US2] Render ordered step chips from `reply.steps` in `frontend/src/views/AskCoachView.tsx` (reuse `intentLabel` / `RoutedIntentBadge`); fallback to single badge if `steps` empty
- [X] T017 [US2] Optional SSE `event: step` in `backend/app/api/router.py` before each job when `stream=true`; JSON remains default for Ask Coach
- [X] T018 [US2] Keep copy-ready draft + openers cards on the same turn in `frontend/src/views/AskCoachView.tsx` (already present — verify both show for two-job)

**Checkpoint**: Reviewer can name jobs without logs (SC-005)

---

## Phase 5: User Story 3 - Safety, missing draft, cap (Priority: P3)

**Goal**: Refuse whole turn on safety; skip dependent jobs on needs_draft; cap 4; no simulation

### Tests

- [X] T019 [P] [US3] Contract/golden: multi-job scrape/match refuse, empty citations, no improved_draft in `tests/contract/test_agent.py` and `tests/golden/test_agent_golden.py`
- [X] T020 [P] [US3] Unit: needs_draft skips rewrite+dependent openers; over-cap truncated; no handle() on safety in `tests/unit/test_agent_run.py` and `tests/unit/test_agent_classify.py`

### Implementation

- [X] T021 [US3] needs_draft handling in `backend/app/agent/run.py`: skip specialized job + dependent later jobs; ask-to-paste Vietnamese; `status=skipped_needs_draft`
- [X] T022 [US3] Keep safety short-circuit **before** the loop in `run_agent()` / `classify_message()`; never start simulation
- [X] T023 [US3] Cap + “remainder is a follow-up” sentence in merged reply when classifier returned more than 4 before normalize (if the model listed extras, mention follow-up once)

**Checkpoint**: Unsafe or empty two-job messages cannot invent deliverables

---

## Phase 6: Polish

- [X] T024 [P] Short P2 note in `README.md` and `docs/PRODUCT_BRIEF.md` (one message, up to four jobs; still copy-ready; P1 one-job still works)
- [X] T025 Run `pytest tests/unit/test_agent_classify.py tests/unit/test_agent_run.py tests/contract/test_agent.py tests/golden/test_agent_golden.py tests/contract/test_ask.py tests/contract/test_rewrite_bio.py tests/contract/test_openers.py tests/contract/test_analyze_message.py tests/contract/test_profile_context.py -q` and fix failures
- [X] T026 Walk `specs/009-multi-step-agent/quickstart.md` or document what could not be live-verified
- [X] T027 Mark tasks `[X]` in this file as they land

---

## Dependencies

- Setup → Foundational → US1 → US2 / US3 (US3 can start after T011)
- Solo: T001 → T027 sequential
- Same-file choke points: `classify.py`, `run.py`, `test_agent.py`, `AskCoachView.tsx`

## MVP

US1 (two-job API) is the demo bar. Still complete US2–US3 in this slice.

## Notes

- Do **not** add LangGraph or a second chatbot
- Do **not** classify/plan in the browser
- Do **not** send messages to dating apps
- Reuse `handle()` for every job
