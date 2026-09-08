---
description: "Task list for Session Coaching Kit (P3)"
---

# Tasks: Session Coaching Kit (P3)

**Input**: `/specs/010-session-kit/`

**Tests**: Required (FR-012).

## Phase 1: Setup

- [X] T001 Add empty `backend/app/kit.py` module docstring pointing at `specs/010-session-kit/plan.md`

---

## Phase 2: Foundational

- [X] T002 Add `SessionKit` dataclass (bio/openers/message slots + `updated_at`) on `CoachingSession` in `backend/app/session_store.py`; `create()` starts empty
- [X] T003 Add `SessionKitResponse` and optional `CoachReply.kit_updated: list[str] | None` in `backend/app/models.py`
- [X] T004 Implement `apply_reply_to_kit(store, session_id, reply) -> list[str]` in `backend/app/kit.py` per data-model.md (no write if refused; skip step statuses; independent slots; last success wins)
- [X] T005 [P] Unit tests in `tests/unit/test_kit.py` for empty, bio write, openers write, message write, refuse no-op, skip no wipe of other slot

**Checkpoint**: Kit logic without HTTP

---

## Phase 3: User Story 1 - Bio Studio hydrates (Priority: P1) 🎯 MVP

### Tests

- [X] T006 [P] [US1] Contract GET `/v1/sessions/{id}/kit` empty; after stubbed rewrite via `/agent` or `/rewrite-bio`, GET has `improved_bio` in `tests/contract/test_session_kit.py`

### Implementation

- [X] T007 [US1] `GET /v1/sessions/{session_id}/kit` in `backend/app/api/router.py` (404 unknown session)
- [X] T008 [US1] Call `apply_reply_to_kit` after successful `_run` / `run_agent` replies in `backend/app/api/router.py` (and set `reply.kit_updated`)
- [X] T009 [US1] `api.getSessionKit` + types in `frontend/src/api/client.ts` and `frontend/src/api/types.ts`
- [X] T010 [US1] Hold `kit` + `refreshKit` in `frontend/src/context/SessionContext.tsx`; refresh after `createNewSession` and after coaching ops used by Ask Coach
- [X] T011 [US1] Hydrate `frontend/src/views/BioStudioView.tsx` from kit (`improved_bio` / analysis_points); banner “Đã điền từ phiên coach”; dedicated refine still updates kit
- [X] T012 [US1] Ask Coach shows Vietnamese kit-saved line when `kit_updated` includes `bio` in `frontend/src/views/AskCoachView.tsx` (no “đã đăng Tinder”)

**Checkpoint**: Chat rewrite → Bio Studio filled without clipboard

---

## Phase 4: User Story 2 - Openers hydrates (Priority: P2)

### Tests

- [X] T013 [P] [US2] Contract two-job agent fills `slots_filled` bio+openers in `tests/contract/test_session_kit.py`
- [X] T014 [US2] Dedicated `/openers` also writes kit (contract in `tests/contract/test_session_kit.py`)

### Implementation

- [X] T015 [US2] Hydrate `frontend/src/views/OpenersView.tsx` from `kit.openers`; banner; dedicated generate still works
- [X] T016 [US2] Ask Coach kit-saved copy includes Openers when `openers` in `kit_updated`

**Checkpoint**: SC-002 / SC-003

---

## Phase 5: User Story 3 - Message, new session, safety (Priority: P3)

### Tests

- [X] T017 [P] [US3] Contract: analyze-message fills `improved_message`; safety refuse leaves kit empty; new session empty in `tests/contract/test_session_kit.py`

### Implementation

- [X] T018 [US3] Hydrate `frontend/src/views/MessageView.tsx` from message slot + tone/clarity/risk; banner
- [X] T019 [US3] `resetSession` / new session clears React kit via GET empty; confirm DELETE drops store kit
- [X] T020 [US3] `apply_reply_to_kit` ignores refused replies even if model leaked a draft (unit already; wire through agent path)
- [X] T021 [US3] Ask Coach copy for message slot; never claim external send

**Checkpoint**: FR-005, FR-006, FR-012

---

## Phase 6: Polish

- [X] T022 [P] Note in `README.md` and `docs/PRODUCT_BRIEF.md`: sitting kit; tabs hydrate; no send outside the app
- [X] T023 Run `pytest tests/unit/test_kit.py tests/contract/test_session_kit.py tests/unit/test_agent_run.py tests/contract/test_agent.py tests/contract/test_rewrite_bio.py tests/contract/test_openers.py tests/contract/test_analyze_message.py -q`
- [X] T024 Walk `specs/010-session-kit/quickstart.md` or document unverified live UI
- [X] T025 Mark tasks `[X]` in this file

## Notes

- Do **not** revert P2 files on this branch; P3 builds on them
- Do **not** add localStorage as system of record
- Do **not** send to dating apps
- Dedicated endpoints must apply kit too
