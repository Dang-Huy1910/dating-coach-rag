---
description: "Task list for Public Profile Context Coaching"
---

# Tasks: Public Profile Context Coaching

**Input**: Design documents from `/specs/003-public-profile-context/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — plan/research require contract + unit `profile_gate` + golden 100% bars for SC-002–005 (mocked LLM). Live LLM stays opt-in (`RUN_LIVE_LLM=1`).

**Organization**: Setup → Foundational → US1–US3 → Polish. Paths follow plan.md (`backend/app/`, `frontend/src/`, `data/knowledge/`, `tests/`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 map to spec user stories
- Each task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Additive slice on the existing FastAPI + React repo. No new social-fetch stack.

- [X] T001 Confirm existing layout in `backend/app/`, `frontend/src/`, `tests/` matches plan.md; do **not** add Instagram SDK, instaloader, Graph API, Playwright, or OAuth to `pyproject.toml` or `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared DTO, safety patterns, deterministic profile gate, prompt rules, and the builder-written knowledge guide. Blocks all user stories.

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T002 [P] Write original coaching guide `data/knowledge/07-public-profile-context.md` (using already-visible public bio/captions as conversation context; public vs private boundary; anti-stalking hygiene). **Not** scraped Instagram posts
- [X] T003 [P] Add `ProfileContextRequest` (`handle` ≤128, `profile_url` ≤500, `visible_text` default `""` ≤8000, `privacy` enum `public|private|unknown` default `unknown`, `question` ≤2000), extend `Intent` with `profile_context`, and add ErrorResponse codes `empty_input` | `too_long` | `need_visible_text` in `backend/app/models.py`
- [X] T004 [P] Expand scrape + matchmaking patterns in `backend/app/safety.py` (Instagram/IG/Insta crawl/fetch/download; Vietnamese `cào`/`tải`/`kéo profile`; “người này có thích mình không”; match % / tỉ lệ hợp / ranking a named person) while keeping existing categories
- [X] T005 Implement `classify(request)` in `backend/app/profile_gate.py` returning `ProfileGateVerdict` (`ok` | `need_visible_text` | `private_out_of_scope` | `blocked_safety`) with order: `safety.screen` on concatenated text → private (`privacy=private` or phrases like “tài khoản riêng tư” / “mình không xem được”) → empty/whitespace `visible_text` → `ok`. Vietnamese `user_message`. Handle/URL are labels only — **no** outbound HTTP
- [X] T006 [P] Add `profile_context` prompt extra in `backend/app/prompts.py`: do not invent posts, follower counts, photos, or “studies about this person”; do not claim a live profile load; citations from the curated library only; when allowed, include at least one opener or next-message suggestion; reply in the language of the latest user message
- [X] T007 [P] Add Instagram/IG scrape and named-person matchmaking cases in `tests/unit/test_safety.py` (existing Tinder scrape + generic matchmaking tests must still pass)
- [X] T008 Add unit tests for all gate codes (ok, need_visible_text, private_out_of_scope, blocked_safety) in `tests/unit/test_profile_gate.py`; assert classify never fetches `profile_url`

**Checkpoint**: Gate unit tests pass; safety expansions pass; knowledge file exists. No HTTP route yet.

---

## Phase 3: User Story 1 - Coach from a public profile the user can already see (Priority: P1) 🎯 MVP

**Goal**: Paste optional handle/link plus public-visible bio/caption text; receive communication coaching (tone/approach and an opener/next-message when the library supports it) with library citations or a hedge. Handle/URL-only asks for paste (400). Matchmaking of a real person is refused. No Instagram login.

**Independent Test**: `POST /v1/sessions` then `POST /v1/sessions/{id}/profile-context` with a public paste → `intent=profile_context`, `refused=false`, citations under `data/knowledge/`, at least one opener or next-message. Handle-only → 400 `need_visible_text`. Named person + “ghép đôi / % hợp” → 200 `refused`. React profile mode completes the sitting without an Instagram login control.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Contract tests for `POST /v1/sessions/{id}/profile-context` in `tests/contract/test_profile_context.py` (happy JSON `CoachReply` with `intent=profile_context`; handle/URL only + empty `visible_text` → 400 `code=need_visible_text`; unknown session → 404)
- [X] T010 [P] [US1] Golden cases (mocked LLM) in `tests/golden/test_profile_context_golden.py`: (1) public paste + question → not refused, citations `path` under `data/knowledge/` never an Instagram URL, ≥1 opener or next-message; (2) named person + bio + “ghép đôi / % hợp / người này có thích mình không” → 200 `refused=true`, empty citations

### Implementation for User Story 1

- [X] T011 [US1] Extend `handle()` in `backend/app/coach.py` for `intent=profile_context`: run `profile_gate.classify` before retrieve; compose ephemeral `Turn.role_user_text` snapshot (handle/url/privacy/question/visible); retrieve on `visible_text` + optional `question` (paste is prompt context, not a FAISS source); `blocked_safety` uses existing `_refusal_reply` (empty citations); never cite an Instagram URL
- [X] T012 [US1] Implement `POST /v1/sessions/{session_id}/profile-context` in `backend/app/api/router.py` matching `specs/003-public-profile-context/contracts/openapi.yaml` (JSON only, no SSE): 400 `need_visible_text` / `empty_input` / `too_long` with `detail` + `code`; 404 unknown session; 200 `CoachReply` when the gate allows or refuses (private/safety). Do not `httpx`/`requests` the handle or URL
- [X] T013 [P] [US1] Add `ProfileContextRequest`, extend `Intent` with `profile_context`, and allow ErrorResponse code `need_visible_text` in `frontend/src/api/types.ts`
- [X] T014 [US1] Add `coachFromProfileContext(sessionId, body)` calling `POST /v1/sessions/{id}/profile-context` in `frontend/src/api/client.ts`
- [X] T015 [US1] Create thin HTTP-only form `frontend/src/views/ProfileContextView.tsx` (optional handle, optional public URL, required paste textarea, privacy `public|private|unknown`, optional question). Reuse `DisclaimerBar` (already in Header), `CoachBubble`, `CopyReadyCard` / opener chips. **No** “Đăng nhập Instagram” control. Handle-only 400 shows paste-needed copy
- [X] T016 [P] [US1] Add `AppMode` value `profile` and Vietnamese nav label in `frontend/src/components/Header.tsx`
- [X] T017 [US1] Route `profile` mode to `ProfileContextView` in `frontend/src/App.tsx`
- [X] T018 [US1] Add a welcome entry card that opens profile mode (no Instagram login CTA) in `frontend/src/views/WelcomeView.tsx`

**Checkpoint**: US1 demoable via curl and React. Golden happy-path + handle-only 400 + matchmaking refusal pass with mocks.

---

## Phase 4: User Story 2 - Clear handling when the profile is private or empty (Priority: P2)

**Goal**: Private/locked accounts are out of scope — 200 refused cannot-fetch copy, no invented posts. Empty/whitespace asks for usable text. Same session stays usable for a later paste of chat text.

**Independent Test**: Submit `privacy=private` (with or without handle) → 200 `refused=true`, Vietnamese cannot-fetch copy, empty citations, no invented bio/posts. Then paste visible text in the same session and coaching still works. Empty body → 400 `empty_input`.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US2] Golden private sitting in `tests/golden/test_profile_context_golden.py`: `privacy=private` or “tài khoản riêng tư, tải dùm” / “mình không xem được” → 200 `refused=true`, cannot-fetch copy, empty citations, no invented posts; session `turn_count` increments and a later public paste on the same session is still accepted
- [X] T020 [P] [US2] Contract cases in `tests/contract/test_profile_context.py`: completely empty body → 400 `empty_input`; whitespace-only `visible_text` without handle/url → 400 `empty_input`; oversize `visible_text` → 400 `too_long`

### Implementation for User Story 2

- [X] T021 [US2] Map `private_out_of_scope` to HTTP **200** `CoachReply` (`refused=true`, empty citations, Vietnamese cannot-fetch copy) — not 400 — in `backend/app/api/router.py` and `backend/app/profile_gate.py` so the sitting stays usable
- [X] T022 [US2] Show private cannot-fetch in `CoachBubble` on `frontend/src/views/ProfileContextView.tsx`; keep the form enabled so the user can paste chat text afterward; empty/whitespace client-side copy asks for usable public-visible text

**Checkpoint**: US1 still works. Private and empty paths independently testable.

---

## Phase 5: User Story 3 - Stay a coach: no scrape, no archive of the other person (Priority: P3)

**Goal**: Scrape/crawl/auto-download of Instagram or dating apps is refused. No durable crush dossier. No Instagram account inside this product.

**Independent Test**: Ask to scrape/crawl/download an Instagram profile → 200 `refused`, empty citations, no downloaded posts. After a successful P1 sitting, reset/new session does not offer a saved “hồ sơ crush”. Code review: no social HTTP client.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T023 [P] [US3] Golden scrape sitting in `tests/golden/test_profile_context_golden.py`: “Cào / scrape / crawl / tải Instagram (or Tinder) profile này” → 200 `refused=true`, empty citations, reply does not contain downloaded posts

### Implementation for User Story 3

- [X] T024 [US3] Ensure scrape/matchmaking `blocked_safety` short-circuits via `_refusal_reply` (empty citations, no retrieve-for-advice) in `backend/app/coach.py` when `profile_gate` returns `blocked_safety`
- [X] T025 [US3] UI must not offer a saved crush dossier after Header reset / `DELETE` session: no “hồ sơ crush đã lưu” in `frontend/src/views/ProfileContextView.tsx`, `frontend/src/components/Header.tsx`, or `frontend/src/context/SessionContext.tsx`; still no Instagram login control
- [X] T026 [US3] Confirm handle/`profile_url` are labels only — no outbound fetch of social hosts from `backend/app/profile_gate.py`, `backend/app/api/router.py`, or `frontend/src/api/client.ts`

**Checkpoint**: All three stories independently testable. SC-001–005 locked by tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, Vietnamese UX, quickstart, and regression on existing coaching paths

- [X] T027 [P] Align `README.md` with the new paste-only `POST /v1/sessions/{id}/profile-context` path, ingest of `07-public-profile-context.md`, and explicit non-goals (no Instagram login, no scrape)
- [X] T028 [P] Update `docs/PRODUCT_BRIEF.md` so public-paste profile context is in scope as coaching (not a social graph or matchmaker)
- [X] T029 Vietnamese UX pass on refusal/gate/empty copy in `backend/app/profile_gate.py`, `backend/app/safety.py`, and `frontend/src/views/ProfileContextView.tsx` (FR-010)
- [X] T030 Re-run ingest (`DATING_COACH_EMBEDDER=hash python -m backend.app.rag.ingest`) and validate `specs/003-public-profile-context/quickstart.md` (pytest subset + curl happy / handle-only / private)
- [X] T031 Run existing `tests/contract/` and `tests/golden/` for ask/bio/message/openers and fix regressions — those four paths must stay unchanged

---

## Phase 7: Screenshots in the same 003 sitting

**Purpose**: Optional user-supplied post/story screenshots on the same profile-context path (not a new feature). Still no fetch.

- [X] T032 Add `ProfileImage` + `images` on `ProfileContextRequest` in `backend/app/models.py`; screenshots count as visible context in `backend/app/profile_gate.py`
- [X] T033 [P] Contract tests for screenshot-only / too-many / invalid mime in `tests/contract/test_profile_context.py`
- [X] T034 Pass screenshots into LLM (Gemini inline / Groq image_url, Gemini fallback) in `backend/app/coach.py` without persisting bytes on `Turn`
- [X] T035 Upload + preview (max 3, JPEG/PNG/WebP, 2MB) on `frontend/src/views/ProfileContextView.tsx` and `frontend/src/api/types.ts`
- [X] T036 Update `specs/003-public-profile-context/spec.md`, `data-model.md`, and `contracts/openapi.yaml` for FR-012/013

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: After Setup — BLOCKS all stories
- **US1 (Phase 3)**: After Foundational — MVP
- **US2–US3**: After Foundational; sequentially P2 → P3 for one person (shared `router.py` / `coach.py` / `ProfileContextView.tsx`)
- **Polish**: After desired stories (after US1 for a demoable MVP; after US3 for the full safety bar)

### User Story Dependencies

- **US1 (P1)**: After Phase 2 only
- **US2 (P2)**: After Phase 2; reuses the same endpoint + gate; independently testable via private/empty fixtures
- **US3 (P3)**: After Phase 2; scrape refusal + no-dossier UX; independently testable even if P1 already coaches

Same-file note: T012 / T021 edit `backend/app/api/router.py` — do not parallelize. T011 / T024 edit `backend/app/coach.py` sequentially. T009 / T020 share `tests/contract/test_profile_context.py`. T010 / T019 / T023 share `tests/golden/test_profile_context_golden.py`. T015 / T022 / T025 share `frontend/src/views/ProfileContextView.tsx`. T016 / T025 share `frontend/src/components/Header.tsx`. T004 / T007 then T029 touch `backend/app/safety.py`. T005 / T008 / T021 / T026 / T029 touch `backend/app/profile_gate.py`.

### Parallel Opportunities

- T002, T003, T004, T006 after T001
- T007 after T004 (parallel with T005/T006)
- T008 after T005
- T009 + T010 in parallel after Phase 2 (must fail before T011)
- T013 + T016 in parallel with backend T011/T012
- T019 + T020 in parallel after US1 checkpoint
- T027 + T028 in parallel during polish

### Parallel Example: User Story 1

```bash
# After Phase 2, in parallel (tests must fail first):
Task: "Contract tests in tests/contract/test_profile_context.py"
Task: "Golden cases in tests/golden/test_profile_context_golden.py"
Task: "Intent + ProfileContextRequest in frontend/src/api/types.ts"
Task: "AppMode profile in frontend/src/components/Header.tsx"

# Then sequential backend:
Task: "coach.py handle profile_context"
Task: "POST .../profile-context in backend/app/api/router.py"

# Then sequential UI:
Task: "coachFromProfileContext in frontend/src/api/client.ts"
Task: "ProfileContextView.tsx"
Task: "App.tsx route + WelcomeView.tsx entry card"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational (CRITICAL — blocks all stories)
3. Phase 3 US1
4. **STOP and VALIDATE**: pytest US1 contract + golden; curl happy path + handle-only 400; React profile mode with disclaimer and no Instagram login
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → gate + models + knowledge ready
2. US1 → public-paste coaching MVP
3. US2 → private/empty honesty
4. US3 → scrape refusal + no dossier
5. Polish → docs + quickstart + regression

### Parallel Team Strategy

With multiple developers (optional; this repo is solo YAGNI):

1. Together: Setup + Foundational
2. Then: A on US1 backend, B on US1 UI types/Header (merge before ProfileContextView)
3. US2/US3 after US1 to avoid `router.py` / view conflicts

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to spec US1–US3
- Verify story tests fail before implementing that story
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Pasted Instagram text is **never** a FAISS source and **never** a `Citation.path`
- Existing ask / rewrite-bio / analyze-message / openers paths stay unchanged
