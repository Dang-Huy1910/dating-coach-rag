---
description: "Task list for Dating Coach RAG MVP coaching chat"
---

# Tasks: Dating Coach RAG (MVP Coaching Chat)

**Input**: Design documents from `/specs/001-dating-coach-rag/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — spec FR-016 / SC-007 require golden cases (cited answer, refuse-when-unknown, bio rewrite, message rewrite).

**Organization**: Setup → Foundational → US1–US4 → Polish. Paths follow plan.md (`backend/app/`, `frontend/app.py`, `data/knowledge/`, `tests/`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 map to spec user stories
- Each task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Installable Python repo matching plan.md layout

- [X] T001 Create package directories and `__init__.py` files for `backend/app/`, `backend/app/api/`, `backend/app/rag/`, `frontend/`, `data/knowledge/`, `data/index/`, `tests/contract/`, `tests/integration/`, `tests/golden/`, `tests/unit/`
- [X] T002 Initialize root `pyproject.toml` with Python 3.12, package `backend`, dependencies (fastapi, uvicorn, pydantic-settings, sse-starlette, sentence-transformers, faiss-cpu, groq, python-dotenv, streamlit, httpx) and `[project.optional-dependencies] dev` (pytest, pytest-asyncio, ruff)
- [X] T003 [P] Add `.env.example` with `GROQ_API_KEY`, `GROQ_MODEL`, `LLM_PROVIDER`, `GEMINI_API_KEY`, `RETRIEVE_MIN_SCORE=0.35`, `RETRIEVE_TOP_K=4`
- [X] T004 [P] Add `.gitignore` entries for `.venv/`, `.env`, `__pycache__/`, `data/index/*.faiss`, `data/index/*.bin`, `.pytest_cache/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Config, schemas, session memory, safety, RAG ingest/retrieve, health/session routes, starter corpus. Blocks all user stories.

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T005 [P] Write starter guides `data/knowledge/01-profile-bio.md`, `data/knowledge/02-openers.md`, `data/knowledge/03-pacing.md`, `data/knowledge/04-boundaries.md`, `data/knowledge/05-red-flags.md` (original notes; bio, openers, pacing, non-clinical boundaries, informational red flags)
- [X] T006 [P] Implement settings in `backend/app/config.py` (env load, retrieve threshold, model names, knowledge/index paths)
- [X] T007 [P] Implement Pydantic schemas in `backend/app/models.py` matching `specs/001-dating-coach-rag/contracts/openapi.yaml` (`SessionResponse`, `AskRequest`, `DraftRequest`, `OpenersRequest`, `CoachReply`, `Citation`, `ErrorResponse`)
- [X] T008 Implement ephemeral `SessionStore` in `backend/app/session_store.py` (UUID create/get/delete, max 50 turns, no disk writes of message text)
- [X] T009 Implement `SafetyVerdict` screening in `backend/app/safety.py` (matchmaking, nsfw_companion, deepfake, therapy, coercion, scrape) with Vietnamese refusal strings
- [X] T010 Implement coach system/user prompt templates in `backend/app/prompts.py` (cite sources, refuse unsupported claims, not a clinician/partner/matchmaker)
- [X] T011 Implement Markdown heading chunking in `backend/app/rag/chunk.py` (target 400–800 characters, 80-character overlap)
- [X] T012 Implement MiniLM embedder in `backend/app/rag/embed.py` (L2-normalized 384-d vectors)
- [X] T013 Implement FAISS IndexFlatIP load/save in `backend/app/rag/index.py` plus sidecar `data/index/meta.json`
- [X] T014 Implement retrieval in `backend/app/rag/retrieve.py` (`top_k`, min score 0.35, empty list on miss)
- [X] T015 Implement ingest CLI/library in `backend/app/rag/ingest.py` reading `data/knowledge/*.md` and writing `data/index/`
- [X] T016 Implement `GET /health`, `GET /v1/disclaimer`, `POST/GET/DELETE /v1/sessions` in `backend/app/api/router.py`
- [X] T017 Wire FastAPI app in `backend/app/main.py` (router include, CORS for local Streamlit, index_ready on health)
- [X] T018 [P] Unit tests for safety categories in `tests/unit/test_safety.py`
- [X] T019 [P] Unit tests for retrieve score gate in `tests/unit/test_retrieve.py`

**Checkpoint**: Health + session create work; ingest builds an index; safety unit tests pass. No coaching generate yet.

---

## Phase 3: User Story 1 - Ask a grounded coaching question (Priority: P1) 🎯 MVP

**Goal**: User asks a dating-communication question and gets a cited reply, or a refuse/hedge when knowledge is missing. Disclaimer visible.

**Independent Test**: `POST /v1/sessions` then `POST /v1/sessions/{id}/ask` for a covered topic (citations) and an uncovered topic (refuse/hedge). Streamlit can complete the same sitting.

### Tests for User Story 1

- [X] T020 [P] [US1] Contract tests for create session + ask JSON shape in `tests/contract/test_ask.py`
- [X] T021 [P] [US1] Golden cases (mocked LLM) cited answer + refuse-when-unknown in `tests/golden/test_ask_golden.py`

### Implementation for User Story 1

- [X] T022 [US1] Implement retrieve → prompt → Groq generate orchestration in `backend/app/coach.py` (`intent=ask`, populate `citations`/`refused`/`hedged`/`disclaimer`)
- [X] T023 [US1] Implement `POST /v1/sessions/{session_id}/ask` JSON in `backend/app/api/router.py` (400 empty/too long, 404 unknown session, safety short-circuit)
- [X] T024 [US1] Add optional SSE when `stream=true` on ask in `backend/app/api/router.py` (events: token, citation, done, refusal)
- [X] T025 [US1] Build Streamlit thin client in `frontend/app.py`: create session, show disclaimer, chat ask, render reply + citations (HTTP to API only)
- [X] T026 [US1] Add follow-up context from in-memory turns when calling the LLM in `backend/app/coach.py`

**Checkpoint**: US1 demoable via curl and Streamlit. Golden cite + unknown pass with mocks.

---

## Phase 4: User Story 2 - Rewrite a profile / bio draft (Priority: P2)

**Goal**: Paste a bio; get concrete suggestions plus `improved_draft`. Empty draft → 400, no invented person.

**Independent Test**: `POST /v1/sessions/{id}/rewrite-bio` with a weak bio; copy-ready improved text; citations or hedge.

### Tests for User Story 2

- [X] T027 [P] [US2] Contract tests for rewrite-bio in `tests/contract/test_rewrite_bio.py`
- [X] T028 [P] [US2] Golden bio rewrite (mocked LLM) in `tests/golden/test_bio_golden.py`

### Implementation for User Story 2

- [X] T029 [US2] Add `rewrite_bio` path in `backend/app/coach.py` (retrieve bio chunks; craft-only hedge if weak; never invent studies)
- [X] T030 [US2] Implement `POST /v1/sessions/{session_id}/rewrite-bio` in `backend/app/api/router.py`
- [X] T031 [US2] Add bio-help mode (paste draft, show `improved_draft`) in `frontend/app.py`

**Checkpoint**: US1 still works; bio flow independently testable.

---

## Phase 5: User Story 3 - Analyze and rewrite a message draft (Priority: P3)

**Goal**: Paste a message; get tone, clarity, interpersonal-risk notes and a revised version. Coercive asks refused.

**Independent Test**: `POST /v1/sessions/{id}/analyze-message` with a pushy draft; feedback + revision; coercion prompt refused.

### Tests for User Story 3

- [X] T032 [P] [US3] Contract tests for analyze-message in `tests/contract/test_analyze_message.py`
- [X] T033 [P] [US3] Golden message rewrite + coercion refusal in `tests/golden/test_message_golden.py`

### Implementation for User Story 3

- [X] T034 [US3] Add `analyze_message` path in `backend/app/coach.py` (tone/clarity/risk; `improved_draft`)
- [X] T035 [US3] Implement `POST /v1/sessions/{session_id}/analyze-message` in `backend/app/api/router.py`
- [X] T036 [US3] Add message-analysis mode in `frontend/app.py`

**Checkpoint**: US1–US3 independently testable. Three of four golden cases exist.

---

## Phase 6: User Story 4 - Suggest first-message openers (Priority: P4)

**Goal**: Context in → at least two opener options. Matchmaking real people refused; generic opener advice may remain.

**Independent Test**: `POST /v1/sessions/{id}/openers` with “dating app, shared hiking”; two options. Match request refused.

### Tests for User Story 4

- [X] T037 [P] [US4] Contract tests for openers in `tests/contract/test_openers.py`
- [X] T038 [P] [US4] Golden openers + matchmaking refusal in `tests/golden/test_openers_golden.py`

### Implementation for User Story 4

- [X] T039 [US4] Add `openers` path in `backend/app/coach.py` (`openers` array, min two when allowed)
- [X] T040 [US4] Implement `POST /v1/sessions/{session_id}/openers` in `backend/app/api/router.py`
- [X] T041 [US4] Add opener mode in `frontend/app.py`

**Checkpoint**: All four stories independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, live-path notes, quickstart validation

- [X] T042 [P] Align `README.md` with shipped v1 commands (ingest, uvicorn, streamlit, pytest) without expanding scope
- [X] T043 [P] Add `tests/integration/test_health_session.py` for health + session create without LLM
- [X] T044 [P] Unit tests for chunker in `tests/unit/test_chunk.py`
- [X] T045 Run `specs/001-dating-coach-rag/quickstart.md` smoke (ingest, health `index_ready`, one ask) and fix gaps
- [X] T046 Vietnamese UX pass on refusal/disclaimer strings in `backend/app/safety.py`, `backend/app/prompts.py`, and `frontend/app.py`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: After Setup — BLOCKS all stories
- **US1 (Phase 3)**: After Foundational — MVP
- **US2–US4**: After Foundational; sequentially P2→P3→P4 for one person (share `coach.py` / `router.py` / `frontend/app.py`)
- **Polish**: After desired stories (after US3 for MVP bar; US4 optional)

### User Story Dependencies

- **US1 (P1)**: After Phase 2 only
- **US2 (P2)**: After Phase 2; reuses session + retrieve + `coach.py`
- **US3 (P3)**: After Phase 2; same
- **US4 (P4)**: After Phase 2; may trail MVP demo

Same-file note: T023/T024/T030/T035/T040 all edit `backend/app/api/router.py` — do not parallelize those. T022/T026/T029/T034/T039 edit `backend/app/coach.py` sequentially. T025/T031/T036/T041 edit `frontend/app.py` sequentially.

### Parallel Opportunities

- T003/T004 after T001
- T005, T006, T007 in parallel
- T018/T019 after T009/T014
- Contract + golden tests for a story in parallel before that story’s implementation
- T042, T043, T044 in parallel during polish

### Parallel Example: User Story 1

```bash
# After Phase 2, in parallel:
Task: "Contract tests in tests/contract/test_ask.py"
Task: "Golden cases in tests/golden/test_ask_golden.py"
# Then sequential: coach.py → ask route → SSE → frontend
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. **STOP**: curl + Streamlit + golden cite/unknown
5. Demo if needed

### Incremental Delivery

1. Setup + Foundational
2. US1 → demo grounded Q&A (MVP slice)
3. US2 bio → US3 message (spec success bar)
4. US4 openers
5. Polish + quickstart

### Parallel Team Strategy

Solo project: run sequentially P1→P2→P3→P4. Do not split `router.py` / `coach.py` across parallel agents.

---

## Notes

- [P] only when files differ and no incomplete dependency
- Golden tests mock Groq unless `RUN_LIVE_LLM=1`
- Streamlit must never call Groq/FAISS directly
- Commit after each phase checkpoint
- Suggested MVP scope: Phases 1–3 (US1). Spec success bar: US1–US3.

---

## Phase 8: Convergence

**Purpose**: Close gaps found by `/speckit-converge` against spec, plan, and constitution.

- [X] T047 Do not attach knowledge citations on safety refusals (including matchmaking+openers) in `backend/app/coach.py` per spec Edge Cases (contradicts)
- [X] T048 Record the session turn on every coach path including safety refusals in `backend/app/coach.py` per US1/AC3 (partial)
- [X] T049 Fall back to hash embedder in `backend/app/rag/embed.py` when MiniLM extra is missing so default ingest works per plan: ingest CLI (partial)

---

## Phase 9: React thin client (Antigravity)

**Purpose**: Replace Streamlit stopgap with a Vite + React UI that only calls the FastAPI contract. Design source: `docs/STITCH_PROMPT.md`. Implement notes: `docs/ANTIGRAVITY_FE.md`.

- [ ] T050 Scaffold Vite + React in `frontend/` (or `frontend/web/`) with env `VITE_API_BASE=http://127.0.0.1:8000` per plan: React UI
- [ ] T051 [P] Implement session + disclaimer + four intents (ask, rewrite-bio, analyze-message, openers) against `specs/001-dating-coach-rag/contracts/openapi.yaml` per FR-001–FR-008
- [ ] T052 [P] Render citations, copy-ready `improved_draft` / `openers`, and refusal states with empty citations per FR-004, FR-009, Edge Cases
- [ ] T053 Vietnamese UX copy, always-visible disclaimer, no direct LLM/FAISS from the browser per Constitution III–IV, FR-011, FR-013
- [ ] T054 Remove or archive Streamlit `frontend/app.py` once React covers US1–US4 demo sitting per SC-007

